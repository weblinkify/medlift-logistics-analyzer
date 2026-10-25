package com.medlift.analyzer.domain;

public record CourierLeg(
        double roadDistanceKm,
        double dispatchMinutes,
        double driveMinutes,
        double totalMinutes,
        double costEur,
        double co2Kg) {}
