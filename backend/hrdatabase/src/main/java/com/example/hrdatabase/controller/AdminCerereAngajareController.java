package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.CerereIntervievatoriReplaceRequest;
import com.example.hrdatabase.entity.CerereAngajare;
import com.example.hrdatabase.service.CerereAngajareService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/cereri-angajare")
@PreAuthorize("@perm.isAdmin()")
public class AdminCerereAngajareController {

    private final CerereAngajareService cerereAngajareService;

    public AdminCerereAngajareController(CerereAngajareService cerereAngajareService) {
        this.cerereAngajareService = cerereAngajareService;
    }

    @GetMapping
    public List<CerereAngajare> list() {
        return cerereAngajareService.findAll();
    }

    @PutMapping("/{id}/intervievatori-tehnici")
    public CerereAngajare replaceIntervievatori(
            @PathVariable Long id,
            @RequestBody CerereIntervievatoriReplaceRequest body) {
        return cerereAngajareService.replaceIntervievatoriTehnici(
                id,
                body.intervievatoriTehniciIds() != null ? body.intervievatoriTehniciIds() : List.of());
    }
}
