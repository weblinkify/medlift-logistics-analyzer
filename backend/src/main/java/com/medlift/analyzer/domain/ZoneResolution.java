package com.medlift.analyzer.domain;

/** How the planner handled a restricted zone that intersects the direct flight line. */
public enum ZoneResolution { DETOUR, AUTHORIZATION_REQUIRED, BLOCKED, ADVISORY }
