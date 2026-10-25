import { describe, expect, it } from 'vitest';
import { analyze, haversineKm, networkSummary } from '../domain/engine';
import { FACILITIES, RESTRICTED_ZONES } from '../domain/seed';
import type { AnalysisRequest } from '../domain/types';

const byId = (id: number) => FACILITIES.find((f) => f.id === id)!;
const req = (destinationId: number, over: Partial<AnalysisRequest> = {}): AnalysisRequest => ({
  originId: 1,
  destinationId,
  payloadType: 'LAB_SAMPLES',
  payloadKg: 2,
  priority: 'URGENT',
  weather: 'CLEAR',
  timeWindow: 'DAYTIME',
  ...over,
});
const run = (destinationId: number, over: Partial<AnalysisRequest> = {}) =>
  analyze(byId(1), byId(destinationId), RESTRICTED_ZONES, req(destinationId, over));

// Same scenarios as backend LogisticsCalculatorTest — the two engines must agree.
describe('logistics engine', () => {
  it('detours west around EFHK on the Hyvinkää route', () => {
    const r = run(8);
    const efhk = r.drone.zoneConflicts.find((z) => z.zoneCode === 'EFHK-CTR')!;
    expect(efhk.resolution).toBe('DETOUR');
    expect(efhk.detourDirection).toBe('western');
    expect(r.drone.zoneConflicts.find((z) => z.zoneCode === 'ECO-KESK')!.resolution).toBe('ADVISORY');
    expect(r.drone.path).toHaveLength(3);
    expect(r.recommendation).toBe('DRONE');
  });

  it('requires ATC authorisation when the destination is inside a control zone', () => {
    const r = run(3);
    const efhk = r.drone.zoneConflicts.find((z) => z.zoneCode === 'EFHK-CTR')!;
    expect(efhk.resolution).toBe('AUTHORIZATION_REQUIRED');
    expect(efhk.endpoint).toBe('destination');
    expect(r.drone.detourKm).toBe(0);
  });

  it('falls back to courier without a drone pad, heavy payloads or storms', () => {
    expect(run(5).drone.blockers.map((b) => b.code)).toEqual(['NO_DRONE_PAD']);
    const r = run(6, { payloadKg: 8, weather: 'STORM', priority: 'STAT', payloadType: 'MEDICAL_DEVICES', timeWindow: 'PEAK' });
    expect(r.drone.blockers.map((b) => b.code)).toEqual(['PAYLOAD_LIMIT', 'WEATHER_GROUNDED']);
    expect(r.recommendation).toBe('COURIER');
  });

  it('matches backend numbers for the Hyvinkää STAT peak scenario', () => {
    // Values captured from the Spring Boot API (POST /api/v1/analyses).
    const r = run(8, { payloadType: 'BLOOD_PRODUCTS', priority: 'STAT', timeWindow: 'PEAK' });
    expect(r.straightLineKm).toBe(48.6);
    expect(r.drone.flightDistanceKm).toBe(48.9);
    expect(r.drone.totalMinutes).toBe(46.7);
    expect(r.drone.costEur).toBe(63.56);
  });

  it('computes great-circle distance', () => {
    expect(haversineKm(60.1906, 24.9036, 60.627, 24.86)).toBeGreaterThan(48);
    expect(haversineKm(60.1906, 24.9036, 60.627, 24.86)).toBeLessThan(49);
  });

  it('projects network impact only for drone-ready routes', () => {
    const s = networkSummary(FACILITIES, RESTRICTED_ZONES);
    expect(s.totalRoutes).toBe(8);
    expect(s.droneFeasibleRoutes).toBe(7);
    expect(s.annualCostSavingsEur).toBeGreaterThan(0);
  });
});
