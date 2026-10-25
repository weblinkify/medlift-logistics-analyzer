package com.medlift.analyzer.api;

import com.medlift.analyzer.ai.AgentRecommendation;
import com.medlift.analyzer.ai.RouteOptimizationAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    public record RecommendationRequest(@NotNull UUID analysisId) {}

    private final RouteOptimizationAgentService agent;

    public AgentController(RouteOptimizationAgentService agent) {
        this.agent = agent;
    }

    @PostMapping("/recommendations")
    public AgentRecommendation recommend(@Valid @RequestBody RecommendationRequest request) {
        return agent.recommend(request.analysisId());
    }
}
