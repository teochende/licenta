package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.PostAssignmentsReplaceRequest;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.PostService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/admin/posturi")
@PreAuthorize("@perm.isAdmin() or hasRole('MANAGER_RECRUTARE')")
public class AdminPostAssignmentController {

    private final PostService postService;

    public AdminPostAssignmentController(PostService postService) {
        this.postService = postService;
    }

    @PutMapping("/{postId}/assignari")
    public Post replaceAssignments(
            @PathVariable Long postId,
            @RequestBody PostAssignmentsReplaceRequest body) {
        return postService.replaceAssignments(
                postId,
                body.recrutoriIds() != null ? body.recrutoriIds() : List.of(),
                body.intervievatoriIds() != null ? body.intervievatoriIds() : List.of());
    }

    /** Încărcare descriere job ca PDF/DOCX (sub /api/admin ca să nu intre în conflict cu rezolvarea statică pe /api/posturi/...). */
    @PostMapping("/{postId}/descriere-fisier")
    public PostViewDto uploadDescriereFisier(
            @PathVariable Long postId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Utilizator utilizator) throws IOException {
        return postService.uploadDescriereFisier(postId, file, utilizator);
    }

    @DeleteMapping("/{postId}/descriere-fisier")
    public PostViewDto deleteDescriereFisier(
            @PathVariable Long postId, @AuthenticationPrincipal Utilizator utilizator) {
        return postService.clearDescriereFisier(postId, utilizator);
    }

    @PostMapping("/{postId}/recrutori/{utilizatorId}")
    public Post addRecrutor(@PathVariable Long postId, @PathVariable Long utilizatorId) {
        return postService.addRecrutor(postId, utilizatorId);
    }

    @DeleteMapping("/{postId}/recrutori/{utilizatorId}")
    public Post removeRecrutor(@PathVariable Long postId, @PathVariable Long utilizatorId) {
        return postService.removeRecrutor(postId, utilizatorId);
    }

    @PostMapping("/{postId}/intervievatori/{utilizatorId}")
    public Post addIntervievator(@PathVariable Long postId, @PathVariable Long utilizatorId) {
        return postService.addIntervievator(postId, utilizatorId);
    }

    @DeleteMapping("/{postId}/intervievatori/{utilizatorId}")
    public Post removeIntervievator(@PathVariable Long postId, @PathVariable Long utilizatorId) {
        return postService.removeIntervievator(postId, utilizatorId);
    }
}
