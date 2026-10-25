package com.medlift.analyzer.repository;

import com.medlift.analyzer.domain.AnalysisResult;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "analysis_run")
public class AnalysisRunEntity {

    @Id
    private UUID id;

    @Column(name = "origin_id")
    private Long originId;
    @Column(name = "destination_id")
    private Long destinationId;
    @Column(name = "payload_type")
    private String payloadType;
    @Column(name = "payload_kg")
    private double payloadKg;
    private String priority;
    private String weather;
    @Column(name = "time_window")
    private String timeWindow;

    @Column(name = "straight_line_km")
    private double straightLineKm;
    @Column(name = "drone_feasible")
    private boolean droneFeasible;
    @Column(name = "drone_distance_km")
    private double droneDistanceKm;
    @Column(name = "drone_minutes")
    private double droneMinutes;
    @Column(name = "drone_cost_eur")
    private double droneCostEur;
    @Column(name = "courier_distance_km")
    private double courierDistanceKm;
    @Column(name = "courier_minutes")
    private double courierMinutes;
    @Column(name = "courier_cost_eur")
    private double courierCostEur;
    private String recommendation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_payload", columnDefinition = "jsonb")
    private String resultPayload;

    @Column(name = "created_at")
    private Instant createdAt;

    protected AnalysisRunEntity() {}

    public static AnalysisRunEntity from(AnalysisResult r, String payloadJson) {
        AnalysisRunEntity e = new AnalysisRunEntity();
        e.id = r.id();
        e.originId = r.origin().id();
        e.destinationId = r.destination().id();
        e.payloadType = r.request().payloadType().name();
        e.payloadKg = r.request().payloadKg();
        e.priority = r.request().priority().name();
        e.weather = r.request().weather().name();
        e.timeWindow = r.request().timeWindow().name();
        e.straightLineKm = r.straightLineKm();
        e.droneFeasible = r.drone().feasible();
        e.droneDistanceKm = r.drone().flightDistanceKm();
        e.droneMinutes = r.drone().totalMinutes();
        e.droneCostEur = r.drone().costEur();
        e.courierDistanceKm = r.courier().roadDistanceKm();
        e.courierMinutes = r.courier().totalMinutes();
        e.courierCostEur = r.courier().costEur();
        e.recommendation = r.recommendation().name();
        e.resultPayload = payloadJson;
        e.createdAt = r.createdAt();
        return e;
    }

    public String getResultPayload() {
        return resultPayload;
    }
}
