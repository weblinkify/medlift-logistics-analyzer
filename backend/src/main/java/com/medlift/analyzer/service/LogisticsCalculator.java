package com.medlift.analyzer.service;

import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.domain.BlockerCode;
import com.medlift.analyzer.domain.CourierLeg;
import com.medlift.analyzer.domain.DroneBlocker;
import com.medlift.analyzer.domain.DroneLeg;
import com.medlift.analyzer.domain.Facility;
import com.medlift.analyzer.domain.GeoPoint;
import com.medlift.analyzer.domain.Priority;
import com.medlift.analyzer.domain.Recommendation;
import com.medlift.analyzer.domain.RestrictedZone;
import com.medlift.analyzer.domain.ZoneConflict;
import com.medlift.analyzer.domain.ZoneResolution;
import com.medlift.analyzer.domain.ZoneSeverity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Pure, side-effect-free drone vs. courier cost/time model.
 *
 * <p>The same model is ported to {@code frontend/src/domain/engine.ts} so the browser
 * mock mode produces identical numbers. Change both together.
 */
public final class LogisticsCalculator {

    public static final double DRONE_CRUISE_KMH = 72.0;
    public static final double DRONE_PREP_MINUTES = 4.0;
    public static final double DRONE_HANDOFF_MINUTES = 2.0;
    public static final double DRONE_MAX_PAYLOAD_KG = 5.0;
    public static final double DRONE_MAX_RANGE_KM = 60.0;
    public static final double DRONE_BASE_EUR = 22.0;
    public static final double DRONE_PER_KM_EUR = 0.85;
    public static final double DRONE_CO2_KG_PER_KM = 0.006;
    public static final double ZONE_BUFFER_KM = 0.5;

    public static final double ROAD_CIRCUITY = 1.38;
    /** First kilometres are urban streets; the remainder is ring road / motorway. */
    public static final double COURIER_URBAN_KM = 12.0;
    public static final double COURIER_URBAN_KMH = 32.0;
    public static final double COURIER_HIGHWAY_KMH = 80.0;
    public static final double COURIER_HANDOFF_MINUTES = 5.0;
    public static final double COURIER_BASE_EUR = 38.0;
    public static final double COURIER_PER_KM_EUR = 1.45;
    public static final double COURIER_CO2_KG_PER_KM = 0.18;

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double KM_PER_DEG_LAT = 110.574;
    private static final double KM_PER_DEG_LON_EQUATOR = 111.320;

    private LogisticsCalculator() {}

