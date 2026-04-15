package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartamentCreateRequest(
        @NotBlank @Size(max = 128) String nume
) {
}
