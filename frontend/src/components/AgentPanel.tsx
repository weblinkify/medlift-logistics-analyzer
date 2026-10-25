import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AgentRecommendation, InsightSeverity } from '../ai';
import { Badge, Card } from './ui';

const SEVERITY: Record<InsightSeverity, { icon: typeof Info; className: string; label: string }> = {
  CRITICAL: { icon: AlertOctagon, className: 'text-rose-600 bg-rose-50', label: 'Critical' },
  WARNING: { icon: AlertTriangle, className: 'text-amber-600 bg-amber-50', label: 'Warning' },
  INFO: { icon: Info, className: 'text-sky-600 bg-sky-50', label: 'Info' },
  SUCCESS: { icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50', label: 'Good' },
};

export function AgentPanel({ rec, loading, error }: { rec: AgentRecommendation | null; loading: boolean; error: string | null }) {
  const typed = useTypewriter(loading ? '' : rec?.summary ?? '');

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" aria-hidden /> AI Route Optimization Agent
        </span>
      }
      subtitle="Checks airspace, weather, cold chain and traffic, then explains the call in plain language"
    >
      {loading && (
        <div className="space-y-3" aria-live="polite">
          <p className="text-xs text-slate-500">Checking airspace restrictions, weather and cold-chain limits…</p>
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      )}

      {!loading && error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && !rec && <p className="text-sm text-slate-500">The agent's advice appears here after each analysis.</p>}

      {!loading && rec && (
        <div className="space-y-4">
          <p className="min-h-[3rem] text-sm leading-relaxed text-slate-800" aria-live="polite">
            {typed}
            {typed.length < rec.summary.length && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-violet-500 align-middle" />}
          </p>

          <ul className="space-y-2">
            {rec.insights.map((ins, i) => {
              const s = SEVERITY[ins.severity];
              const Icon = s.icon;
              return (
                <li key={i} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${s.className}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {ins.title} <span className="ml-1 font-normal text-slate-400">· {s.label}</span>
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{ins.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-slate-500">Confidence</span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${Math.round(rec.confidence * 100)}%` }} />
            </div>
            <span className="tabular text-[11px] font-medium text-slate-700">{Math.round(rec.confidence * 100)}%</span>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <Badge tone="violet">{rec.provider}</Badge>
            <span className="font-mono">{rec.model}</span>
            <span>· {rec.latencyMs} ms</span>
          </p>
        </div>
      )}
    </Card>
  );
}

function useTypewriter(text: string, cps = 90) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      return;
    }
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 2)), 1000 / (cps / 2));
    return () => clearInterval(id);
  }, [text, cps]);
  return text.slice(0, n);
}
