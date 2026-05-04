package com.example.hrdatabase.dto.response;

import java.time.Instant;

public record AplicatieDashboardDto(
        Long id,
        Long postId,
        String numeCandidat,
        String email,
        String cvNumeFisier,
        boolean cvFisierStocat,
        String videoNumeFisier,
        boolean videoFisierStocat,
        Instant dataAplicare,
        String cvContinut,
        boolean aiCvReview,
        Integer cvJobMatchScore,
        Integer aiCvMatchScore,
        String aiCvObservatii,
        String aiCvConcluzii,
        boolean vizibilIntervievatoriTehnic,
        String pipelineStateJson,
        boolean reviewEnglezaAutomat,
        Integer englezaAiScore,
        String englezaAiPerformanceStatus,
        String englezaAiVerdict,
        String englezaAiSummary,
        String englezaAiTooltipSummary,
        String englezaAiError,
        Instant englezaAiAnalyzedAt
) {
}
