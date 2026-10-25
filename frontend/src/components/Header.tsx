import { Activity, Database, FlaskConical, Sparkles } from 'lucide-react';
import { Badge } from './ui';

export function Header({ mode, agentProvider }: { mode: 'mock' | 'live'; agentProvider: string }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Activity className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-slate-900">MedLift Logistics Analyzer</h1>
            <p className="text-xs text-slate-500">Hospital drone vs. courier decision intelligence</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'mock' ? (
            <Badge tone="amber">
              <FlaskConical className="h-3 w-3" aria-hidden /> Demo mode · in-browser simulation
            </Badge>
          ) : (
            <Badge tone="green">
              <Database className="h-3 w-3" aria-hidden /> Live API · PostgreSQL
            </Badge>
          )}
          <Badge tone="violet">
            <Sparkles className="h-3 w-3" aria-hidden /> AI agent: {agentProvider === 'mock' ? 'mock LLM' : 'server-routed LLM'}
          </Badge>
        </div>
      </div>
    </header>
  );
}
