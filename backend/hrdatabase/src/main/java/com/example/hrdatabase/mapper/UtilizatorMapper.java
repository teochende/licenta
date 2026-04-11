package com.example.hrdatabase.mapper;

import com.example.hrdatabase.dto.request.UtilizatorRequestDTO;
import com.example.hrdatabase.dto.response.UtilizatorResponseDTO;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;

public final class UtilizatorMapper {

    private UtilizatorMapper() {
    }

    /**
     * Parola în clar nu este păstrată în entitate: folosiți un placeholder gol; serviciul setează hash BCrypt înainte de persistare.
     */
    public static Utilizator toEntity(UtilizatorRequestDTO dto, Departament departament) {
        return new Utilizator(dto.numeUtilizator(), dto.email(), "", dto.rol(), departament);
    }

    public static UtilizatorResponseDTO toResponse(Utilizator utilizator) {
        Rol rol = utilizator.getRol();
        Rol rolDorit = utilizator.getRolDorit();
        Departament departament = utilizator.getDepartament();
        return new UtilizatorResponseDTO(
                utilizator.getId(),
                utilizator.getNumeUtilizator(),
                utilizator.getEmail(),
                rol != null ? rolCodApi(rol) : null,
                rol != null ? rolDenumire(rol) : null,
                rolDorit != null ? rolCodApi(rolDorit) : null,
                rolDorit != null ? rolDenumire(rolDorit) : null,
                departament != null ? departament.getId() : null,
                departament != null ? departament.getNume() : null
        );
    }

    /** Aliniat cu valorile din frontend (ex.: intervievator_tehnic). */
    private static String rolCodApi(Rol rol) {
        return rol.name().toLowerCase();
    }

    private static String rolDenumire(Rol rol) {
        return switch (rol) {
            case ADMIN -> "Administrator";
            case INTERVIEVATOR_TEHNIC -> "Intervievator tehnic";
            case RECRUTOR -> "Recrutor";
            case MANAGER_RECRUTARE -> "Manager recrutare";
            case MANAGER_DEPARTAMENT -> "Manager departament";
            case GUEST -> "Invitat (în așteptare)";
        };
    }
}
