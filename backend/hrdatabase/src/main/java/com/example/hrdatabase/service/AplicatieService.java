package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.AplicatieCreateRequest;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.repository.AplicatieRepository;
import com.example.hrdatabase.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AplicatieService {

    private final AplicatieRepository aplicatieRepository;
    private final PostRepository postRepository;

    public AplicatieService(AplicatieRepository aplicatieRepository, PostRepository postRepository) {
        this.aplicatieRepository = aplicatieRepository;
        this.postRepository = postRepository;
    }

    @Transactional
    public Aplicatie save(AplicatieCreateRequest request) {
        Post post = postRepository.findById(request.postId())
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + request.postId()));
        Aplicatie a = new Aplicatie(post, request.numeCandidat(), request.email(), request.cvNumeFisier());
        return aplicatieRepository.save(a);
    }

    public List<Aplicatie> findAll() {
        return aplicatieRepository.findAll();
    }
}
