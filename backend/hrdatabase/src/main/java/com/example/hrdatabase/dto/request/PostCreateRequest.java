package com.example.hrdatabase.dto.request;

import java.util.List;

public record PostCreateRequest(
        Long departamentId,
        String subdomeniu,
        String nume,
        String nivel,
        String descriere,
        boolean enabled,
        List<Long> recrutoriIds,
        List<Long> intervievatoriIds
) {
}
