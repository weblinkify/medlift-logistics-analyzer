// Wire types — mirror the Spring Boot records in backend/src/main/java/com/medlift/analyzer/domain.

export type FacilityType = 'HUB' | 'HOSPITAL' | 'LAB';
export type ZoneSeverity = 'PROHIBITED' | 'RESTRICTED' | 'ADVISORY';
export type PayloadType = 'BLOOD_PRODUCTS' | 'LAB_SAMPLES' | 'PHARMACEUTICALS' | 'MEDICAL_DEVICES';
export type Priority = 'ROUTINE' | 'URGENT' | 'STAT';
export type Weather = 'CLEAR' | 'WINDY' | 'RAIN' | 'SNOW' | 'STORM';
export type TimeWindow = 'OFF_PEAK' | 'DAYTIME' | 'PEAK';
export type Recommendation = 'DRONE' | 'COURIER';
export type ZoneResolution = 'DETOUR' | 'AUTHORIZATION_REQUIRED' | 'BLOCKED' | 'ADVISORY';
export type BlockerCode = 'PAYLOAD_LIMIT' | 'RANGE_LIMIT' | 'WEATHER_GROUNDED' | 'NO_DRONE_PAD' | 'PROHIBITED_ZONE';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Facility {
  id: number;
  code: string;
  name: string;
  city: string;
  type: FacilityType;
  lat: number;
  lon: number;
  hasDronePad: boolean;
  dailyShipments: number;
}

export interface RestrictedZone {
  id: number;
  code: string;
  name: string;
  severity: ZoneSeverity;
  lat: number;
  lon: number;
  radiusKm: number;
  authority: string;
  notes: string | null;
}

export interface AnalysisRequest {
  originId: number;
  destinationId: number;
  payloadType: PayloadType;
  payloadKg: number;
  priority: Priority;
  weather: Weather;
  timeWindow: TimeWindow;
}

export interface DroneBlocker {
  code: BlockerCode;
  message: string;
}

export interface ZoneConflict {
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  severity: ZoneSeverity;
  authority: string;
  resolution: ZoneResolution;
  detourDirection: 'northern' | 'southern' | 'eastern' | 'western' | null;
  detourKm: number | null;
  closestApproachKm: number;
  endpoint: 'origin' | 'destination' | null;
}

export interface DroneLeg {
  feasible: boolean;
  flightDistanceKm: number;
  detourKm: number;
  totalMinutes: number;
  costEur: number;
  co2Kg: number;
  blockers: DroneBlocker[];
  zoneConflicts: ZoneConflict[];
  path: GeoPoint[];
}

export interface CourierLeg {
  roadDistanceKm: number;
  dispatchMinutes: number;
  driveMinutes: number;
  totalMinutes: number;
  costEur: number;
  co2Kg: number;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  request: AnalysisRequest;
  origin: Facility;
  destination: Facility;
  straightLineKm: number;
  drone: DroneLeg;
  courier: CourierLeg;
  recommendation: Recommendation;
  timeSavedMinutes: number;
  costDeltaEur: number;
  co2SavedKg: number;
}

export interface RouteSummary {
  destination: Facility;
  dailyShipments: number;
  straightLineKm: number;
  droneFeasible: boolean;
  droneMinutes: number;
  courierMinutes: number;
  minutesSavedPerDelivery: number;
  costSavedPerDeliveryEur: number;
  zoneConflicts: number;
}

export interface NetworkSummary {
  hub: Facility;
  totalRoutes: number;
  droneFeasibleRoutes: number;
  annualDroneDeliveries: number;
  avgMinutesSavedPerDelivery: number;
  annualHoursSaved: number;
  annualCostSavingsEur: number;
  annualCo2SavedTonnes: number;
  flyableDayRatio: number;
  routes: RouteSummary[];
}
