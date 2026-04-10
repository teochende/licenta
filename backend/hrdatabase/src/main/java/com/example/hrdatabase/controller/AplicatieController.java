package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.AplicatieCreateRequest;
import com.example.hrdatabase.dto.request.AplicatiePipelinePatchRequest;
import com.example.hrdatabase.dto.response.AplicatieDashboardDto;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.AplicatieService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aplicatii")
public class AplicatieController {

    private final AplicatieService aplicatieService;

    public AplicatieController(AplicatieService aplicatieService) {
        this.aplicatieService = aplicatieService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Aplicatie createPublic(@Valid @RequestBody AplicatieCreateRequest request) {
        return aplicatieService.savePublicApplication(request);
    }

    @GetMapping("/dashboard")
    public List<AplicatieDashboardDto> listDashboard(@AuthenticationPrincipal Utilizator utilizator) {
        return aplicatieService.findDashboardFor(utilizator);
    }

    @PatchMapping("/{id}/pipeline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void patchPipeline(
            @PathVariable Long id,
            @Valid @RequestBody AplicatiePipelinePatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        aplicatieService.updatePipeline(id, request, utilizator);
    }
}
