package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotNull;

public record DepartamentManagerAssignRequest(
        @NotNull Long utilizatorId
) {
}
