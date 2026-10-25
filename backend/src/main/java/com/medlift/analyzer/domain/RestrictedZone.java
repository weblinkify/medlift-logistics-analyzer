package com.medlift.analyzer.domain;

public record RestrictedZone(
        long id,
        String code,
        String name,
        ZoneSeverity severity,
        double lat,
        double lon,
        double radiusKm,
        String authority,
        String notes) {}
