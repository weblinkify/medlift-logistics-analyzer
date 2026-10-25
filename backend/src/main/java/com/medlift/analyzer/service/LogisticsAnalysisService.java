package com.medlift.analyzer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.domain.Facility;
import com.medlift.analyzer.domain.FacilityType;
import com.medlift.analyzer.domain.NetworkSummary;
import com.medlift.analyzer.domain.PayloadType;
import com.medlift.analyzer.domain.Priority;
import com.medlift.analyzer.domain.RestrictedZone;
import com.medlift.analyzer.domain.RouteSummary;
import com.medlift.analyzer.domain.TimeWindow;
import com.medlift.analyzer.domain.Weather;
import com.medlift.analyzer.repository.AnalysisRunEntity;
import com.medlift.analyzer.repository.AnalysisRunRepository;
import com.medlift.analyzer.repository.FacilityEntity;
import com.medlift.analyzer.repository.FacilityRepository;
import com.medlift.analyzer.repository.RestrictedZoneEntity;
import com.medlift.analyzer.repository.RestrictedZoneRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LogisticsAnalysisService {

    /** Share of days on which weather allows drone operations in southern Finland (demo assumption). */
    public static final double FLYABLE_DAY_RATIO = 0.88;

    private final FacilityRepository facilities;
    private final RestrictedZoneRepository zones;
    private final AnalysisRunRepository runs;
    private final ObjectMapper objectMapper;

    public LogisticsAnalysisService(FacilityRepository facilities, RestrictedZoneRepository zones,
                                    AnalysisRunRepository runs, ObjectMapper objectMapper) {
        this.facilities = facilities;
        this.zones = zones;
        this.runs = runs;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Facility> listFacilities() {
        return facilities.findAll(Sort.by("id")).stream().map(FacilityEntity::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public List<RestrictedZone> listZones() {
        return zones.findByActiveTrueOrderById().stream().map(RestrictedZoneEntity::toDomain).toList();
    }

    @Transactional
    public AnalysisResult analyze(AnalysisRequest request) {
        if (request.originId().equals(request.destinationId())) {
            throw new IllegalArgumentException("Origin and destination must be different facilities");
        }
        Facility origin = facility(request.originId());
        Facility destination = facility(request.destinationId());
        AnalysisResult result = LogisticsCalculator.analyze(origin, destination, listZones(), request);
        runs.save(AnalysisRunEntity.from(result, toJson(result)));
        return result;
    }

    @Transactional(readOnly = true)
    public AnalysisResult getAnalysis(UUID id) {
        return runs.findById(id)
                .map(e -> fromJson(e.getResultPayload()))
                .orElseThrow(() -> new NotFoundException("Analysis " + id + " not found"));
    }

    @Transactional(readOnly = true)
    public List<AnalysisResult> recentAnalyses(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return runs.findAllByOrderByCreatedAtDesc(PageRequest.of(0, size)).stream()
                .map(e -> fromJson(e.getResultPayload()))
                .toList();
    }

    /** Projects annual impact of moving hub → hospital URGENT lab-sample runs to drones. */
    @Transactional(readOnly = true)
    public NetworkSummary networkSummary() {
        List<Facility> all = listFacilities();
        List<RestrictedZone> activeZones = listZones();
        Facility hub = all.stream().filter(f -> f.type() == FacilityType.HUB).findFirst()
                .orElseThrow(() -> new NotFoundException("No hub facility configured"));

        List<RouteSummary> routes = new ArrayList<>();
        double annualMinutes = 0, annualEur = 0, annualCo2Kg = 0, weightedMinutes = 0;
        int feasibleRoutes = 0, annualDeliveries = 0;

        for (Facility dest : all) {
            if (dest.id() == hub.id()) {
                continue;
            }
            AnalysisRequest req = new AnalysisRequest(hub.id(), dest.id(), PayloadType.LAB_SAMPLES, 2.0,
                    Priority.URGENT, Weather.CLEAR, TimeWindow.DAYTIME);
            AnalysisResult r = LogisticsCalculator.analyze(hub, dest, activeZones, req);
            boolean feasible = r.drone().feasible();
            routes.add(new RouteSummary(dest, dest.dailyShipments(), r.straightLineKm(), feasible,
                    r.drone().totalMinutes(), r.courier().totalMinutes(), r.timeSavedMinutes(),
                    r.costDeltaEur(), r.drone().zoneConflicts().size()));
            if (feasible) {
                feasibleRoutes++;
                double yearly = dest.dailyShipments() * 365 * FLYABLE_DAY_RATIO;
                annualDeliveries += (int) Math.round(yearly);
                annualMinutes += yearly * r.timeSavedMinutes();
                annualEur += yearly * r.costDeltaEur();
                annualCo2Kg += yearly * r.co2SavedKg();
                weightedMinutes += dest.dailyShipments() * r.timeSavedMinutes();
            }
        }
        int feasibleDaily = routes.stream().filter(RouteSummary::droneFeasible).mapToInt(RouteSummary::dailyShipments).sum();
        double avgSaved = feasibleDaily == 0 ? 0 : weightedMinutes / feasibleDaily;

        return new NetworkSummary(hub, routes.size(), feasibleRoutes, annualDeliveries,
                LogisticsCalculator.round1(avgSaved), Math.round(annualMinutes / 60.0),
                Math.round(annualEur), LogisticsCalculator.round1(annualCo2Kg / 1000.0),
                FLYABLE_DAY_RATIO, routes);
    }

    private Facility facility(Long id) {
        return facilities.findById(id).map(FacilityEntity::toDomain)
                .orElseThrow(() -> new NotFoundException("Facility " + id + " not found"));
    }

    private String toJson(AnalysisResult result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise analysis result", e);
        }
    }

    private AnalysisResult fromJson(String json) {
        try {
            return objectMapper.readValue(json, AnalysisResult.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt analysis payload", e);
        }
    }
}
