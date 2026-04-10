package com.example.hrdatabase.dto.response;

import java.util.List;

public record PostViewDto(
        Long id,
        String domeniu,
        String subdomeniu,
        String nume,
        String nivel,
        String descriere,
        boolean enabled,
        List<String> assignedRecrutori,
        List<String> assignedIntervievatori
) {
}
