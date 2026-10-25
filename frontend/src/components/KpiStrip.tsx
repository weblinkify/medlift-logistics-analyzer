import type { NetworkSummary } from '../domain/types';
import { fmtEurCompact, fmtInt } from '../format';

export function KpiStrip({ summary }: { summary: NetworkSummary | null }) {
  const tiles = summary
    ? [
        { label: 'Projected annual savings', value: fmtEurCompact(summary.annualCostSavingsEur), note: 'vs. urgent road courier' },
        { label: 'Delivery hours saved / yr', value: fmtInt(summary.annualHoursSaved), note: `${fmtInt(summary.annualDroneDeliveries)} drone deliveries` },
        { label: 'Faster per urgent run', value: `${summary.avgMinutesSavedPerDelivery.toFixed(0)} min`, note: 'volume-weighted average' },
        { label: 'CO₂ avoided / yr', value: `${summary.annualCo2SavedTonnes.toFixed(0)} t`, note: 'electric fleet vs. vans' },
        { label: 'Drone-ready routes', value: `${summary.droneFeasibleRoutes}/${summary.totalRoutes}`, note: `from ${summary.hub.code} hub` },
      ]
    : null;

  return (
    <section aria-label="Network impact" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {(tiles ?? Array.from({ length: 5 }, () => null)).map((t, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {t ? (
            <>
              <p className="text-xs font-medium text-slate-500">{t.label}</p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-slate-900">{t.value}</p>
              <p className="mt-1 text-[11px] text-slate-400">{t.note}</p>
            </>
          ) : (
            <div className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-7 w-20" />
              <div className="skeleton h-3 w-16" />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
