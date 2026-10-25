package com.medlift.analyzer.domain;

public enum TimeWindow {
    OFF_PEAK(1.0),
    DAYTIME(1.2),
    PEAK(1.55);

    /** Multiplier on free-flow road driving time. */
    public final double trafficFactor;

    TimeWindow(double trafficFactor) {
        this.trafficFactor = trafficFactor;
    }
}
