package com.medlift.analyzer.domain;

public enum Weather {
    CLEAR(1.0, 1.0, true),
    WINDY(0.85, 1.0, true),
    RAIN(0.9, 1.1, true),
    SNOW(0.8, 1.3, true),
    STORM(0.7, 1.25, false);

    public final double droneSpeedFactor;
    public final double roadTimeFactor;
    public final boolean droneFlyable;

    Weather(double droneSpeedFactor, double roadTimeFactor, boolean droneFlyable) {
        this.droneSpeedFactor = droneSpeedFactor;
        this.roadTimeFactor = roadTimeFactor;
        this.droneFlyable = droneFlyable;
    }
}
