package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.PostAssignmentsReplaceRequest;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.service.PostService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
