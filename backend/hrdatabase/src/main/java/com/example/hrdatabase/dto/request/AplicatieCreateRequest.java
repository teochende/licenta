package com.example.hrdatabase.dto.request;

public record AplicatieCreateRequest(
        Long postId,
        String numeCandidat,
        String email,
        String cvNumeFisier,
        String cvContinut,
        /** Opțional: dacă e {@code true}, se marchează flux AI pentru review CV. Implicit: {@code false}. */
        Boolean aiCvReview
) {
}
