package com.medlift.analyzer.api;

import com.medlift.analyzer.domain.Facility;
import com.medlift.analyzer.domain.NetworkSummary;
import com.medlift.analyzer.domain.RestrictedZone;
import com.medlift.analyzer.service.LogisticsAnalysisService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class FacilityController {

    private final LogisticsAnalysisService service;

    public FacilityController(LogisticsAnalysisService service) {
        this.service = service;
    }

    @GetMapping("/facilities")
    public List<Facility> facilities() {
        return service.listFacilities();
    }

    @GetMapping("/restricted-zones")
    public List<RestrictedZone> restrictedZones() {
        return service.listZones();
    }

    @GetMapping("/network/summary")
    public NetworkSummary networkSummary() {
        return service.networkSummary();
    }
}
