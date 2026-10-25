import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The client reads process.env.NEXT_PUBLIC_* (the Vercel convention). Vite has no
// process.env in the browser, so the values are inlined at build time here.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'NEXT_PUBLIC_'), ...pick(process.env) };
  return {
    plugins: [react()],
    define: {
      'process.env.NEXT_PUBLIC_API_MODE': JSON.stringify(env.NEXT_PUBLIC_API_MODE ?? 'mock'),
      'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'),
    },
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:8080' },
    },
  };
});

function pick(source: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(([k, v]) => k.startsWith('NEXT_PUBLIC_') && v !== undefined),
  ) as Record<string, string>;
}
