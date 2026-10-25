package com.medlift.analyzer.ai;

import com.medlift.analyzer.domain.AnalysisResult;

/**
 * LLM abstraction layer for the AI Route Optimization Agent.
 *
 * <p>Implementations turn a computed {@link AnalysisResult} into natural-language operational
 * advice. {@link MockAIAgent} is deterministic and free; {@link AnthropicLlmProvider} calls Claude.
 */
public interface LlmProvider {

    /** Matches {@code medlift.ai.provider}. */
    String name();

    String model();

    LlmAdvice advise(AnalysisResult analysis);
}
