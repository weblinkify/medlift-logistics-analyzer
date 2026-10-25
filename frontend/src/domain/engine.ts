import type {
  AnalysisRequest,
  AnalysisResult,
  DroneBlocker,
  Facility,
  GeoPoint,
  NetworkSummary,
  Recommendation,
  RestrictedZone,
  RouteSummary,
  ZoneConflict,
  ZoneResolution,
} from './types';

// Port of backend/src/main/java/com/medlift/analyzer/service/LogisticsCalculator.java.
// The browser mock mode uses this so it returns the same numbers as the live API. Change both together.

export const MODEL = {
  droneCruiseKmh: 72,
  dronePrepMinutes: 4,
  droneHandoffMinutes: 2,
  droneMaxPayloadKg: 5,
  droneMaxRangeKm: 60,
  droneBaseEur: 22,
  dronePerKmEur: 0.85,
  droneCo2KgPerKm: 0.006,
  zoneBufferKm: 0.5,
  roadCircuity: 1.38,
  courierUrbanKm: 12,
  courierUrbanKmh: 32,
  courierHighwayKmh: 80,
  courierHandoffMinutes: 5,
  courierBaseEur: 38,
  courierPerKmEur: 1.45,
  courierCo2KgPerKm: 0.18,
  flyableDayRatio: 0.88,
} as const;

export const WEATHER = {
  CLEAR: { droneSpeedFactor: 1.0, roadTimeFactor: 1.0, droneFlyable: true },
  WINDY: { droneSpeedFactor: 0.85, roadTimeFactor: 1.0, droneFlyable: true },
  RAIN: { droneSpeedFactor: 0.9, roadTimeFactor: 1.1, droneFlyable: true },
  SNOW: { droneSpeedFactor: 0.8, roadTimeFactor: 1.3, droneFlyable: true },
  STORM: { droneSpeedFactor: 0.7, roadTimeFactor: 1.25, droneFlyable: false },
} as const;

export const PRIORITY = {
  ROUTINE: { courierDispatchMinutes: 30, courierCostMultiplier: 0.55 },
  URGENT: { courierDispatchMinutes: 15, courierCostMultiplier: 1.25 },
  STAT: { courierDispatchMinutes: 8, courierCostMultiplier: 1.6 },
} as const;

export const TRAFFIC = { OFF_PEAK: 1.0, DAYTIME: 1.2, PEAK: 1.55 } as const;

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON_EQUATOR = 111.32;

interface Vec {
  x: number;
  y: number;
}
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const len = (a: Vec) => Math.hypot(a.x, a.y);
const toRad = (deg: number) => (deg * Math.PI) / 180;

export const round1 = (v: number) => Math.round(v * 10) / 10;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projection(lat0: number, lon0: number) {
  const kmPerDegLon = KM_PER_DEG_LON_EQUATOR * Math.cos(toRad(lat0));
  return {
    toLocal: (lat: number, lon: number): Vec => ({ x: (lon - lon0) * kmPerDegLon, y: (lat - lat0) * KM_PER_DEG_LAT }),
    toGeo: (v: Vec): GeoPoint => ({ lat: lat0 + v.y / KM_PER_DEG_LAT, lon: lon0 + v.x / kmPerDegLon }),
  };
}

function southernPerpendicular(b: Vec): Vec {
  let p: Vec = { x: -b.y, y: b.x };
  if (p.y > 0) p = scale(p, -1);
  const l = len(p);
  return l === 0 ? { x: 0, y: -1 } : scale(p, 1 / l);
}

function directionOf(u: Vec): NonNullable<ZoneConflict['detourDirection']> {
  if (Math.abs(u.y) >= Math.abs(u.x)) return u.y < 0 ? 'southern' : 'northern';
  return u.x > 0 ? 'eastern' : 'western';
}

function conflict(
  z: RestrictedZone,
  resolution: ZoneResolution,
  detourDirection: ZoneConflict['detourDirection'],
  detourKm: number | null,
  closestKm: number,
  endpoint: ZoneConflict['endpoint'],
): ZoneConflict {
  return {
    zoneId: z.id,
    zoneCode: z.code,
    zoneName: z.name,
    severity: z.severity,
    authority: z.authority,
    resolution,
    detourDirection,
    detourKm,
    closestApproachKm: round1(closestKm),
    endpoint,
  };
}

