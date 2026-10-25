package com.medlift.analyzer.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param provider "mock" (default, no external calls) or "anthropic"
 * @param model    model id used by live providers
 */
@ConfigurationProperties(prefix = "medlift.ai")
public record AiProperties(
        @DefaultValue("mock") String provider,
        @DefaultValue("claude-opus-5-5") String model,
        @DefaultValue("4000") long maxTokens) {}
