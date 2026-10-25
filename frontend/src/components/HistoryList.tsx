import { Plane, Truck } from 'lucide-react';
import type { AnalysisResult } from '../domain/types';
import { PRIORITY_LABEL, shortName } from '../format';
import { Card } from './ui';

export function HistoryList({ items, activeId, onSelect }: { items: AnalysisResult[]; activeId?: string; onSelect: (a: AnalysisResult) => void }) {
  return (
    <Card title="Recent analyses" subtitle="This session">
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">No analyses yet.</p>
      ) : (
        <ul className="-mx-2 space-y-1">
          {items.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 ${a.id === activeId ? 'bg-slate-50' : ''}`}
              >
                {a.recommendation === 'DRONE' ? (
                  <Plane className="h-4 w-4 shrink-0 text-blue-600" aria-label="Drone" />
                ) : (
                  <Truck className="h-4 w-4 shrink-0 text-amber-600" aria-label="Courier" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-800">
                    {shortName(a.origin.name)} → {shortName(a.destination.name)}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {PRIORITY_LABEL[a.request.priority]} · {a.request.weather.toLowerCase()} · {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <span className="tabular text-[11px] font-medium text-slate-700">
                  {a.drone.feasible ? `−${a.timeSavedMinutes.toFixed(0)} min` : 'courier'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
