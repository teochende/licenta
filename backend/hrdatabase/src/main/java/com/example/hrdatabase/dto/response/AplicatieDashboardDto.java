package com.example.hrdatabase.dto.response;

public record AplicatieDashboardDto(
        Long id,
        Long postId,
        String numeCandidat,
        String email,
        String cvNumeFisier,
        String cvContinut,
        String pipelineStateJson
) {
}
