package com.example.hrdatabase.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Răspuns JSON de la POST /analyze (modul_ai_cv_review).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiCvAnalyzeResponse(
        @JsonProperty("score") int score,
        @JsonProperty("matching_skills") List<String> matchingSkills,
        @JsonProperty("missing_skills") List<String> missingSkills,
        @JsonProperty("recommendation") String recommendation
) {
}
