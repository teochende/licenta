package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartamentUpdateRequest(
        @NotBlank @Size(max = 128) String nume
) {
}