export function analyze(
  origin: Facility,
  destination: Facility,
  zones: RestrictedZone[],
  req: AnalysisRequest,
  id: string = crypto.randomUUID(),
): AnalysisResult {
  const straightKm = haversineKm(origin.lat, origin.lon, destination.lat, destination.lon);
  const proj = projection(origin.lat, origin.lon);
  const b = proj.toLocal(destination.lat, destination.lon);
  const directLocalKm = len(b);

  const conflicts: ZoneConflict[] = [];
  const blockers: DroneBlocker[] = [];
  const waypoints: { t: number; point: Vec }[] = [];

  for (const zone of zones) {
    const c = proj.toLocal(zone.lat, zone.lon);
    const r = zone.radiusKm;
    const t = directLocalKm === 0 ? 0 : Math.max(0, Math.min(1, dot(c, b) / (directLocalKm * directLocalKm)));
    const closest = scale(b, t);
    const d = len(sub(c, closest));
    if (d >= r) continue;

    const originInside = len(c) < r;
    const destInside = len(sub(c, b)) < r;
    if (originInside || destInside) {
      const inside = originInside ? origin : destination;
      const resolution: ZoneResolution =
        zone.severity === 'PROHIBITED' ? 'BLOCKED' : zone.severity === 'RESTRICTED' ? 'AUTHORIZATION_REQUIRED' : 'ADVISORY';
      if (resolution === 'BLOCKED') {
        blockers.push({ code: 'PROHIBITED_ZONE', message: `${inside.name} lies inside the ${zone.name} prohibited zone` });
      }
      conflicts.push(conflict(zone, resolution, null, null, d, originInside ? 'origin' : 'destination'));
      continue;
    }

    if (zone.severity === 'ADVISORY') {
      conflicts.push(conflict(zone, 'ADVISORY', null, null, d, null));
      continue;
    }

    const away = d > 1e-6 ? scale(sub(closest, c), 1 / d) : southernPerpendicular(b);
    const w = add(c, scale(away, r + MODEL.zoneBufferKm));
    const zoneDetour = len(w) + len(sub(b, w)) - directLocalKm;
    waypoints.push({ t, point: w });
    conflicts.push(conflict(zone, 'DETOUR', directionOf(away), round1(zoneDetour), d, null));
  }

  waypoints.sort((p, q) => p.t - q.t);
  const path: GeoPoint[] = [{ lat: origin.lat, lon: origin.lon }];
  let prev: Vec = { x: 0, y: 0 };
  let pathLocalKm = 0;
  for (const wp of waypoints) {
    pathLocalKm += len(sub(wp.point, prev));
    path.push(proj.toGeo(wp.point));
    prev = wp.point;
  }
  pathLocalKm += len(sub(b, prev));
  path.push({ lat: destination.lat, lon: destination.lon });

  const detourKm = Math.max(0, pathLocalKm - directLocalKm);
  const flightKm = straightKm + detourKm;

  if (req.payloadKg > MODEL.droneMaxPayloadKg) {
    blockers.push({
      code: 'PAYLOAD_LIMIT',
      message: `Payload ${req.payloadKg.toFixed(1)} kg exceeds the ${MODEL.droneMaxPayloadKg.toFixed(1)} kg drone limit`,
    });
  }
  if (flightKm > MODEL.droneMaxRangeKm) {
    blockers.push({
      code: 'RANGE_LIMIT',
      message: `Flight distance ${flightKm.toFixed(1)} km exceeds the ${MODEL.droneMaxRangeKm} km one-way range`,
    });
  }
  const weather = WEATHER[req.weather];
  if (!weather.droneFlyable) {
    blockers.push({ code: 'WEATHER_GROUNDED', message: 'Severe weather: drone fleet grounded' });
  }
  for (const f of [origin, destination]) {
    if (!f.hasDronePad) blockers.push({ code: 'NO_DRONE_PAD', message: `${f.name} has no certified drone pad` });
  }
  const feasible = blockers.length === 0;

  const droneSpeed = MODEL.droneCruiseKmh * weather.droneSpeedFactor;
  const droneMinutes = MODEL.dronePrepMinutes + (flightKm / droneSpeed) * 60 + MODEL.droneHandoffMinutes;
  const droneCost = MODEL.droneBaseEur + MODEL.dronePerKmEur * flightKm;
  const droneCo2 = flightKm * MODEL.droneCo2KgPerKm;

  const priority = PRIORITY[req.priority];
  const roadKm = straightKm * MODEL.roadCircuity;
  const freeFlowHours =
    Math.min(roadKm, MODEL.courierUrbanKm) / MODEL.courierUrbanKmh +
    Math.max(0, roadKm - MODEL.courierUrbanKm) / MODEL.courierHighwayKmh;
  const driveMinutes = freeFlowHours * 60 * TRAFFIC[req.timeWindow] * weather.roadTimeFactor;
  const courierMinutes = priority.courierDispatchMinutes + driveMinutes + MODEL.courierHandoffMinutes;
  const courierCost = (MODEL.courierBaseEur + MODEL.courierPerKmEur * roadKm) * priority.courierCostMultiplier;
  const courierCo2 = roadKm * MODEL.courierCo2KgPerKm;

  let recommendation: Recommendation;
  if (!feasible) recommendation = 'COURIER';
  else if (req.priority !== 'ROUTINE') recommendation = 'DRONE';
  else recommendation = droneCost <= courierCost ? 'DRONE' : 'COURIER';

  return {
    id,
    createdAt: new Date().toISOString(),
    request: req,
    origin,
    destination,
    straightLineKm: round1(straightKm),
    drone: {
      feasible,
      flightDistanceKm: round1(flightKm),
      detourKm: round1(detourKm),
      totalMinutes: round1(droneMinutes),
      costEur: round2(droneCost),
      co2Kg: round2(droneCo2),
      blockers,
      zoneConflicts: conflicts,
      path,
    },
    courier: {
      roadDistanceKm: round1(roadKm),
      dispatchMinutes: round1(priority.courierDispatchMinutes),
      driveMinutes: round1(driveMinutes),
      totalMinutes: round1(courierMinutes),
      costEur: round2(courierCost),
      co2Kg: round2(courierCo2),
    },
    recommendation,
    timeSavedMinutes: round1(courierMinutes - droneMinutes),
    costDeltaEur: round2(courierCost - droneCost),
    co2SavedKg: round2(courierCo2 - droneCo2),
  };
}

