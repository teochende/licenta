package com.example.hrdatabase.dto.request;

import java.util.List;

public record CerereAngajareCreateRequest(
        String numePost,
        String descriere,
        Integer nrPozitii,
        Long departamentId,
        /** Subdomeniu liber (ex.: Backend, Frontend). */
        String subdomeniu,
        /** {@code MANUAL} sau {@code FISIER}; dacă lipsește → MANUAL. Pentru FISIER folosiți POST multipart. */
        String descriereMod,
        String status,
        Long creatDeUtilizatorId,
        Long postDeschisId,
        List<Long> intervievatoriTehniciIds,
        List<Long> recrutoriIds
) {
}
