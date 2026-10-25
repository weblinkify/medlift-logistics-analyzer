package com.medlift.analyzer.domain;

import java.util.List;

public record DroneLeg(
        boolean feasible,
        double flightDistanceKm,
        double detourKm,
        double totalMinutes,
        double costEur,
        double co2Kg,
        List<DroneBlocker> blockers,
        List<ZoneConflict> zoneConflicts,
        List<GeoPoint> path) {}
