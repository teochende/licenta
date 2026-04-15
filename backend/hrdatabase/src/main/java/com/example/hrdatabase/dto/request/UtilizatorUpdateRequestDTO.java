package com.example.hrdatabase.dto.request;

import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.validation.HrsimEmailDomain;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Actualizare parțială: câmpurile {@code null} nu modifică valoarea din baza de date.
 * Pentru parolă: dacă lipsește sau e goală, hash-ul existent rămâne neschimbat (fără re-criptare).
 */
public record UtilizatorUpdateRequestDTO(
        @Size(min = 3, max = 64, message = "Numele de utilizator trebuie să aibă între 3 și 64 de caractere")
        String numeUtilizator,

        @Email(message = "Email invalid")
        @HrsimEmailDomain
        @Size(max = 255)
        String email,

        Rol rol,

        Long departamentId,

        /** Dacă {@code true}, se șterge legătura la departament (ignoră {@code departamentId}). */
        Boolean clearDepartament,

        @Size(min = 8, max = 255, message = "Parola trebuie să aibă cel puțin 8 caractere")
        String parola
) {
}
