package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.IntervievatoriAssignRequest;
import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.dto.request.PostDashboardOrderRequest;
import com.example.hrdatabase.dto.request.PostPatchRequest;
import com.example.hrdatabase.dto.response.PageResponse;
import com.example.hrdatabase.dto.response.PosturiDisponibileMetaDto;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.PostService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/posturi")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping("/disponibile/meta")
    public PosturiDisponibileMetaDto listPublicEnabledMeta() {
        return postService.findPublicEnabledMeta();
    }

    /**
     * Fără {@code page}/{@code size} → lista completă (compatibilitate înapoi); cu paginare → {@link PageResponse}.
     */
    @GetMapping("/disponibile")
    public Object listPublicEnabled(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String domeniu,
            @RequestParam(required = false) String subdomeniu,
            @RequestParam(required = false) String nivel) {
        if (page != null && size != null) {
            int p = Math.max(0, page);
            int s = Math.min(100, Math.max(1, size));
            return postService.findPublicEnabledDtosPaged(q, domeniu, subdomeniu, nivel, p, s);
        }
        return postService.findPublicEnabledDtos();
    }

    @GetMapping
    public Object listForCurrentUser(
            @AuthenticationPrincipal Utilizator utilizator,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) Long departamentId) {
        if (page != null && size != null) {
            int p = Math.max(0, page);
            int s = Math.min(100, Math.max(1, size));
            return postService.findPostDtosForPaged(utilizator, q, enabled, departamentId, p, s);
        }
        return postService.findPostDtosFor(utilizator);
    }

    @PostMapping
    @PreAuthorize("@perm.isAdmin() or hasRole('MANAGER_RECRUTARE')")
    public PostViewDto create(@RequestBody PostCreateRequest request) {
        return postService.save(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.isAdmin() or hasRole('MANAGER_RECRUTARE')")
    public PostViewDto updateFull(@PathVariable Long id, @RequestBody PostCreateRequest request) {
        return postService.updateFull(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.isAdmin()")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable Long id) {
        postService.deleteById(id);
    }

    @PatchMapping("/{id}")
    public PostViewDto patch(
            @PathVariable Long id,
            @Valid @RequestBody PostPatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        return postService.patchPost(id, request, utilizator);
    }

    /** Descărcare / vizualizare fișier descriere — orice utilizator cu drept de a vedea postul. */
    @GetMapping("/{id}/descriere-fisier")
    public ResponseEntity<Resource> getDescriereFisier(
            @PathVariable Long id, @AuthenticationPrincipal Utilizator utilizator) {
        return postService.getDescriereFisierResponse(id, utilizator);
    }

    /**
     * Salvează ordinea cardurilor în dashboard pentru un departament (liste complete de ID-uri, în ordinea vizuală dorită).
     */
    @PutMapping("/ordine-dashboard")
    public List<PostViewDto> putOrdineDashboard(
            @Valid @RequestBody PostDashboardOrderRequest body,
            @AuthenticationPrincipal Utilizator utilizator) {
        return postService.updateDashboardOrder(body, utilizator);
    }

    @PutMapping("/{id}/intervievatori-tehnici")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT')")
    public PostViewDto setIntervievatoriTehnici(
            @PathVariable Long id,
            @RequestBody IntervievatoriAssignRequest body,
            @AuthenticationPrincipal Utilizator utilizator) {
        return postService.setIntervievatoriForDepartmentManager(
                id,
                body != null ? body.intervievatoriIds() : null,
                utilizator);
    }
}
