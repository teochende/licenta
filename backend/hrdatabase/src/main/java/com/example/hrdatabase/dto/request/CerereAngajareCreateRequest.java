package com.example.hrdatabase.dto.request;

import java.util.List;

public record CerereAngajareCreateRequest(
        String numePost,
        String descriere,
        Integer nrPozitii,
        Long departamentId,
        String status,
        Long creatDeUtilizatorId,
        Long postDeschisId,
        List<Long> intervievatoriTehniciIds
) {
}
