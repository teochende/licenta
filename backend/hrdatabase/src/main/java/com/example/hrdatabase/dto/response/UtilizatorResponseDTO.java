package com.example.hrdatabase.dto.response;

public record UtilizatorResponseDTO(
        Long id,
        String numeUtilizator,
        String email,
        String rolCod,
        String rolDenumire,
        Long departamentId,
        String departamentNume
) {
}
