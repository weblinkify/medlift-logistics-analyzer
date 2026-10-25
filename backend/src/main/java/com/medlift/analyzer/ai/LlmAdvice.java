package com.medlift.analyzer.ai;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;

/** Provider-neutral output contract every {@link LlmProvider} must return. */
public record LlmAdvice(
        @JsonPropertyDescription("One or two sentence dispatch recommendation for the logistics coordinator")
        String summary,
        @JsonPropertyDescription("Operational insights, most severe first")
        List<AgentInsight> insights,
        @JsonPropertyDescription("Confidence in the recommendation between 0 and 1")
        double confidence) {}
