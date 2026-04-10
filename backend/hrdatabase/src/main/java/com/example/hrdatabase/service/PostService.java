package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
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
        Set<Utilizator> recrutori = loadUtilizatori(request.recrutoriIds());
        assertRolSet(recrutori, Rol.RECRUTOR, "Recrutor");
        post.setRecrutori(recrutori);
        Set<Utilizator> intervievatori = loadUtilizatori(request.intervievatoriIds());
        assertRolSet(intervievatori, Rol.INTERVIEVATOR_TEHNIC, "Intervievator tehnic");
        post.setIntervievatori(intervievatori);

        return postRepository.save(post);
    }

    @Transactional
    public Post addRecrutor(Long postId, Long utilizatorId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        Utilizator u = utilizatorRepository.findById(utilizatorId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizator inexistent: " + utilizatorId));
        if (u.getRol() != Rol.RECRUTOR) {
            throw new IllegalArgumentException("Utilizatorul " + utilizatorId + " trebuie să aibă rolul RECRUTOR");
        }
        post.getRecrutori().add(u);
        return postRepository.save(post);
    }

    @Transactional
    public Post removeRecrutor(Long postId, Long utilizatorId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        post.getRecrutori().removeIf(u -> Objects.equals(u.getId(), utilizatorId));
        return postRepository.save(post);
    }

    @Transactional
    public Post addIntervievator(Long postId, Long utilizatorId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        Utilizator u = utilizatorRepository.findById(utilizatorId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizator inexistent: " + utilizatorId));
        if (u.getRol() != Rol.INTERVIEVATOR_TEHNIC) {
            throw new IllegalArgumentException("Utilizatorul " + utilizatorId + " trebuie să aibă rolul INTERVIEVATOR_TEHNIC");
        }
        post.getIntervievatori().add(u);
        return postRepository.save(post);
    }

    @Transactional
    public Post removeIntervievator(Long postId, Long utilizatorId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        post.getIntervievatori().removeIf(u -> Objects.equals(u.getId(), utilizatorId));
        return postRepository.save(post);
    }

    @Transactional
    public Post replaceAssignments(Long postId, List<Long> recrutoriIds, List<Long> intervievatoriIds) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        Set<Utilizator> recrutori = loadUtilizatori(recrutoriIds);
        assertRolSet(recrutori, Rol.RECRUTOR, "Recrutor");
        Set<Utilizator> intervievatori = loadUtilizatori(intervievatoriIds);
        assertRolSet(intervievatori, Rol.INTERVIEVATOR_TEHNIC, "Intervievator tehnic");
        post.setRecrutori(recrutori);
        post.setIntervievatori(intervievatori);
        return postRepository.save(post);
    }

    private Set<Utilizator> loadUtilizatori(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(utilizatorRepository.findAllById(ids));
    }

    private static void assertRolSet(Set<Utilizator> utilizatori, Rol rolAsteptat, String rolLabel) {
        for (Utilizator u : utilizatori) {
            if (u.getRol() != rolAsteptat) {
                throw new IllegalArgumentException(
                        "Pentru alocarea ca „" + rolLabel + "”, utilizatorul " + u.getId()
                                + " trebuie să aibă rolul " + rolAsteptat.name());
            }
        }
    }

    public List<Post> findAll() {
        return postRepository.findAll();
    }
}
