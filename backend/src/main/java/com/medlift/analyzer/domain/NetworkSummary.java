package com.medlift.analyzer.domain;

import java.util.List;

public record NetworkSummary(
        Facility hub,
        int totalRoutes,
        int droneFeasibleRoutes,
        int annualDroneDeliveries,
        double avgMinutesSavedPerDelivery,
        double annualHoursSaved,
        double annualCostSavingsEur,
        double annualCo2SavedTonnes,
        double flyableDayRatio,
        List<RouteSummary> routes) {}
