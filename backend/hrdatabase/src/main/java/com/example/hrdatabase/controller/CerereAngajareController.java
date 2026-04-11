package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.CerereAngajareCreateRequest;
import com.example.hrdatabase.dto.request.CerereAngajareUpdateRequest;
import com.example.hrdatabase.dto.request.CerereOpenPostRequest;
import com.example.hrdatabase.dto.response.CerereAngajareViewDto;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.CerereAngajareService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/cereri-angajare")
public class CerereAngajareController {

    private final CerereAngajareService cerereAngajareService;

    public CerereAngajareController(CerereAngajareService cerereAngajareService) {
        this.cerereAngajareService = cerereAngajareService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CerereAngajareViewDto createJson(
            @Valid @RequestBody CerereAngajareCreateRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        return cerereAngajareService.createFromManager(request, utilizator);
    }

    /**
     * Creare cerere cu suport pentru descriere manuală sau fișier (.pdf / .docx).
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CerereAngajareViewDto createMultipart(
            @RequestParam String numePost,
            @RequestParam(required = false) Integer nrPozitii,
            @RequestParam Long departamentId,
            @RequestParam(required = false) String subdomeniu,
            @RequestParam(required = false, defaultValue = "MANUAL") String descriereMod,
            @RequestParam(required = false) String descriere,
            @RequestParam(required = false) String intervievatoriTehniciIds,
            @RequestParam(required = false) String recrutoriIds,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal Utilizator utilizator) throws IOException {
        return cerereAngajareService.createFromManagerMultipart(
                numePost,
                nrPozitii,
                departamentId,
                subdomeniu,
                descriereMod,
                descriere,
                intervievatoriTehniciIds,
                recrutoriIds,
                file,
                utilizator);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public List<CerereAngajareViewDto> listPending() {
        return cerereAngajareService.findPendingViews();
    }

    /**
     * Manager departament: cererile pentru departamentul său. Administrator: toate cererile din sistem.
     */
    @GetMapping("/mele")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('ADMIN')")
    public List<CerereAngajareViewDto> listMine(@AuthenticationPrincipal Utilizator utilizator) {
        return cerereAngajareService.findMineViews(utilizator.getId());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public CerereAngajareViewDto getOne(
            @PathVariable Long id,
            @AuthenticationPrincipal Utilizator utilizator) {
        return cerereAngajareService.getCerereView(id, utilizator);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public CerereAngajareViewDto update(
            @PathVariable Long id,
            @Valid @RequestBody CerereAngajareUpdateRequest body,
            @AuthenticationPrincipal Utilizator utilizator) {
        return cerereAngajareService.updateCerere(id, body, utilizator);
    }

    @GetMapping("/{id}/fisier-descriere")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public ResponseEntity<Resource> downloadDescriereFisier(
            @PathVariable Long id,
            @AuthenticationPrincipal Utilizator utilizator) {
        Resource res = cerereAngajareService.loadDescriereFisierResource(id, utilizator);
        String name = cerereAngajareService.getDescriereFisierDownloadName(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(name, StandardCharsets.UTF_8).build());
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().headers(headers).body(res);
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
