package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotNull;

public record AplicatieReviewEnglezaAutomatPatchRequest(
        @NotNull Boolean reviewEnglezaAutomat
) {
}
