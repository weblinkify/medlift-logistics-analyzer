package com.medlift.analyzer.service;

import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.domain.BlockerCode;
import com.medlift.analyzer.domain.DroneBlocker;
import com.medlift.analyzer.domain.Facility;
import com.medlift.analyzer.domain.FacilityType;
import com.medlift.analyzer.domain.PayloadType;
import com.medlift.analyzer.domain.Priority;
import com.medlift.analyzer.domain.Recommendation;
import com.medlift.analyzer.domain.TimeWindow;
import com.medlift.analyzer.domain.Weather;
import com.medlift.analyzer.domain.ZoneConflict;
import com.medlift.analyzer.domain.ZoneResolution;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.medlift.analyzer.Fixtures.*;
import static org.assertj.core.api.Assertions.assertThat;

class LogisticsCalculatorTest {

    @Test
    void hyvinkaaRouteDetoursAroundAirportAndFlagsNatureCorridor() {
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, HYVINKAA, ZONES, request(MEILAHTI, HYVINKAA));

        ZoneConflict airport = conflict(r, "EFHK-CTR");
        assertThat(airport.resolution()).isEqualTo(ZoneResolution.DETOUR);
        assertThat(airport.detourDirection()).isEqualTo("western");
        assertThat(airport.detourKm()).isPositive();
        assertThat(conflict(r, "ECO-KESK").resolution()).isEqualTo(ZoneResolution.ADVISORY);

        assertThat(r.drone().feasible()).isTrue();
        assertThat(r.drone().detourKm()).isPositive();
        assertThat(r.drone().flightDistanceKm()).isGreaterThan(r.straightLineKm());
        assertThat(r.drone().path()).hasSize(3);
        assertThat(r.recommendation()).isEqualTo(Recommendation.DRONE);
        assertThat(r.timeSavedMinutes()).isPositive();
    }

    @Test
    void destinationInsideControlZoneRequiresAuthorisationNotDetour() {
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, PEIJAS, ZONES, request(MEILAHTI, PEIJAS));

        ZoneConflict airport = conflict(r, "EFHK-CTR");
        assertThat(airport.resolution()).isEqualTo(ZoneResolution.AUTHORIZATION_REQUIRED);
        assertThat(airport.endpoint()).isEqualTo("destination");
        assertThat(r.drone().detourKm()).isZero();
        assertThat(r.drone().feasible()).isTrue();
    }

    @Test
    void facilityWithoutDronePadForcesCourier() {
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, TOOLO, ZONES, request(MEILAHTI, TOOLO));

        assertThat(codes(r)).containsExactly(BlockerCode.NO_DRONE_PAD);
        assertThat(r.recommendation()).isEqualTo(Recommendation.COURIER);
    }

    @Test
    void heavyPayloadAndStormAreBlockers() {
        AnalysisRequest req = new AnalysisRequest(1L, 6L, PayloadType.MEDICAL_DEVICES, 8.0,
                Priority.STAT, Weather.STORM, TimeWindow.PEAK);
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, HERTTONIEMI, ZONES, req);

        assertThat(codes(r)).containsExactly(BlockerCode.PAYLOAD_LIMIT, BlockerCode.WEATHER_GROUNDED);
        assertThat(r.recommendation()).isEqualTo(Recommendation.COURIER);
    }

    @Test
    void routineShortHopPrefersCheaperBatchedCourier() {
        Facility near = new Facility(99, "T-NEAR", "Nearby Clinic", "Helsinki", FacilityType.HOSPITAL,
                60.2000, 24.9200, true, 1);
        AnalysisRequest req = new AnalysisRequest(1L, 99L, PayloadType.LAB_SAMPLES, 1.0,
                Priority.ROUTINE, Weather.CLEAR, TimeWindow.OFF_PEAK);
        AnalysisResult r = LogisticsCalculator.analyze(MEILAHTI, near, List.of(), req);

        assertThat(r.drone().feasible()).isTrue();
        assertThat(r.drone().costEur()).isGreaterThan(r.courier().costEur());
        assertThat(r.recommendation()).isEqualTo(Recommendation.COURIER);
    }

    @Test
    void courierModelAppliesTrafficAndPriority() {
        AnalysisRequest offPeak = new AnalysisRequest(1L, 6L, PayloadType.LAB_SAMPLES, 1.0,
                Priority.STAT, Weather.CLEAR, TimeWindow.OFF_PEAK);
        AnalysisRequest peak = new AnalysisRequest(1L, 6L, PayloadType.LAB_SAMPLES, 1.0,
                Priority.STAT, Weather.CLEAR, TimeWindow.PEAK);

        double a = LogisticsCalculator.analyze(MEILAHTI, HERTTONIEMI, ZONES, offPeak).courier().driveMinutes();
        double b = LogisticsCalculator.analyze(MEILAHTI, HERTTONIEMI, ZONES, peak).courier().driveMinutes();
        assertThat(b / a).isCloseTo(1.55, org.assertj.core.data.Offset.offset(0.02));
    }

    @Test
    void haversineMatchesKnownDistance() {
        // Meilahti → Hyvinkää is roughly 48 km great-circle.
        double km = LogisticsCalculator.haversineKm(60.1906, 24.9036, 60.6270, 24.8600);
        assertThat(km).isBetween(48.0, 49.0);
    }

    private static ZoneConflict conflict(AnalysisResult r, String code) {
        return r.drone().zoneConflicts().stream().filter(z -> z.zoneCode().equals(code)).findFirst().orElseThrow();
    }

    private static List<BlockerCode> codes(AnalysisResult r) {
        return r.drone().blockers().stream().map(DroneBlocker::code).toList();
    }
}
