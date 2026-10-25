package com.medlift.analyzer.ai;

import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.service.LogisticsCalculator;
import org.junit.jupiter.api.Test;

import static com.medlift.analyzer.Fixtures.*;
import static org.assertj.core.api.Assertions.assertThat;

class MockAIAgentTest {

    private final MockAIAgent agent = new MockAIAgent();

    @Test
    void explainsAirspaceDetourInNaturalLanguage() {
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, HYVINKAA, ZONES, request(MEILAHTI, HYVINKAA));
        LlmAdvice advice = agent.advise(r);

        assertThat(advice.summary()).startsWith("Recommend drone dispatch");
        assertThat(advice.insights()).anySatisfy(i -> {
            assertThat(i.severity()).isEqualTo(InsightSeverity.WARNING);
            assertThat(i.detail()).contains("Direct line passes through Helsinki-Vantaa (EFHK) airspace restriction zone")
                    .contains("western detour");
        });
        assertThat(advice.confidence()).isBetween(0.6, 1.0);
    }

    @Test
    void blockedRouteRecommendsCourierWithCriticalInsight() {
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, TOOLO, ZONES, request(MEILAHTI, TOOLO));
        LlmAdvice advice = agent.advise(r);

        assertThat(advice.summary()).startsWith("Recommend road courier");
        assertThat(advice.insights().get(0).severity()).isEqualTo(InsightSeverity.CRITICAL);
    }
}
