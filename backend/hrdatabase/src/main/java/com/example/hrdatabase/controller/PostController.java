package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.IntervievatoriAssignRequest;
import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.dto.request.PostPatchRequest;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.PostService;
import jakarta.validation.Valid;
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

    @GetMapping("/disponibile")
    public List<PostViewDto> listPublicEnabled() {
        return postService.findPublicEnabledDtos();
    }

    @GetMapping
    public List<PostViewDto> listForCurrentUser(@AuthenticationPrincipal Utilizator utilizator) {
        return postService.findPostDtosFor(utilizator);
    }

    @PostMapping
    @PreAuthorize("@perm.isAdmin() or hasRole('MANAGER_RECRUTARE')")
    public Post create(@RequestBody PostCreateRequest request) {
        return postService.save(request);
    }

    @PatchMapping("/{id}")
    public PostViewDto patch(
            @PathVariable Long id,
            @Valid @RequestBody PostPatchRequest request,
            @AuthenticationPrincipal Utilizator utilizator) {
        return postService.patchPost(id, request, utilizator);
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
