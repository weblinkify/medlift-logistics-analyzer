package com.medlift.analyzer.domain;

import java.time.Instant;
import java.util.UUID;

public record AnalysisResult(
        UUID id,
        Instant createdAt,
        AnalysisRequest request,
        Facility origin,
        Facility destination,
        double straightLineKm,
        DroneLeg drone,
        CourierLeg courier,
        Recommendation recommendation,
        double timeSavedMinutes,
        double costDeltaEur,
        double co2SavedKg) {}
