package com.example.hrdatabase.dto.response;

import java.util.List;

public record CerereAngajareViewDto(
        Long id,
        String numePost,
        String descriere,
        int nrPozitii,
        String departament,
        String status,
        List<String> intervievatoriTehnici
) {
}
