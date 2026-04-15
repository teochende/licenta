package com.example.hrdatabase.dto.response;

public record UtilizatorResponseDTO(
        Long id,
        String numeUtilizator,
        String email,
        String rolCod,
        String rolDenumire,
        /** Rol solicitat la înregistrare (doar cât timp {@code rolCod} este guest). */
        String rolDoritCod,
        String rolDoritDenumire,
        Long departamentId,
        String departamentNume
) {
}
