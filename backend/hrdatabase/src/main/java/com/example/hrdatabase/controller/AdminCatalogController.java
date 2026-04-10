package com.example.hrdatabase.controller;

import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Candidat;
import com.example.hrdatabase.service.AplicatieService;
import com.example.hrdatabase.service.CandidatService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/aplicatii")
    public List<Aplicatie> listAplicatii() {
        return aplicatieService.findAll();
    }

    @GetMapping("/candidati")
    public List<Candidat> listCandidati() {
        return candidatService.findAll();
    }
}
