package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final DepartamentRepository departamentRepository;
    private final UtilizatorRepository utilizatorRepository;

    public PostService(
            PostRepository postRepository,
            DepartamentRepository departamentRepository,
            UtilizatorRepository utilizatorRepository) {
        this.postRepository = postRepository;
        this.departamentRepository = departamentRepository;
        this.utilizatorRepository = utilizatorRepository;
    }

    @Transactional
    public Post save(PostCreateRequest request) {
        Departament departament = departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));

        Post post = new Post();
        post.setDepartament(departament);
        post.setSubdomeniu(request.subdomeniu());
        post.setNume(request.nume());
        post.setNivel(request.nivel());
        post.setDescriere(request.descriere());
        post.setEnabled(request.enabled());
        post.setRecrutori(loadUtilizatori(request.recrutoriIds()));
        post.setIntervievatori(loadUtilizatori(request.intervievatoriIds()));

        return postRepository.save(post);
    }

    private Set<Utilizator> loadUtilizatori(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(utilizatorRepository.findAllById(ids));
    }

    public List<Post> findAll() {
        return postRepository.findAll();
    }
}
