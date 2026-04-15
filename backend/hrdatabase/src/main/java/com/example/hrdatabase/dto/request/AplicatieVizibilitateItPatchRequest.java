package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * Recrutorul (sau admin / manager recrutare) marchează dacă intervievatorii tehnici atribuiți postului
 * pot vedea această aplicare în dashboard.
 */
public record AplicatieVizibilitateItPatchRequest(@NotNull Boolean vizibilIntervievatoriTehnic) {
}
