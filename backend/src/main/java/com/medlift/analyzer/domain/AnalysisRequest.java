package com.medlift.analyzer.domain;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record AnalysisRequest(
        @NotNull Long originId,
        @NotNull Long destinationId,
        @NotNull PayloadType payloadType,
        @NotNull @DecimalMin(value = "0.1") @DecimalMax(value = "50.0") Double payloadKg,
        @NotNull Priority priority,
        @NotNull Weather weather,
        @NotNull TimeWindow timeWindow) {}
