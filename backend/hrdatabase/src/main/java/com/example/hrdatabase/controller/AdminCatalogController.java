package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.response.RolMetaDto;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Candidat;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.service.AplicatieService;
import com.example.hrdatabase.service.CandidatService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Vizibilitate agregată pentru administrator (date care nu au încă API public dedicat).
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("@perm.isAdmin()")
public class AdminCatalogController {

    private final AplicatieService aplicatieService;
    private final CandidatService candidatService;

    public AdminCatalogController(AplicatieService aplicatieService, CandidatService candidatService) {
        this.aplicatieService = aplicatieService;
        this.candidatService = candidatService;
    }

    /** Roluri disponibile pentru creare/editare utilizatori (evită /api/hr/* — conflict posibil cu Spring Data REST). */
    @GetMapping("/roluri")
    public List<RolMetaDto> listRoluri() {
        return Arrays.stream(Rol.values())
                .map(r -> new RolMetaDto(r.name(), denumireRol(r)))
                .sorted(Comparator.comparing(RolMetaDto::cod))
                .toList();
    }

    private static String denumireRol(Rol rol) {
        return switch (rol) {
            case ADMIN -> "Administrator";
            case INTERVIEVATOR_TEHNIC -> "Intervievator tehnic";
            case RECRUTOR -> "Recrutor";
            case MANAGER_RECRUTARE -> "Manager recrutare";
            case MANAGER_DEPARTAMENT -> "Manager departament";
            case GUEST -> "Invitat (în așteptare)";
        };
    }

    @GetMapping("/aplicatii")
    public List<Aplicatie> listAplicatii() {
        return aplicatieService.findAll();
    }

    @GetMapping("/candidati")
    public List<Candidat> listCandidati() {
        return candidatService.findAll();
    }
}
