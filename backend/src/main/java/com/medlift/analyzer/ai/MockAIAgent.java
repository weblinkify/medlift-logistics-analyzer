package com.medlift.analyzer.ai;

import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.domain.BlockerCode;
import com.medlift.analyzer.domain.DroneBlocker;
import com.medlift.analyzer.domain.PayloadType;
import com.medlift.analyzer.domain.Recommendation;
import com.medlift.analyzer.domain.TimeWindow;
import com.medlift.analyzer.domain.ZoneConflict;
import com.medlift.analyzer.domain.ZoneResolution;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Deterministic, rule-based stand-in for an LLM. Produces the same shape of advice a live model
 * would, with zero API cost — the default for demos and evaluation.
 *
 * <p>Mirrors {@code frontend/src/ai/MockAIAgent.ts}.
 */
@Component
public class MockAIAgent implements LlmProvider {

    public static final String MODEL = "medlift-route-advisor-mock-v1";

    @Override
    public String name() {
        return "mock";
    }

    @Override
    public String model() {
        return MODEL;
    }

    @Override
    public LlmAdvice advise(AnalysisResult a) {
        AnalysisRequest req = a.request();
        List<AgentInsight> insights = new ArrayList<>();

        for (DroneBlocker b : a.drone().blockers()) {
            insights.add(new AgentInsight(InsightSeverity.CRITICAL, "Drone dispatch blocked",
                    b.message() + ". " + blockerAdvice(b.code(), a)));
        }

        for (ZoneConflict z : a.drone().zoneConflicts()) {
            switch (z.resolution()) {
                case DETOUR -> insights.add(new AgentInsight(InsightSeverity.WARNING,
                        "Airspace conflict: " + z.zoneName(),
                        String.format(Locale.US,
                                "Warning: Direct line passes through %s airspace restriction zone; recommending %s km %s detour.",
                                z.zoneName(), fmt1(Math.max(0.1, z.detourKm())), z.detourDirection())));
                case AUTHORIZATION_REQUIRED -> {
                    String site = "origin".equals(z.endpoint()) ? a.origin().name() : a.destination().name();
                    insights.add(new AgentInsight(InsightSeverity.WARNING, "ATC authorisation required",
                            site + " lies inside the " + z.zoneName() + " control zone. File a UTM flight authorisation with "
                                    + z.authority() + " before launch and expect ~5 min coordination."));
                }
                case ADVISORY -> insights.add(new AgentInsight(InsightSeverity.INFO, "Advisory area: " + z.zoneName(),
                        "Route skirts " + z.zoneName() + "; hold cruise altitude at 90–120 m AGL and avoid hovering."));
                case BLOCKED -> { /* already reported as a blocker */ }
            }
        }

        if (a.drone().feasible()) {
            switch (req.weather()) {
                case WINDY -> insights.add(new AgentInsight(InsightSeverity.INFO, "Wind advisory",
                        "Gusts cut effective cruise speed by 15%; battery reserve policy raised to 30%."));
                case RAIN -> insights.add(new AgentInsight(InsightSeverity.INFO, "Light rain",
                        "IP54-rated airframes cleared for rain; ETA padded by 10%."));
                case SNOW -> insights.add(new AgentInsight(InsightSeverity.INFO, "Winter operations",
                        "Sub-zero conditions: de-icing check before launch; cruise speed reduced 20%."));
                default -> { }
            }

            if (req.payloadType() == PayloadType.BLOOD_PRODUCTS) {
                boolean ok = a.drone().totalMinutes() <= 30;
                insights.add(new AgentInsight(ok ? InsightSeverity.SUCCESS : InsightSeverity.WARNING, "Cold chain",
                        ok ? String.format(Locale.US,
                                "Cold-chain window maintained: %s min door-to-door keeps blood products within the 2–6 °C envelope.",
                                fmt1(a.drone().totalMinutes()))
                           : String.format(Locale.US,
                                "Flight of %s min exceeds the 30 min passive-cooling window; use an active-cooled pod.",
                                fmt1(a.drone().totalMinutes()))));
            } else if (req.payloadType() == PayloadType.PHARMACEUTICALS) {
                insights.add(new AgentInsight(InsightSeverity.INFO, "Chain of custody",
                        "Use a tamper-evident sealed pod for controlled pharmaceuticals; custody log is attached automatically."));
            }

            if (req.timeWindow() == TimeWindow.PEAK) {
                insights.add(new AgentInsight(InsightSeverity.INFO, "Peak-hour traffic",
                        String.format(Locale.US,
                                "Road congestion inflates courier ETA by 55%%; drone advantage widens to %s min.",
                                fmt1(a.timeSavedMinutes()))));
            }
        }

        if (a.straightLineKm() < 2) {
            insights.add(new AgentInsight(InsightSeverity.INFO, "Short hop",
                    String.format(Locale.US,
                            "Facilities are only %s km apart; for routine loads an in-house porter or pneumatic tube is cheapest.",
                            fmt1(a.straightLineKm()))));
        }

        if (a.drone().feasible()) {
            if (a.costDeltaEur() >= 0) {
                insights.add(new AgentInsight(InsightSeverity.SUCCESS, "Economics",
                        String.format(Locale.US,
                                "Drone saves %s min, €%.2f and %.2f kg CO₂ per delivery versus road courier.",
                                fmt1(a.timeSavedMinutes()), a.costDeltaEur(), a.co2SavedKg())));
            } else {
                insights.add(new AgentInsight(InsightSeverity.INFO, "Economics",
                        String.format(Locale.US,
                                "Drone is %s min faster but €%.2f more expensive; batched courier wins on cost for routine loads.",
                                fmt1(a.timeSavedMinutes()), -a.costDeltaEur())));
            }
        }

        return new LlmAdvice(summary(a), insights, confidence(a));
    }

