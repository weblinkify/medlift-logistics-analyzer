package com.medlift.analyzer.domain;

public record RouteSummary(
        Facility destination,
        int dailyShipments,
        double straightLineKm,
        boolean droneFeasible,
        double droneMinutes,
        double courierMinutes,
        double minutesSavedPerDelivery,
        double costSavedPerDeliveryEur,
        int zoneConflicts) {}
