package com.example.hrdatabase.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Răspuns paginat generic (JSON) pentru liste cu căutare/filtrare în admin.
 */
public record PageResponse<T>(
        List<T> content,
        long totalElements,
        int page,
        int size,
        int totalPages
) {
    public static <T> PageResponse<T> fromPage(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getTotalElements(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages());
    }
}