    private static String summary(AnalysisResult a) {
        String route = a.origin().name() + " → " + a.destination().name();
        if (a.recommendation() == Recommendation.DRONE) {
            String detour = a.drone().detourKm() >= 0.1
                    ? String.format(Locale.US, ", including a %s km detour around restricted airspace", fmt1(a.drone().detourKm()))
                    : "";
            return String.format(Locale.US, "Recommend drone dispatch for %s: ETA %s min vs %s min by road%s.",
                    route, fmt1(a.drone().totalMinutes()), fmt1(a.courier().totalMinutes()), detour);
        }
        if (!a.drone().feasible()) {
            String reason = a.drone().blockers().get(0).message().toLowerCase(Locale.ROOT);
            return String.format(Locale.US, "Recommend road courier for %s: drone dispatch blocked (%s). Courier ETA %s min.",
                    route, reason, fmt1(a.courier().totalMinutes()));
        }
        return String.format(Locale.US,
                "Recommend batched road courier for %s: €%.2f cheaper for this routine load; a drone would save %s min.",
                route, -a.costDeltaEur(), fmt1(a.timeSavedMinutes()));
    }

    private static double confidence(AnalysisResult a) {
        if (!a.drone().feasible()) {
            return 0.97;
        }
        long conflicts = a.drone().zoneConflicts().stream()
                .filter(z -> z.resolution() != ZoneResolution.ADVISORY).count();
        double c = 0.93 - 0.05 * conflicts - (a.request().weather().name().equals("CLEAR") ? 0 : 0.04);
        return Math.round(Math.max(0.6, c) * 100) / 100.0;
    }

    private static String blockerAdvice(BlockerCode code, AnalysisResult a) {
        return switch (code) {
            case PAYLOAD_LIMIT -> String.format(Locale.US, "Split the consignment across %d drone sorties or dispatch a courier.",
                    (int) Math.ceil(a.request().payloadKg() / 5.0));
            case RANGE_LIMIT -> "Stage via an intermediate hospital pad or dispatch a courier.";
            case WEATHER_GROUNDED -> "Courier dispatched as contingency; re-evaluate when the weather window opens.";
            case NO_DRONE_PAD -> "Land at the nearest certified pad and hand off by porter, or dispatch a courier.";
            case PROHIBITED_ZONE -> "No flight path is permissible; dispatch a courier.";
        };
    }

    private static String fmt1(double v) {
        return String.format(Locale.US, "%.1f", v);
    }
}
