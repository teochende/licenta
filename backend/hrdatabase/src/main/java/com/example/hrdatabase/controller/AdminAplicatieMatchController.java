package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.response.RecalcMatchScoreResultDto;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.AplicatieService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Operații administrative pentru aplicări (recalcule scor matching CV ↔ job).
 */
@RestController
@RequestMapping("/api/admin/aplicatii")
@PreAuthorize("@perm.isAdmin() or hasRole('MANAGER_RECRUTARE')")
public class AdminAplicatieMatchController {

    private final AplicatieService aplicatieService;

    public AdminAplicatieMatchController(AplicatieService aplicatieService) {
        this.aplicatieService = aplicatieService;
    }

    /**
     * Recalculează scorul pentru o aplicare existentă.
     * @param force dacă {@code true}, recalculează chiar dacă există deja un scor.
     */
    @PostMapping("/{id}/recalc-match-score")
    public RecalcMatchScoreResultDto recalcOne(
            @PathVariable Long id,
            @RequestParam(value = "force", required = false, defaultValue = "false") boolean force,
            @AuthenticationPrincipal Utilizator utilizator) {
        return aplicatieService.recalcMatchScoreForAplicatie(id, force, utilizator);
    }

    /**
     * Recalculează scorul pentru aplicările existente.
     * @param onlyMissing dacă {@code true}, recalculează doar unde scorul lipsește (NULL).
     */
    @PostMapping("/recalc-match-score")
    public RecalcMatchScoreResultDto recalcAll(
            @RequestParam(value = "onlyMissing", required = false, defaultValue = "true") boolean onlyMissing,
            @AuthenticationPrincipal Utilizator utilizator) {
        return aplicatieService.recalcMatchScoreForAll(onlyMissing, utilizator);
    }
}

