package com.medlift.analyzer.domain;

public record Facility(
        long id,
        String code,
        String name,
        String city,
        FacilityType type,
        double lat,
        double lon,
        boolean hasDronePad,
        int dailyShipments) {}
