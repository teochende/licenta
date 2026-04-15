package com.example.hrdatabase.dto.request;

import java.util.List;

/**
 * Înlocuiește complet listele de recrutori / intervievatori tehnici atribuiți unui post.
 */
public record PostAssignmentsReplaceRequest(
        List<Long> recrutoriIds,
        List<Long> intervievatoriIds
) {
}
