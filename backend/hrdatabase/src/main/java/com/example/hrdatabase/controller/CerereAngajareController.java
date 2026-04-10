package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.CerereAngajareCreateRequest;
import com.example.hrdatabase.dto.request.CerereOpenPostRequest;
import com.example.hrdatabase.dto.response.CerereAngajareViewDto;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.CerereAngajareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cereri-angajare")
public class CerereAngajareController {

    private final CerereAngajareService cerereAngajareService;

    public CerereAngajareController(CerereAngajareService cerereAngajareService) {
        this.cerereAngajareService = cerereAngajareService;
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public CerereAngajareViewDto create(
            @Valid @RequestBody CerereAngajareCreateRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        return cerereAngajareService.createFromManager(request, utilizator);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public List<CerereAngajareViewDto> listPending() {
        return cerereAngajareService.findPendingViews();
    }

    @GetMapping("/mele")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT')")
    public List<CerereAngajareViewDto> listMine(@AuthenticationPrincipal Utilizator utilizator) {
        return cerereAngajareService.findMineViews(utilizator.getId());
    }

    @PostMapping("/{id}/deschide-post")
    @PreAuthorize("hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public PostViewDto openPost(
            @PathVariable Long id,
            @RequestBody(required = false) CerereOpenPostRequest body,
            @AuthenticationPrincipal Utilizator utilizator) {
        CerereOpenPostRequest req = body != null ? body : new CerereOpenPostRequest(List.of());
        return cerereAngajareService.openCerere(id, req, utilizator);
    }
}
