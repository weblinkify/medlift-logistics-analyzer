package com.medlift.analyzer.api;

import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.service.LogisticsAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analyses")
public class AnalysisController {

    private final LogisticsAnalysisService service;

    public AnalysisController(LogisticsAnalysisService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnalysisResult analyze(@Valid @RequestBody AnalysisRequest request) {
        return service.analyze(request);
    }

    @GetMapping
    public List<AnalysisResult> recent(@RequestParam(defaultValue = "10") int limit) {
        return service.recentAnalyses(limit);
    }

    @GetMapping("/{id}")
    public AnalysisResult get(@PathVariable UUID id) {
        return service.getAnalysis(id);
    }
}
