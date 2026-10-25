import { useMemo, useState } from 'react';
import type { AnalysisResult, Facility, RestrictedZone, ZoneSeverity } from '../domain/types';
import { shortName } from '../format';
import { Card } from './ui';

const W = 640;
const H = 400;
const PAD = 36;
const KM_PER_DEG_LAT = 110.574;

const ZONE_STYLE: Record<ZoneSeverity, { fill: string; stroke: string; label: string }> = {
  PROHIBITED: { fill: 'rgba(244,63,94,0.18)', stroke: '#fb7185', label: 'Prohibited' },
  RESTRICTED: { fill: 'rgba(245,158,11,0.16)', stroke: '#fbbf24', label: 'Restricted (ATC)' },
  ADVISORY: { fill: 'rgba(16,185,129,0.14)', stroke: '#34d399', label: 'Advisory' },
};

export function NetworkMap({ facilities, zones, analysis, onPick }: {
  facilities: Facility[];
  zones: RestrictedZone[];
  analysis: AnalysisResult | null;
  onPick: (f: Facility) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const proj = useMemo(() => {
    // Fit hospitals and every restricted zone (centre ± radius) into the frame.
    const zLat = (z: RestrictedZone, s: number) => z.lat + (s * z.radiusKm) / KM_PER_DEG_LAT;
    const lats = [...facilities.map((f) => f.lat), ...zones.flatMap((z) => [zLat(z, -1), zLat(z, 1)])];
    const lons = [...facilities.map((f) => f.lon), ...zones.map((z) => z.lon)];
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const midLat = (minLat + maxLat) / 2;
    const kmPerDegLon = 111.32 * Math.cos((midLat * Math.PI) / 180);
    const widthKm = (maxLon - minLon) * kmPerDegLon;
    const heightKm = (maxLat - minLat) * KM_PER_DEG_LAT;
    const pxPerKm = Math.min((W - PAD * 2) / widthKm, (H - PAD * 2) / heightKm);
    const offX = (W - widthKm * pxPerKm) / 2;
    const offY = (H - heightKm * pxPerKm) / 2;
    return {
      pxPerKm,
      x: (lon: number) => offX + (lon - minLon) * kmPerDegLon * pxPerKm,
      y: (lat: number) => H - offY - (lat - minLat) * KM_PER_DEG_LAT * pxPerKm,
    };
  }, [facilities, zones]);

  // When two hospitals sit close together, put the western one's label on its left.
  const labelLeft = useMemo(() => {
    const left = new Set<number>();
    for (const f of facilities) {
      const near = facilities.some(
        (g) => g.id !== f.id && Math.hypot(proj.x(g.lon) - proj.x(f.lon), proj.y(g.lat) - proj.y(f.lat)) < 24 && g.lon > f.lon,
      );
      if (near || proj.x(f.lon) > W - 120) left.add(f.id);
    }
    return left;
  }, [facilities, proj]);

  const involved = new Set(analysis ? [analysis.origin.id, analysis.destination.id] : []);
  const conflictIds = new Set(analysis?.drone.zoneConflicts.map((z) => z.zoneId) ?? []);
  const scaleBarKm = 10;

  return (
    <Card
      title="Airspace & network"
      subtitle="HUS hospital district, Uusimaa · click a hospital to set it as the destination"
      className="overflow-hidden"
    >
      <div className="-m-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full bg-ink-900" role="img" aria-label="Map of hospitals, restricted airspace and the planned drone route">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1f2b47" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {zones.map((z) => {
            const s = ZONE_STYLE[z.severity];
            const hit = conflictIds.has(z.id);
            return (
              <g key={z.id} onMouseEnter={() => setHover(`zone-${z.id}`)} onMouseLeave={() => setHover(null)}>
                <circle
                  cx={proj.x(z.lon)}
                  cy={proj.y(z.lat)}
                  r={z.radiusKm * proj.pxPerKm}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={hit ? 2 : 1}
                  strokeDasharray={z.severity === 'ADVISORY' ? '4 3' : undefined}
                />
                <title>{`${z.name} — ${s.label}, ${z.radiusKm} km radius (${z.authority})`}</title>
                {(hover === `zone-${z.id}` || hit || z.radiusKm >= 5) && (
                  <text x={proj.x(z.lon)} y={proj.y(z.lat) + 3} textAnchor="middle" className="fill-slate-300 text-[10px] font-medium">
                    {z.code}
                  </text>
                )}
              </g>
            );
          })}

          {analysis && (
            <>
              <line
                x1={proj.x(analysis.origin.lon)}
                y1={proj.y(analysis.origin.lat)}
                x2={proj.x(analysis.destination.lon)}
                y2={proj.y(analysis.destination.lat)}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              <polyline
                points={analysis.drone.path.map((p) => `${proj.x(p.lon)},${proj.y(p.lat)}`).join(' ')}
                fill="none"
                stroke={analysis.drone.feasible ? '#60a5fa' : '#f87171'}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeDasharray="8 4"
                className="flight-path"
              />
              {analysis.drone.path.slice(1, -1).map((p, i) => (
                <circle key={i} cx={proj.x(p.lon)} cy={proj.y(p.lat)} r={3.5} fill="#0b1220" stroke="#60a5fa" strokeWidth={2} />
              ))}
            </>
          )}

          {facilities.map((f) => {
            const active = involved.has(f.id);
            const isHub = f.type === 'HUB';
            const cx = proj.x(f.lon);
            const cy = proj.y(f.lat);
            const toLeft = labelLeft.has(f.id);
            return (
              <g
                key={f.id}
                className="cursor-pointer"
                onClick={() => onPick(f)}
                onMouseEnter={() => setHover(`f-${f.id}`)}
                onMouseLeave={() => setHover(null)}
              >
                <circle cx={cx} cy={cy} r={14} fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHub ? 7 : 5}
                  fill={active ? '#ffffff' : isHub ? '#3b82f6' : '#cbd5e1'}
                  stroke={active ? '#3b82f6' : '#0b1220'}
                  strokeWidth={active ? 3 : 2}
                />
                {!f.hasDronePad && <circle cx={cx} cy={cy} r={9} fill="none" stroke="#f87171" strokeWidth={1} strokeDasharray="2 2" />}
                <text
                  x={toLeft ? cx - 10 : cx + 10}
                  y={cy + 4}
                  textAnchor={toLeft ? 'end' : 'start'}
                  className={`text-[11px] ${active || hover === `f-${f.id}` ? 'fill-white font-semibold' : 'fill-slate-400'}`}
                >
                  {shortName(f.name)}
                </text>
                <title>{`${f.name}, ${f.city}${f.hasDronePad ? '' : ' — no drone pad'}`}</title>
              </g>
            );
          })}

          <g transform={`translate(${PAD - 12}, ${H - 18})`}>
            <line x1={0} y1={0} x2={scaleBarKm * proj.pxPerKm} y2={0} stroke="#94a3b8" strokeWidth={2} />
            <text x={0} y={-6} className="fill-slate-400 text-[10px]">{scaleBarKm} km</text>
          </g>
        </svg>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-600">
          <li className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-blue-400" /> Drone flight path</li>
          <li className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t border-dotted border-slate-400" /> Direct line</li>
          {(Object.keys(ZONE_STYLE) as ZoneSeverity[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border" style={{ background: ZONE_STYLE[k].fill, borderColor: ZONE_STYLE[k].stroke }} />
              {ZONE_STYLE[k].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-dashed border-rose-400" /> No drone pad</li>
        </ul>
      </div>
    </Card>
  );
}
