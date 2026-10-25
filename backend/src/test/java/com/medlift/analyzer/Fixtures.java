package com.medlift.analyzer;

import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.Facility;
import com.medlift.analyzer.domain.FacilityType;
import com.medlift.analyzer.domain.PayloadType;
import com.medlift.analyzer.domain.Priority;
import com.medlift.analyzer.domain.RestrictedZone;
import com.medlift.analyzer.domain.TimeWindow;
import com.medlift.analyzer.domain.Weather;
import com.medlift.analyzer.domain.ZoneSeverity;

import java.util.List;

/** Mirrors V2__seed_helsinki_network.sql. */
public final class Fixtures {

    public static final Facility MEILAHTI = new Facility(1, "HUS-MEI", "Meilahti Tower Hospital & HUSLAB Hub", "Helsinki", FacilityType.HUB, 60.1906, 24.9036, true, 0);
    public static final Facility PEIJAS = new Facility(3, "HUS-PEI", "Peijas Hospital", "Vantaa", FacilityType.HOSPITAL, 60.3297, 25.0577, true, 12);
    public static final Facility TOOLO = new Facility(5, "HUS-TOO", "Töölö Hospital", "Helsinki", FacilityType.HOSPITAL, 60.1855, 24.9213, false, 10);
    public static final Facility HERTTONIEMI = new Facility(6, "HUS-HER", "Herttoniemi Hospital", "Helsinki", FacilityType.HOSPITAL, 60.1952, 25.0365, true, 5);
    public static final Facility HYVINKAA = new Facility(8, "HUS-HYV", "Hyvinkää Hospital", "Hyvinkää", FacilityType.HOSPITAL, 60.6270, 24.8600, true, 7);

    public static final List<RestrictedZone> ZONES = List.of(
            new RestrictedZone(1, "EFHK-CTR", "Helsinki-Vantaa (EFHK)", ZoneSeverity.RESTRICTED, 60.3172, 24.9633, 6.0, "Fintraffic ANS", null),
            new RestrictedZone(2, "EFHF", "Malmi Airfield (EFHF)", ZoneSeverity.RESTRICTED, 60.2546, 25.0428, 1.5, "Fintraffic ANS", null),
            new RestrictedZone(3, "GOV-HKI", "Helsinki Government Quarter", ZoneSeverity.PROHIBITED, 60.1695, 24.9525, 1.2, "Traficom", null),
            new RestrictedZone(4, "MIL-SANTA", "Santahamina Garrison", ZoneSeverity.PROHIBITED, 60.1500, 25.0500, 1.5, "Finnish Defence Forces", null),
            new RestrictedZone(5, "ECO-KESK", "Keskuspuisto Nature Corridor", ZoneSeverity.ADVISORY, 60.2300, 24.9200, 2.0, "City of Helsinki", null));

    public static AnalysisRequest request(Facility o, Facility d) {
        return new AnalysisRequest(o.id(), d.id(), PayloadType.LAB_SAMPLES, 2.0, Priority.URGENT, Weather.CLEAR, TimeWindow.DAYTIME);
    }

    private Fixtures() {}
}
