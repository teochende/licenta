package com.example.hrdatabase.dto.response;

/**
 * Rezultat pentru recalculare scor matching.
 */
public record RecalcMatchScoreResultDto(
        int processed,
        int updated,
        int skippedAi,
        int skippedNoText
) {
}

