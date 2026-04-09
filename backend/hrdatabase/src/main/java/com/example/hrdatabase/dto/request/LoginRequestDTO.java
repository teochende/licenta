package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequestDTO(
        @NotBlank(message = "Email-ul este obligatoriu")
        @Email(message = "Email invalid")
        String email,

        @NotBlank(message = "Parola este obligatorie")
        String parola
) {
}
