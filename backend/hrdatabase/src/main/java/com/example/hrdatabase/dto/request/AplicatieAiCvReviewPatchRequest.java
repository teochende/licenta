package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotNull;

/** Activare / dezactivare Review CV AI din dashboard; la activare se apelează modulul AI. */
public record AplicatieAiCvReviewPatchRequest(@NotNull Boolean aiCvReview) {}
