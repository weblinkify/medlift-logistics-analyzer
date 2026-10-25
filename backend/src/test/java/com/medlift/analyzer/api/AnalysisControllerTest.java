package com.medlift.analyzer.api;

import com.medlift.analyzer.domain.AnalysisRequest;
import com.medlift.analyzer.domain.AnalysisResult;
import com.medlift.analyzer.service.LogisticsAnalysisService;
import com.medlift.analyzer.service.LogisticsCalculator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static com.medlift.analyzer.Fixtures.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AnalysisController.class, properties = "medlift.cors.allowed-origins=http://localhost:5173")
class AnalysisControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private LogisticsAnalysisService service;

    @Test
    void createsAnalysis() throws Exception {
        AnalysisResult result = LogisticsCalculator.analyze(MEILAHTI, HYVINKAA, ZONES, request(MEILAHTI, HYVINKAA));
        when(service.analyze(any(AnalysisRequest.class))).thenReturn(result);

        mvc.perform(post("/api/v1/analyses").contentType(MediaType.APPLICATION_JSON).content("""
                        {"originId":1,"destinationId":8,"payloadType":"LAB_SAMPLES","payloadKg":2.0,
                         "priority":"URGENT","weather":"CLEAR","timeWindow":"DAYTIME"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recommendation").value("DRONE"))
                .andExpect(jsonPath("$.drone.zoneConflicts[0].zoneCode").exists());
    }

    @Test
    void rejectsInvalidPayload() throws Exception {
        mvc.perform(post("/api/v1/analyses").contentType(MediaType.APPLICATION_JSON).content("""
                        {"originId":1,"destinationId":8,"payloadType":"LAB_SAMPLES","payloadKg":0,
                         "priority":"URGENT","weather":"CLEAR","timeWindow":"DAYTIME"}"""))
                .andExpect(status().isBadRequest());
    }
}
