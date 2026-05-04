package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.AplicatieAiCvReviewPatchRequest;
import com.example.hrdatabase.dto.request.AplicatieReviewEnglezaAutomatPatchRequest;
import com.example.hrdatabase.dto.request.AplicatieCreateRequest;
import com.example.hrdatabase.dto.request.AplicatiePipelinePatchRequest;
import com.example.hrdatabase.dto.request.AplicatieVizibilitateItPatchRequest;
import com.example.hrdatabase.dto.response.AplicatieDashboardDto;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.AplicatieService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/aplicatii")
public class AplicatieController {

    private final AplicatieService aplicatieService;

    public AplicatieController(AplicatieService aplicatieService) {
        this.aplicatieService = aplicatieService;
    }

    /**
     * Aplicare publică cu fișier CV (FormData). Opțional: {@code videoFile} (videoclip, același request).
     * Singurul POST pe {@code /api/aplicatii} ca să nu existe ambiguitate cu {@code consumes} între JSON și multipart.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Aplicatie createPublicMultipart(
            @RequestParam("postId") Long postId,
            @RequestParam("numeCandidat") String numeCandidat,
            @RequestParam("email") String email,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "videoFile", required = false) MultipartFile videoFile,
            @RequestParam(value = "aiCvReview", required = false) Boolean aiCvReview) throws IOException {
        return aplicatieService.savePublicApplicationMultipart(
                postId, numeCandidat, email, file, videoFile, Boolean.TRUE.equals(aiCvReview));
    }

    /** Aplicare fără fișier pe disc (JSON) — pentru teste / integrări vechi. */
    @PostMapping(value = "/json", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Aplicatie createPublicJson(@Valid @RequestBody AplicatieCreateRequest request) {
        return aplicatieService.savePublicApplication(request);
    }

    @GetMapping("/dashboard")
    public Object listDashboard(
            @AuthenticationPrincipal Utilizator utilizator,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long postId,
            @RequestParam(required = false) String listaStatus) {
        if (page != null && size != null) {
            int p = Math.max(0, page);
            int s = Math.min(100, Math.max(1, size));
            return aplicatieService.findDashboardForPaged(utilizator, q, postId, listaStatus, p, s);
        }
        if ((q != null && !q.isBlank()) || postId != null || (listaStatus != null && !listaStatus.isBlank())) {
            return aplicatieService.findDashboardForFiltered(utilizator, q, postId, listaStatus);
        }
        return aplicatieService.findDashboardFor(utilizator);
    }

    @GetMapping("/{id}/cv-fisier")
    public ResponseEntity<Resource> getCvFisier(
            @PathVariable Long id, @AuthenticationPrincipal Utilizator utilizator) {
        return aplicatieService.getCvFileResponse(id, utilizator);
    }

    @GetMapping("/{id}/video-fisier")
    public ResponseEntity<Resource> getVideoFisier(
            @PathVariable Long id, @AuthenticationPrincipal Utilizator utilizator) {
        return aplicatieService.getVideoFileResponse(id, utilizator);
    }

    @PatchMapping("/{id}/pipeline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void patchPipeline(
            @PathVariable Long id,
            @Valid @RequestBody AplicatiePipelinePatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        aplicatieService.updatePipeline(id, request, utilizator);
    }

    @PatchMapping("/{id}/vizibilitate-intervievatori-tehnici")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void patchVizibilitateIntervievatoriTehnic(
            @PathVariable Long id,
            @Valid @RequestBody AplicatieVizibilitateItPatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        aplicatieService.updateVizibilitateIntervievatoriTehnic(id, request, utilizator);
    }

    /**
     * Dashboard: pornește sau oprește Review CV AI pentru o aplicare.
     * La {@code aiCvReview=true} se trimite CV + descriere job către modulul AI și se salvează scorul și textele.
     */
    @PatchMapping("/{id}/ai-cv-review")
    public AplicatieDashboardDto patchAiCvReview(
            @PathVariable Long id,
            @Valid @RequestBody AplicatieAiCvReviewPatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        return aplicatieService.updateAiCvReview(id, Boolean.TRUE.equals(request.aiCvReview()), utilizator);
    }

    /**
     * Review engleză din videoclip: la bifare trimite fișierul la modulul AI; rezultatele se persistă pe aplicare.
     */
    @PatchMapping("/{id}/review-engleza-automat")
    public AplicatieDashboardDto patchReviewEnglezaAutomat(
            @PathVariable Long id,
            @Valid @RequestBody AplicatieReviewEnglezaAutomatPatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) throws IOException {
        return aplicatieService.updateReviewEnglezaAutomat(
                id, Boolean.TRUE.equals(request.reviewEnglezaAutomat()), utilizator);
    }
}
