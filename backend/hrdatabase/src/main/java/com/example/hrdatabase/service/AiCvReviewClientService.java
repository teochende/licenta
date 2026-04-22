package com.example.hrdatabase.service;

import com.example.hrdatabase.config.AiCvReviewProperties;
import com.example.hrdatabase.dto.ai.AiCvAnalyzeResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Optional;

/**
 * Client HTTP către modulul FastAPI {@code modul_ai_cv_review} (endpoint {@code /analyze}).
 */
@Service
public class AiCvReviewClientService {

    private static final Logger log = LoggerFactory.getLogger(AiCvReviewClientService.class);
    private static final int MAX_TEXT_LEN = 12000;

    private final RestClient aiCvReviewRestClient;
    private final AiCvReviewProperties properties;

    public AiCvReviewClientService(RestClient aiCvReviewRestClient, AiCvReviewProperties properties) {
        this.aiCvReviewRestClient = aiCvReviewRestClient;
        this.properties = properties;
    }

    /**
     * Apelează analiza AI; goale dacă modulul este dezactivat sau textele lipsesc.
     */
    public Optional<AiCvAnalyzeResponse> analyze(String cvText, String jobText) {
        if (!properties.isEnabled()) {
            log.info("ai.cv.review.enabled=false — sar analiza AI.");
            return Optional.empty();
        }
        String cv = truncateForApi(cvText);
        String job = truncateForApi(jobText);
        if (cv.isEmpty() || job.isEmpty()) {
            log.warn("Analiza AI sărită: text CV sau job gol după trunchiere.");
            return Optional.empty();
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("cv_text", cv);
        form.add("job_text", job);
        try {
            AiCvAnalyzeResponse body = aiCvReviewRestClient
                    .post()
                    .uri("/analyze")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(AiCvAnalyzeResponse.class);
            return Optional.ofNullable(body);
        } catch (RestClientException e) {
            log.warn("Eroare la apelul modulului AI CV review: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String truncateForApi(String s) {
        if (s == null) {
            return "";
        }
        String t = s.strip();
        if (t.length() <= MAX_TEXT_LEN) {
            return t;
        }
        return t.substring(0, MAX_TEXT_LEN);
    }

    public static String formatObservatii(AiCvAnalyzeResponse r) {
        if (r == null) {
            return null;
        }
        List<String> m = r.matchingSkills() != null ? r.matchingSkills() : List.of();
        List<String> miss = r.missingSkills() != null ? r.missingSkills() : List.of();
        StringBuilder sb = new StringBuilder();
        if (!m.isEmpty()) {
            sb.append("Competențe / elemente potrivite: ").append(String.join(", ", m));
        }
        if (!miss.isEmpty()) {
            if (!sb.isEmpty()) {
                sb.append("\n\n");
            }
            sb.append("Lacune sau competențe de completat: ").append(String.join(", ", miss));
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    public static int clampScore(int score) {
        return Math.max(0, Math.min(100, score));
    }
}
