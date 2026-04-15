package com.example.hrdatabase.dto.response;

import java.util.List;

public record PostViewDto(
        Long id,
        Long departamentId,
        String domeniu,
        String subdomeniu,
        String nume,
        String nivel,
        String descriere,
        /** Numele fișierului încărcat (pdf/docx), dacă există. */
        String descriereFisierNume,
        boolean descriereFisierStocat,
        boolean enabled,
        /** critic | mare | medie | mica */
        String prioritate,
        int ordineDashboard,
        List<String> assignedRecrutori,
        List<String> assignedIntervievatori
) {
}