/** Port of LogisticsAnalysisService.networkSummary(). */
export function networkSummary(facilities: Facility[], zones: RestrictedZone[]): NetworkSummary {
  const hub = facilities.find((f) => f.type === 'HUB');
  if (!hub) throw new Error('No hub facility configured');

  const routes: RouteSummary[] = [];
  let annualMinutes = 0;
  let annualEur = 0;
  let annualCo2Kg = 0;
  let weightedMinutes = 0;
  let feasibleRoutes = 0;
  let annualDeliveries = 0;

  for (const dest of facilities) {
    if (dest.id === hub.id) continue;
    const r = analyze(hub, dest, zones, {
      originId: hub.id,
      destinationId: dest.id,
      payloadType: 'LAB_SAMPLES',
      payloadKg: 2,
      priority: 'URGENT',
      weather: 'CLEAR',
      timeWindow: 'DAYTIME',
    }, `route-${dest.id}`);
    routes.push({
      destination: dest,
      dailyShipments: dest.dailyShipments,
      straightLineKm: r.straightLineKm,
      droneFeasible: r.drone.feasible,
      droneMinutes: r.drone.totalMinutes,
      courierMinutes: r.courier.totalMinutes,
      minutesSavedPerDelivery: r.timeSavedMinutes,
      costSavedPerDeliveryEur: r.costDeltaEur,
      zoneConflicts: r.drone.zoneConflicts.length,
    });
    if (r.drone.feasible) {
      feasibleRoutes++;
      const yearly = dest.dailyShipments * 365 * MODEL.flyableDayRatio;
      annualDeliveries += Math.round(yearly);
      annualMinutes += yearly * r.timeSavedMinutes;
      annualEur += yearly * r.costDeltaEur;
      annualCo2Kg += yearly * r.co2SavedKg;
      weightedMinutes += dest.dailyShipments * r.timeSavedMinutes;
    }
  }
  const feasibleDaily = routes.filter((r) => r.droneFeasible).reduce((s, r) => s + r.dailyShipments, 0);

  return {
    hub,
    totalRoutes: routes.length,
    droneFeasibleRoutes: feasibleRoutes,
    annualDroneDeliveries: annualDeliveries,
    avgMinutesSavedPerDelivery: round1(feasibleDaily === 0 ? 0 : weightedMinutes / feasibleDaily),
    annualHoursSaved: Math.round(annualMinutes / 60),
    annualCostSavingsEur: Math.round(annualEur),
    annualCo2SavedTonnes: round1(annualCo2Kg / 1000),
    flyableDayRatio: MODEL.flyableDayRatio,
    routes,
  };
}
