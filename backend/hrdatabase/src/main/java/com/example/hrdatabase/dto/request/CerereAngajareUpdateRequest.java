package com.example.hrdatabase.dto.request;

import java.util.List;

/**
 * Actualizare cerere (câmpuri {@code null} sunt ignorate — nu se modifică).
 */
public record CerereAngajareUpdateRequest(
        String numePost,
        String subdomeniu,
        Integer nrPozitii,
        /** Doar pentru {@code descriereMod = MANUAL} sau notă la modul fișier. */
        String descriere,
        List<Long> intervievatoriTehniciIds,
        List<Long> recrutoriIds
) {
}
