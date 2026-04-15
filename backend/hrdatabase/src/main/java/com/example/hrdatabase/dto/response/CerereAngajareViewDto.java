package com.example.hrdatabase.dto.response;

import java.util.List;

public record CerereAngajareViewDto(
        Long id,
        String numePost,
        /** Numele departamentului (domeniu). */
        String departament,
        String subdomeniu,
        String descriereMod,
        String descriere,
        boolean areFisierDescriere,
        String descriereFisierNume,
        int nrPozitii,
        String status,
        List<String> intervievatoriTehnici,
        List<Long> intervievatoriTehniciIds,
        List<String> recrutori,
        List<Long> recrutoriIds
) {
}
