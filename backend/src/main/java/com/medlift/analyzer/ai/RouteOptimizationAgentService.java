package com.medlift.analyzer.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.repository.AgentRecommendationEntity;
import com.medlift.analyzer.repository.AgentRecommendationRepository;
import com.medlift.analyzer.service.LogisticsAnalysisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** AI Route Optimization Agent: picks the configured {@link LlmProvider} and records its advice. */
@Service
public class RouteOptimizationAgentService {

    private static final Logger log = LoggerFactory.getLogger(RouteOptimizationAgentService.class);

    private final LlmProvider provider;
    private final MockAIAgent fallback;
    private final LogisticsAnalysisService analyses;
    private final AgentRecommendationRepository recommendations;
    private final ObjectMapper objectMapper;

    public RouteOptimizationAgentService(List<LlmProvider> providers, MockAIAgent fallback, AiProperties properties,
                                         LogisticsAnalysisService analyses,
                                         AgentRecommendationRepository recommendations, ObjectMapper objectMapper) {
        this.provider = providers.stream().filter(p -> p.name().equals(properties.provider())).findFirst()
                .orElse(fallback);
        this.fallback = fallback;
        this.analyses = analyses;
        this.recommendations = recommendations;
        this.objectMapper = objectMapper;
        log.info("AI Route Optimization Agent using provider '{}' ({})", provider.name(), provider.model());
    }

    @Transactional
    public AgentRecommendation recommend(UUID analysisId) {
        AnalysisResult analysis = analyses.getAnalysis(analysisId);
        long start = System.nanoTime();
        LlmProvider used = provider;
        LlmAdvice advice;
        try {
            advice = provider.advise(analysis);
        } catch (RuntimeException e) {
            log.warn("Provider '{}' failed, falling back to mock: {}", provider.name(), e.getMessage());
            used = fallback;
            advice = fallback.advise(analysis);
        }
        long latencyMs = (System.nanoTime() - start) / 1_000_000;

        AgentRecommendation rec = new AgentRecommendation(analysisId, advice.summary(), advice.insights(),
                advice.confidence(), used.name(), used.model(), Instant.now(), latencyMs);
        recommendations.save(AgentRecommendationEntity.from(rec, toJson(rec.insights())));
        return rec;
    }

    public String activeProvider() {
        return provider.name();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
