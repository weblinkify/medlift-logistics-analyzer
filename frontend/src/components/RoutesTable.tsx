import { CheckCircle2, XCircle } from 'lucide-react';
import type { NetworkSummary } from '../domain/types';
import { fmtEur } from '../format';
import { Card } from './ui';

export function RoutesTable({ summary, onSelect }: { summary: NetworkSummary | null; onSelect: (destinationId: number) => void }) {
  return (
    <Card
      title="Network rollout plan"
      subtitle={
        summary
          ? `Urgent 2 kg lab-sample runs from ${summary.hub.name} · ${Math.round(summary.flyableDayRatio * 100)}% flyable days assumed`
          : 'Loading…'
      }
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-2 font-medium">Destination</th>
              <th className="px-3 py-2 text-right font-medium">Runs/day</th>
              <th className="px-3 py-2 text-right font-medium">Distance</th>
              <th className="px-3 py-2 text-right font-medium">Drone</th>
              <th className="px-3 py-2 text-right font-medium">Courier</th>
              <th className="px-3 py-2 text-right font-medium">Saved / run</th>
              <th className="px-3 py-2 text-right font-medium">€ saved / run</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {summary?.routes.map((r) => (
              <tr
                key={r.destination.id}
                className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                onClick={() => onSelect(r.destination.id)}
              >
                <td className="px-5 py-2.5 font-medium text-slate-900">
                  {r.destination.name}
                  <span className="ml-1 text-slate-400">· {r.destination.city}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-700">{r.dailyShipments}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{r.straightLineKm.toFixed(1)} km</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{r.droneFeasible ? `${r.droneMinutes.toFixed(0)} min` : '—'}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{r.courierMinutes.toFixed(0)} min</td>
                <td className="px-3 py-2.5 text-right font-medium text-slate-900">{r.droneFeasible ? `${r.minutesSavedPerDelivery.toFixed(0)} min` : '—'}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{r.droneFeasible ? fmtEur(r.costSavedPerDeliveryEur) : '—'}</td>
                <td className="px-5 py-2.5">
                  {r.droneFeasible ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Drone-ready
                      {r.zoneConflicts > 0 && <span className="text-slate-400">· {r.zoneConflicts} airspace note{r.zoneConflicts > 1 ? 's' : ''}</span>}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <XCircle className="h-3.5 w-3.5" aria-hidden /> Needs drone pad
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
