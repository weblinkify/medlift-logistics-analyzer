package com.medlift.analyzer.ai;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AgentRecommendation(
        UUID analysisId,
        String summary,
        List<AgentInsight> insights,
        double confidence,
        String provider,
        String model,
        Instant generatedAt,
        long latencyMs) {}
