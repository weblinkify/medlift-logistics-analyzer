import { Loader2, Navigation } from 'lucide-react';
import type { AnalysisRequest, Facility, PayloadType, Priority, TimeWindow, Weather } from '../domain/types';
import { PAYLOAD_LABEL, PRIORITY_LABEL, TIME_LABEL, WEATHER_LABEL } from '../format';
import { Card, Field, Segmented, inputClass } from './ui';

export interface Scenario {
  label: string;
  hint: string;
  request: AnalysisRequest;
}

const base: Omit<AnalysisRequest, 'destinationId'> = {
  originId: 1,
  payloadType: 'LAB_SAMPLES',
  payloadKg: 2,
  priority: 'URGENT',
  weather: 'CLEAR',
  timeWindow: 'DAYTIME',
};

export const SCENARIOS: Scenario[] = [
  { label: 'Airport detour', hint: 'Hyvinkää · STAT blood', request: { ...base, destinationId: 8, payloadType: 'BLOOD_PRODUCTS', priority: 'STAT', timeWindow: 'PEAK' } },
  { label: 'Control zone', hint: 'Peijas · inside EFHK', request: { ...base, destinationId: 3 } },
  { label: 'Cold chain', hint: 'Jorvi · blood, rush hour', request: { ...base, destinationId: 2, payloadType: 'BLOOD_PRODUCTS', priority: 'STAT', timeWindow: 'PEAK' } },
  { label: 'Storm', hint: 'Porvoo · grounded fleet', request: { ...base, destinationId: 7, weather: 'STORM' } },
  { label: 'Heavy load', hint: 'Malmi · 8 kg devices', request: { ...base, destinationId: 4, payloadType: 'MEDICAL_DEVICES', payloadKg: 8 } },
  { label: 'No drone pad', hint: 'Töölö · porter range', request: { ...base, destinationId: 5, priority: 'ROUTINE' } },
];

export function RoutePlanner({ facilities, value, onChange, onSubmit, loading }: {
  facilities: Facility[];
  value: AnalysisRequest;
  onChange: (r: AnalysisRequest) => void;
  onSubmit: (r: AnalysisRequest) => void;
  loading: boolean;
}) {
  const set = <K extends keyof AnalysisRequest>(k: K, v: AnalysisRequest[K]) => onChange({ ...value, [k]: v });
  const sameEndpoints = value.originId === value.destinationId;

  return (
    <Card title="Route planner" subtitle="Pick a shipment, or load a demo scenario">
      <div className="mb-5 grid grid-cols-2 gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              onChange(s.request);
              onSubmit(s.request);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
          >
            <span className="block text-xs font-semibold text-slate-800">{s.label}</span>
            <span className="block text-[11px] text-slate-500">{s.hint}</span>
          </button>
        ))}
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sameEndpoints) onSubmit(value);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label="Origin">
            <select className={inputClass} value={value.originId} onChange={(e) => set('originId', Number(e.target.value))}>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Destination">
            <select className={inputClass} value={value.destinationId} onChange={(e) => set('destinationId', Number(e.target.value))}>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Payload">
            <select className={inputClass} value={value.payloadType} onChange={(e) => set('payloadType', e.target.value as PayloadType)}>
              {(Object.keys(PAYLOAD_LABEL) as PayloadType[]).map((p) => (
                <option key={p} value={p}>{PAYLOAD_LABEL[p]}</option>
              ))}
            </select>
          </Field>
          <Field label="Weight (kg)">
            <input
              className={`${inputClass} tabular`}
              type="number"
              min={0.1}
              max={50}
              step={0.1}
              value={value.payloadKg}
              onChange={(e) => set('payloadKg', Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Priority">
          <Segmented<Priority> name="Priority" value={value.priority} options={['ROUTINE', 'URGENT', 'STAT']} labels={PRIORITY_LABEL} onChange={(v) => set('priority', v)} />
        </Field>
        <Field label="Weather">
          <Segmented<Weather> name="Weather" value={value.weather} options={['CLEAR', 'WINDY', 'RAIN', 'SNOW', 'STORM']} labels={WEATHER_LABEL} onChange={(v) => set('weather', v)} />
        </Field>
        <Field label="Road traffic">
          <Segmented<TimeWindow> name="Road traffic" value={value.timeWindow} options={['OFF_PEAK', 'DAYTIME', 'PEAK']} labels={TIME_LABEL} onChange={(v) => set('timeWindow', v)} />
        </Field>

        {sameEndpoints && <p className="text-xs text-rose-600">Origin and destination must differ.</p>}

        <button
          type="submit"
          disabled={loading || sameEndpoints}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Navigation className="h-4 w-4" aria-hidden />}
          Analyze route
        </button>
      </form>
    </Card>
  );
}
