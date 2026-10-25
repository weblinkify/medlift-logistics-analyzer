import { AlertOctagon, Plane, Truck } from 'lucide-react';
import type { AnalysisResult } from '../domain/types';
import { fmtEur, fmtKm, fmtMin, PAYLOAD_LABEL, PRIORITY_LABEL, shortName } from '../format';
import { Card } from './ui';

const DRONE = '#2563eb';
const COURIER = '#d97706';

export function ComparisonPanel({ analysis, loading }: { analysis: AnalysisResult | null; loading: boolean }) {
  if (!analysis) {
    return (
      <Card title="Drone vs. courier">
        {loading ? <div className="skeleton h-40" /> : <p className="text-sm text-slate-500">Run an analysis to compare modes.</p>}
      </Card>
    );
  }
  const a = analysis;
  const drone = a.recommendation === 'DRONE';

  return (
    <Card
      title="Drone vs. courier"
      subtitle={`${shortName(a.origin.name)} → ${shortName(a.destination.name)} · ${PAYLOAD_LABEL[a.request.payloadType]} ${a.request.payloadKg} kg · ${PRIORITY_LABEL[a.request.priority]}`}
      className={loading ? 'opacity-60 transition' : 'transition'}
    >
      <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${drone ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-900'}`}>
        {drone ? <Plane className="h-5 w-5" aria-hidden /> : <Truck className="h-5 w-5" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Recommended: {drone ? 'Medical drone' : 'Road courier'}</p>
          <p className="tabular text-xs opacity-80">
            {a.drone.feasible
              ? `${Math.abs(a.timeSavedMinutes).toFixed(1)} min ${a.timeSavedMinutes >= 0 ? 'faster' : 'slower'} by drone · ${fmtEur(Math.abs(a.costDeltaEur))} ${a.costDeltaEur >= 0 ? 'cheaper' : 'more expensive'} · ${a.co2SavedKg.toFixed(2)} kg CO₂ avoided`
              : 'Drone is not an option for this shipment'}
          </p>
        </div>
      </div>

      {a.drone.blockers.length > 0 && (
        <ul className="mb-5 space-y-1.5">
          {a.drone.blockers.map((b) => (
            <li key={b.code} className="flex items-start gap-2 text-xs text-rose-700">
              <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span><span className="font-semibold">Blocked:</span> {b.message}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          icon={<Plane className="h-4 w-4" aria-hidden />}
          name="Drone"
          color={DRONE}
          muted={!a.drone.feasible}
          rows={[
            ['Door-to-door', fmtMin(a.drone.totalMinutes)],
            ['Flight distance', `${fmtKm(a.drone.flightDistanceKm)}${a.drone.detourKm > 0 ? ` (+${a.drone.detourKm.toFixed(1)} detour)` : ''}`],
            ['Cost', fmtEur(a.drone.costEur)],
            ['CO₂', `${a.drone.co2Kg.toFixed(2)} kg`],
          ]}
        />
        <ModeCard
          icon={<Truck className="h-4 w-4" aria-hidden />}
          name="Courier"
          color={COURIER}
          rows={[
            ['Door-to-door', fmtMin(a.courier.totalMinutes)],
            ['Road distance', fmtKm(a.courier.roadDistanceKm)],
            ['Cost', fmtEur(a.courier.costEur)],
            ['CO₂', `${a.courier.co2Kg.toFixed(2)} kg`],
          ]}
          footnote={`${a.courier.dispatchMinutes.toFixed(0)} min dispatch + ${a.courier.driveMinutes.toFixed(1)} min drive`}
        />
      </div>

      <div className="mt-6 space-y-4" aria-label="Side-by-side comparison">
        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: DRONE }} /> Drone</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COURIER }} /> Courier</span>
        </div>
        <BarPair label="Time" drone={a.drone.totalMinutes} courier={a.courier.totalMinutes} format={fmtMin} />
        <BarPair label="Cost" drone={a.drone.costEur} courier={a.courier.costEur} format={fmtEur} />
        <BarPair label="CO₂" drone={a.drone.co2Kg} courier={a.courier.co2Kg} format={(v) => `${v.toFixed(2)} kg`} />
      </div>
    </Card>
  );
}

function ModeCard({ icon, name, color, rows, muted, footnote }: {
  icon: React.ReactNode;
  name: string;
  color: string;
  rows: [string, string][];
  muted?: boolean;
  footnote?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${muted ? 'opacity-50' : ''}`}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="grid h-6 w-6 place-items-center rounded-md text-white" style={{ background: color }}>{icon}</span>
        {name}
        {muted && <span className="text-[11px] font-medium text-rose-600">unavailable</span>}
      </p>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-xs">
            <dt className="text-slate-500">{k}</dt>
            <dd className="tabular font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-2 text-[11px] text-slate-400">{footnote}</p>}
    </div>
  );
}

function BarPair({ label, drone, courier, format }: { label: string; drone: number; courier: number; format: (v: number) => string }) {
  const max = Math.max(drone, courier, 1e-9);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>
      <div className="space-y-[2px]">
        {[
          ['Drone', drone, DRONE],
          ['Courier', courier, COURIER],
        ].map(([name, v, c]) => (
          <div key={name as string} className="group flex items-center gap-2" title={`${name}: ${format(v as number)}`}>
            <div className="h-3 flex-1 rounded-r bg-slate-100">
              <div
                className="h-3 rounded-r-[4px] transition-all duration-500"
                style={{ width: `${Math.max(1.5, ((v as number) / max) * 100)}%`, background: c as string }}
              />
            </div>
            <span className="tabular w-20 text-right text-[11px] text-slate-700">{format(v as number)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
