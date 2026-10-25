package com.medlift.analyzer.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medlift.analyzer.domain.AnalysisResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Live provider backed by Claude. Enabled with {@code AI_PROVIDER=anthropic}; reads
 * {@code ANTHROPIC_API_KEY} from the environment. Any failure falls back to {@link MockAIAgent}
 * in {@link RouteOptimizationAgentService}.
 */
@Component
@ConditionalOnProperty(prefix = "medlift.ai", name = "provider", havingValue = "anthropic")
public class AnthropicLlmProvider implements LlmProvider {

    private static final String SYSTEM_PROMPT = """
            You are the route optimization advisor for a hospital logistics network in the \
            Helsinki-Uusimaa region of Finland. Coordinators choose between a medical delivery drone \
            and a road courier for each shipment.

            You receive a computed analysis as JSON: straight-line distance, the drone leg (flight \
            distance, planned detours around restricted airspace, blockers such as payload, range, \
            weather or missing drone pads), the courier leg, and the system's recommendation.

            Write advice a dispatcher can act on in seconds:
            - summary: one or two sentences stating the recommended mode and the key number behind it.
            - insights: the operationally relevant points, most severe first. Name airspace zones and \
            their authority, give detour distance and direction, cold-chain or custody concerns for the \
            payload, and weather or traffic effects. Use CRITICAL only for things that block a mode.
            - confidence: how sure you are that the recommended mode is right, from 0 to 1.

            Use only the numbers in the analysis. Do not invent zones, facilities or regulations.""";

    private final AnthropicClient client = AnthropicOkHttpClient.fromEnv();
    private final AiProperties properties;
    private final ObjectMapper objectMapper;

    public AnthropicLlmProvider(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "anthropic";
    }

    @Override
    public String model() {
        return properties.model();
    }

    @Override
    public LlmAdvice advise(AnalysisResult analysis) {
        StructuredMessageCreateParams<LlmAdvice> params = MessageCreateParams.builder()
                .model(properties.model())
                .maxTokens(properties.maxTokens())
                .system(SYSTEM_PROMPT)
                .outputConfig(LlmAdvice.class)
                .addUserMessage("Analysis:\n" + toJson(analysis))
                // Server-side refusal fallback: the API re-runs a declined request on a recommended model.
                .putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
                .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
                .build();

        StructuredMessage<LlmAdvice> response = client.messages().create(params);
        if (response.stopReason().map(StopReason.REFUSAL::equals).orElse(false)) {
            throw new IllegalStateException("Model declined the request");
        }
        return response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(text -> text.text())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Model returned no structured output"));
    }

    private String toJson(AnalysisResult analysis) {
        try {
            return objectMapper.writeValueAsString(analysis);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
