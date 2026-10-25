import { describe, expect, it } from 'vitest';
import { analyze } from '../domain/engine';
import { FACILITIES, RESTRICTED_ZONES } from '../domain/seed';
import type { AnalysisRequest, AnalysisResult, Priority, TimeWindow, Weather } from '../domain/types';

// Opt-in: checks the browser mock engine against a running backend.
//   docker compose up -d && PARITY_API_URL=http://localhost:8080/api/v1 npm test
const API = process.env.PARITY_API_URL;

const strip = ({ id: _i, createdAt: _c, ...rest }: AnalysisResult) => rest;

describe.skipIf(!API)('mock engine ↔ Spring Boot parity', () => {
  const cases: AnalysisRequest[] = [];
  const variants: [Priority, Weather, TimeWindow, number][] = [
    ['URGENT', 'CLEAR', 'DAYTIME', 2],
    ['STAT', 'SNOW', 'PEAK', 4.5],
    ['ROUTINE', 'WINDY', 'OFF_PEAK', 1],
    ['STAT', 'STORM', 'PEAK', 8],
  ];
  for (const o of FACILITIES) {
    for (const d of FACILITIES) {
      if (o.id === d.id) continue;
      const [priority, weather, timeWindow, payloadKg] = variants[(o.id + d.id) % variants.length];
      cases.push({ originId: o.id, destinationId: d.id, payloadType: 'BLOOD_PRODUCTS', payloadKg, priority, weather, timeWindow });
    }
  }

  it(`agrees on all ${cases.length} facility pairs`, async () => {
    for (const req of cases) {
      const res = await fetch(`${API}/analyses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
      const live = (await res.json()) as AnalysisResult;
      const local = analyze(FACILITIES.find((f) => f.id === req.originId)!, FACILITIES.find((f) => f.id === req.destinationId)!, RESTRICTED_ZONES, req);
      const path = (r: AnalysisResult) => r.drone.path.map((p) => [p.lat.toFixed(6), p.lon.toFixed(6)]);
      expect({ ...strip(local), drone: { ...local.drone, path: path(local) } }).toEqual({
        ...strip(live),
        drone: { ...live.drone, path: path(live) },
      });
    }
  }, 60_000);
});