    public static AnalysisResult analyze(Facility origin, Facility destination,
                                         List<RestrictedZone> zones, AnalysisRequest req) {
        double straightKm = haversineKm(origin.lat(), origin.lon(), destination.lat(), destination.lon());
        Projection proj = new Projection(origin.lat(), origin.lon());
        Vec b = proj.toLocal(destination.lat(), destination.lon());
        double directLocalKm = b.len();

        List<ZoneConflict> conflicts = new ArrayList<>();
        List<DroneBlocker> blockers = new ArrayList<>();
        List<Waypoint> waypoints = new ArrayList<>();

        for (RestrictedZone zone : zones) {
            Vec c = proj.toLocal(zone.lat(), zone.lon());
            double r = zone.radiusKm();
            double t = directLocalKm == 0 ? 0 : clamp(c.dot(b) / (directLocalKm * directLocalKm), 0, 1);
            Vec closest = b.scale(t);
            double d = c.sub(closest).len();
            if (d >= r) {
                continue;
            }

            boolean originInside = c.len() < r;
            boolean destInside = c.sub(b).len() < r;
            if (originInside || destInside) {
                Facility inside = originInside ? origin : destination;
                String endpoint = originInside ? "origin" : "destination";
                ZoneResolution resolution = switch (zone.severity()) {
                    case PROHIBITED -> ZoneResolution.BLOCKED;
                    case RESTRICTED -> ZoneResolution.AUTHORIZATION_REQUIRED;
                    case ADVISORY -> ZoneResolution.ADVISORY;
                };
                if (resolution == ZoneResolution.BLOCKED) {
                    blockers.add(new DroneBlocker(BlockerCode.PROHIBITED_ZONE,
                            inside.name() + " lies inside the " + zone.name() + " prohibited zone"));
                }
                conflicts.add(conflict(zone, resolution, null, null, d, endpoint));
                continue;
            }

            if (zone.severity() == ZoneSeverity.ADVISORY) {
                conflicts.add(conflict(zone, ZoneResolution.ADVISORY, null, null, d, null));
                continue;
            }

            // Push the line out of the zone through a single tangent-side waypoint.
            Vec away = d > 1e-6 ? closest.sub(c).scale(1 / d) : southernPerpendicular(b);
            Vec w = c.add(away.scale(r + ZONE_BUFFER_KM));
            double zoneDetour = w.len() + b.sub(w).len() - directLocalKm;
            waypoints.add(new Waypoint(t, w));
            conflicts.add(conflict(zone, ZoneResolution.DETOUR, directionOf(away), round1(zoneDetour), d, null));
        }

        waypoints.sort(Comparator.comparingDouble(Waypoint::t));
        List<GeoPoint> path = new ArrayList<>();
        path.add(new GeoPoint(origin.lat(), origin.lon()));
        Vec prev = new Vec(0, 0);
        double pathLocalKm = 0;
        for (Waypoint wp : waypoints) {
            pathLocalKm += wp.point().sub(prev).len();
            path.add(proj.toGeo(wp.point()));
            prev = wp.point();
        }
        pathLocalKm += b.sub(prev).len();
        path.add(new GeoPoint(destination.lat(), destination.lon()));

        double detourKm = Math.max(0, pathLocalKm - directLocalKm);
        double flightKm = straightKm + detourKm;

        if (req.payloadKg() > DRONE_MAX_PAYLOAD_KG) {
            blockers.add(new DroneBlocker(BlockerCode.PAYLOAD_LIMIT, String.format(Locale.US,
                    "Payload %.1f kg exceeds the %.1f kg drone limit", req.payloadKg(), DRONE_MAX_PAYLOAD_KG)));
        }
        if (flightKm > DRONE_MAX_RANGE_KM) {
            blockers.add(new DroneBlocker(BlockerCode.RANGE_LIMIT, String.format(Locale.US,
                    "Flight distance %.1f km exceeds the %.0f km one-way range", flightKm, DRONE_MAX_RANGE_KM)));
        }
        if (!req.weather().droneFlyable) {
            blockers.add(new DroneBlocker(BlockerCode.WEATHER_GROUNDED,
                    "Severe weather: drone fleet grounded"));
        }
        for (Facility f : List.of(origin, destination)) {
            if (!f.hasDronePad()) {
                blockers.add(new DroneBlocker(BlockerCode.NO_DRONE_PAD,
                        f.name() + " has no certified drone pad"));
            }
        }
        boolean feasible = blockers.isEmpty();

        double droneSpeed = DRONE_CRUISE_KMH * req.weather().droneSpeedFactor;
        double droneMinutes = DRONE_PREP_MINUTES + flightKm / droneSpeed * 60 + DRONE_HANDOFF_MINUTES;
        double droneCost = DRONE_BASE_EUR + DRONE_PER_KM_EUR * flightKm;
        double droneCo2 = flightKm * DRONE_CO2_KG_PER_KM;

        Priority priority = req.priority();
        double roadKm = straightKm * ROAD_CIRCUITY;
        double freeFlowHours = Math.min(roadKm, COURIER_URBAN_KM) / COURIER_URBAN_KMH
                + Math.max(0, roadKm - COURIER_URBAN_KM) / COURIER_HIGHWAY_KMH;
        double driveMinutes = freeFlowHours * 60 * req.timeWindow().trafficFactor * req.weather().roadTimeFactor;
        double courierMinutes = priority.courierDispatchMinutes + driveMinutes + COURIER_HANDOFF_MINUTES;
        double courierCost = (COURIER_BASE_EUR + COURIER_PER_KM_EUR * roadKm) * priority.courierCostMultiplier;
        double courierCo2 = roadKm * COURIER_CO2_KG_PER_KM;

        Recommendation recommendation;
        if (!feasible) {
            recommendation = Recommendation.COURIER;
        } else if (priority != Priority.ROUTINE) {
            recommendation = Recommendation.DRONE;
        } else {
            recommendation = droneCost <= courierCost ? Recommendation.DRONE : Recommendation.COURIER;
        }

        DroneLeg drone = new DroneLeg(feasible, round1(flightKm), round1(detourKm), round1(droneMinutes),
                round2(droneCost), round2(droneCo2), blockers, conflicts, path);
        CourierLeg courier = new CourierLeg(round1(roadKm), round1(priority.courierDispatchMinutes),
                round1(driveMinutes), round1(courierMinutes), round2(courierCost), round2(courierCo2));

        return new AnalysisResult(UUID.randomUUID(), Instant.now(), req, origin, destination,
                round1(straightKm), drone, courier, recommendation,
                round1(courierMinutes - droneMinutes), round2(courierCost - droneCost),
                round2(courierCo2 - droneCo2));
    }

    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static ZoneConflict conflict(RestrictedZone z, ZoneResolution resolution, String direction,
                                         Double detourKm, double closestKm, String endpoint) {
        return new ZoneConflict(z.id(), z.code(), z.name(), z.severity(), z.authority(), resolution,
                direction, detourKm, round1(closestKm), endpoint);
    }

    private static Vec southernPerpendicular(Vec b) {
        Vec p = new Vec(-b.y(), b.x());
        if (p.y() > 0) {
            p = p.scale(-1);
        }
        double len = p.len();
        return len == 0 ? new Vec(0, -1) : p.scale(1 / len);
    }

    private static String directionOf(Vec u) {
        if (Math.abs(u.y()) >= Math.abs(u.x())) {
            return u.y() < 0 ? "southern" : "northern";
        }
        return u.x() > 0 ? "eastern" : "western";
    }

    /** Local equirectangular projection in km, centred on the origin. Accurate for regional routes. */
    private record Projection(double lat0, double lon0, double kmPerDegLon) {
        Projection(double lat0, double lon0) {
            this(lat0, lon0, KM_PER_DEG_LON_EQUATOR * Math.cos(Math.toRadians(lat0)));
        }

        Vec toLocal(double lat, double lon) {
            return new Vec((lon - lon0) * kmPerDegLon, (lat - lat0) * KM_PER_DEG_LAT);
        }

        GeoPoint toGeo(Vec v) {
            return new GeoPoint(lat0 + v.y() / KM_PER_DEG_LAT, lon0 + v.x() / kmPerDegLon);
        }
    }

    private record Vec(double x, double y) {
        Vec add(Vec o) { return new Vec(x + o.x, y + o.y); }
        Vec sub(Vec o) { return new Vec(x - o.x, y - o.y); }
        Vec scale(double k) { return new Vec(x * k, y * k); }
        double dot(Vec o) { return x * o.x + y * o.y; }
        double len() { return Math.hypot(x, y); }
    }

    private record Waypoint(double t, Vec point) {}
}
