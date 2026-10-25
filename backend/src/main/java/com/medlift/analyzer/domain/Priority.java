package com.medlift.analyzer.domain;

public enum Priority {
    ROUTINE(30, 0.55),
    URGENT(15, 1.25),
    STAT(8, 1.6);

    /** Minutes until a road courier is on the way. */
    public final double courierDispatchMinutes;
    /** ROUTINE runs are batched on shared courier routes; STAT is a dedicated vehicle. */
    public final double courierCostMultiplier;

    Priority(double courierDispatchMinutes, double courierCostMultiplier) {
        this.courierDispatchMinutes = courierDispatchMinutes;
        this.courierCostMultiplier = courierCostMultiplier;
    }
}
