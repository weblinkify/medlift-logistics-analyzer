import { useCallback, useEffect, useRef, useState } from 'react';
import { routeAgent, type AgentRecommendation } from './ai';
import { AgentPanel } from './components/AgentPanel';
import { ComparisonPanel } from './components/ComparisonPanel';
import { Header } from './components/Header';
import { HistoryList } from './components/HistoryList';
import { KpiStrip } from './components/KpiStrip';
import { NetworkMap } from './components/NetworkMap';
import { RoutePlanner, SCENARIOS } from './components/RoutePlanner';
import { RoutesTable } from './components/RoutesTable';
import type { AnalysisRequest, AnalysisResult, Facility, NetworkSummary, RestrictedZone } from './domain/types';
import { logisticsService } from './services';

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [request, setRequest] = useState<AnalysisRequest>(SCENARIOS[0].request);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rec, setRec] = useState<AgentRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const runId = useRef(0);

  const advise = useCallback(async (result: AnalysisResult, id: number) => {
    setRecLoading(true);
    setAgentError(null);
    try {
      const r = await routeAgent.recommend(result);
      if (id === runId.current) setRec(r);
    } catch (e) {
      if (id === runId.current) setAgentError(e instanceof Error ? e.message : 'Agent unavailable');
    } finally {
      if (id === runId.current) setRecLoading(false);
    }
  }, []);

  const run = useCallback(
    async (req: AnalysisRequest) => {
      const id = ++runId.current;
      setAnalyzing(true);
      setError(null);
      setRec(null);
      try {
        const result = await logisticsService.analyze(req);
        if (id !== runId.current) return;
        setAnalysis(result);
        setHistory((h) => [result, ...h.filter((x) => x.id !== result.id)].slice(0, 8));
        void advise(result, id);
      } catch (e) {
        if (id === runId.current) setError(e instanceof Error ? e.message : 'Analysis failed');
      } finally {
        if (id === runId.current) setAnalyzing(false);
      }
    },
    [advise],
  );

  useEffect(() => {
    Promise.all([
      logisticsService.listFacilities(),
      logisticsService.listRestrictedZones(),
      logisticsService.networkSummary(),
      logisticsService.recentAnalyses(8),
    ])
      .then(([f, z, s, h]) => {
        setFacilities(f);
        setZones(z);
        setSummary(s);
        setHistory(h);
      })
      .catch((e) => setError(`Could not reach the logistics API: ${e instanceof Error ? e.message : e}`));
    void run(SCENARIOS[0].request);
  }, [run]);

  const pickDestination = (destinationId: number) => {
    if (destinationId === request.originId) return;
    const next = { ...request, destinationId };
    setRequest(next);
    void run(next);
  };

  const selectHistory = (a: AnalysisResult) => {
    runId.current++;
    setRequest(a.request);
    setAnalysis(a);
    void advise(a, runId.current);
  };

  return (
    <div className="min-h-screen">
      <Header mode={logisticsService.mode} agentProvider={routeAgent.provider} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Helsinki University Hospital network</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">When should a medical drone replace the courier?</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Compare door-to-door time, cost and emissions for every shipment, with airspace restrictions,
              weather and cold-chain limits built in.
            </p>
          </div>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <KpiStrip summary={summary} />

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-6">
            <RoutePlanner facilities={facilities} value={request} onChange={setRequest} onSubmit={run} loading={analyzing} />
            <HistoryList items={history} activeId={analysis?.id} onSelect={selectHistory} />
          </div>
          <div className="min-w-0 space-y-6">
            <NetworkMap facilities={facilities} zones={zones} analysis={analysis} onPick={(f) => pickDestination(f.id)} />
            <div className="grid gap-6 xl:grid-cols-2">
              <ComparisonPanel analysis={analysis} loading={analyzing} />
              <AgentPanel rec={rec} loading={recLoading || (analyzing && !rec)} error={agentError} />
            </div>
          </div>
        </div>

        <RoutesTable summary={summary} onSelect={pickDestination} />
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 text-[11px] text-slate-400 sm:px-6">
        {logisticsService.mode === 'mock'
          ? 'Demo mode: every calculation runs in your browser against the seeded HUS network. No backend, database or LLM calls.'
          : 'Live mode: data from the Spring Boot API and PostgreSQL.'}{' '}
        Figures are illustrative planning estimates, not operational guidance.
      </footer>
    </div>
  );
}
