package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.service.PostService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posturi")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public Post create(@RequestBody PostCreateRequest request) {
        return postService.save(request);
    }

    @GetMapping
    public List<Post> list() {
        return postService.findAll();
    }
}
