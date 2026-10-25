package com.medlift.analyzer.repository;

import com.medlift.analyzer.ai.AgentRecommendation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_recommendation")
public class AgentRecommendationEntity {

    @Id
    private UUID id;

    @Column(name = "analysis_id")
    private UUID analysisId;

    private String provider;
    private String model;
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String insights;

    private double confidence;

    @Column(name = "latency_ms")
    private int latencyMs;

    @Column(name = "created_at")
    private Instant createdAt;

    protected AgentRecommendationEntity() {}

    public static AgentRecommendationEntity from(AgentRecommendation r, String insightsJson) {
        AgentRecommendationEntity e = new AgentRecommendationEntity();
        e.id = UUID.randomUUID();
        e.analysisId = r.analysisId();
        e.provider = r.provider();
        e.model = r.model();
        e.summary = r.summary();
        e.insights = insightsJson;
        e.confidence = r.confidence();
        e.latencyMs = (int) r.latencyMs();
        e.createdAt = r.generatedAt();
        return e;
    }
}
