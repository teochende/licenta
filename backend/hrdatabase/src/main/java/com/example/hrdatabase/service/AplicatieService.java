package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.AplicatieCreateRequest;
import com.example.hrdatabase.dto.request.AplicatiePipelinePatchRequest;
import com.example.hrdatabase.dto.response.AplicatieDashboardDto;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.AplicatieRepository;
import com.example.hrdatabase.repository.PostRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AplicatieService {

    private final AplicatieRepository aplicatieRepository;
    private final PostRepository postRepository;
    private final PostAccessService postAccessService;

    public AplicatieService(
            AplicatieRepository aplicatieRepository,
            PostRepository postRepository,
            PostAccessService postAccessService) {
        this.aplicatieRepository = aplicatieRepository;
        this.postRepository = postRepository;
        this.postAccessService = postAccessService;
    }

    @Transactional
    public Aplicatie savePublicApplication(AplicatieCreateRequest request) {
        Post post = postRepository.findById(request.postId())
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + request.postId()));
        if (!post.isEnabled()) {
            throw new IllegalArgumentException("Acest post nu acceptă aplicări.");
        }
        String email = request.email() != null ? request.email().trim() : "";
        String nume = request.numeCandidat() != null ? request.numeCandidat().trim() : "";
        if (aplicatieRepository.existsByPost_IdAndEmailIgnoreCase(post.getId(), email)) {
            throw new IllegalArgumentException(
                    "Ați aplicat deja la acest post cu acest email. Nu se pot trimite două aplicări duplicate.");
        }
        String cvFile = stripNullChars(request.cvNumeFisier() != null ? request.cvNumeFisier() : "");
        Aplicatie a = new Aplicatie(post, nume, email, cvFile);
        a.setCvContinut(stripNullChars(request.cvContinut()));
        return aplicatieRepository.save(a);
    }

    @Transactional(readOnly = true)
    public List<AplicatieDashboardDto> findDashboardFor(Utilizator utilizator) {
        return aplicatieRepository.findAllWithPostGraph().stream()
                .filter(app -> postAccessService.canViewPost(utilizator, app.getPost()))
                .map(AplicatieService::toDashboardDto)
                .toList();
    }

    @Transactional
    public void updatePipeline(Long aplicatieId, AplicatiePipelinePatchRequest request, Utilizator utilizator) {
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canViewPost(utilizator, a.getPost())) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }
        a.setPipelineState(stripNullChars(request.pipelineStateJson()));
        aplicatieRepository.save(a);
    }

    /** PostgreSQL respinge U+0000 în tipurile text/varchar. */
    private static String stripNullChars(String s) {
        if (s == null || s.isEmpty()) {
            return s;
        }
        return s.indexOf('\0') < 0 ? s : s.replace("\0", "");
    }

    private static AplicatieDashboardDto toDashboardDto(Aplicatie a) {
        return new AplicatieDashboardDto(
                a.getId(),
                a.getPost().getId(),
                a.getNumeCandidat(),
                a.getEmail(),
                a.getCvNumeFisier(),
                a.getCvContinut(),
                a.getPipelineState());
    }

    public List<Aplicatie> findAll() {
        return aplicatieRepository.findAll();
    }
}
