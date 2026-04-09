package com.example.hrdatabase.dto.request;

import com.example.hrdatabase.entity.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UtilizatorRequestDTO(
        @NotBlank(message = "Numele de utilizator este obligatoriu")
        @Size(min = 3, max = 64, message = "Numele de utilizator trebuie să aibă între 3 și 64 de caractere")
        String numeUtilizator,

        @NotBlank(message = "Email-ul este obligatoriu")
        @Email(message = "Email invalid")
        @Size(max = 255)
        String email,

        @NotBlank(message = "Parola este obligatorie")
        @Size(min = 8, max = 255, message = "Parola trebuie să aibă cel puțin 8 caractere")
        String parola,

        @NotNull(message = "Rolul este obligatoriu")
        Rol rol,

        Long departamentId
) {
}
