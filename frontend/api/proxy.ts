// Vercel serverless mapping layer: /api/v1/* → Spring Boot API.
//
// vercel.json rewrites /api/v1/:path* to /api/proxy?path=:path*. Set BACKEND_URL in the
// Vercel project (e.g. https://medlift-api.example.com) and NEXT_PUBLIC_API_MODE=live to use it.
// In the default mock mode the frontend never calls this function.

interface Req {
  method?: string;
  query: Record<string, string | string[]>;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  send(body: string): void;
  json(body: unknown): void;
}

const ALLOWED = /^(facilities|restricted-zones|network\/summary|analyses(\/[0-9a-f-]{36})?|agent\/recommendations)$/;

export default async function handler(req: Req, res: Res) {
  const backend = process.env.BACKEND_URL;
  if (!backend) {
    res.status(503).json({
      title: 'Backend not configured',
      detail: 'Set BACKEND_URL in the Vercel project, or deploy with NEXT_PUBLIC_API_MODE=mock.',
    });
    return;
  }

  const { path, ...rest } = req.query;
  const route = Array.isArray(path) ? path.join('/') : path ?? '';
  if (!ALLOWED.test(route)) {
    res.status(404).json({ title: 'Not found', detail: `Unknown API route: ${route}` });
    return;
  }

  const qs = new URLSearchParams(
    Object.entries(rest).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]])),
  ).toString();
  const url = `${backend.replace(/\/$/, '')}/api/v1/${route}${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(25_000),
    });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(await upstream.text());
  } catch (e) {
    res.status(502).json({ title: 'Bad gateway', detail: e instanceof Error ? e.message : 'Upstream unreachable' });
  }
}
