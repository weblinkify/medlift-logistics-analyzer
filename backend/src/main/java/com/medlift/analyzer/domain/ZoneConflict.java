package com.medlift.analyzer.domain;

/**
 * @param detourDirection "northern" | "southern" | "eastern" | "western" when resolution is DETOUR
 * @param detourKm extra flight distance caused by this zone alone (DETOUR only)
 * @param closestApproachKm distance from the zone centre to the direct line
 * @param endpoint "origin" | "destination" when the zone contains an endpoint
 */
public record ZoneConflict(
        long zoneId,
        String zoneCode,
        String zoneName,
        ZoneSeverity severity,
        String authority,
        ZoneResolution resolution,
        String detourDirection,
        Double detourKm,
        double closestApproachKm,
        String endpoint) {}
