package com.example.hrdatabase.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Răspuns JSON de la modulul FastAPI {@code POST /analyze-video}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiEnglishVideoApiResponse(
        @JsonProperty("english_score") int englishScore,
        @JsonProperty("cefr_level") String cefrLevel,
        @JsonProperty("pronunciation_feedback") String pronunciationFeedback,
        @JsonProperty("fluency_feedback") String fluencyFeedback,
        @JsonProperty("grammar_feedback") String grammarFeedback,
        @JsonProperty("vocabulary_feedback") String vocabularyFeedback,
        @JsonProperty("clarity_feedback") String clarityFeedback,
        @JsonProperty("performance_status") String performanceStatus,
        @JsonProperty("hiring_verdict") String hiringVerdict,
        @JsonProperty("tooltip_summary") String tooltipSummary
) {
}
