package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.AplicatieCreateRequest;
import com.example.hrdatabase.dto.request.AplicatiePipelinePatchRequest;
import com.example.hrdatabase.dto.response.AplicatieDashboardDto;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.AplicatieRepository;
import com.example.hrdatabase.repository.PostRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class AplicatieService {

    private final AplicatieRepository aplicatieRepository;
    private final PostRepository postRepository;
    private final PostAccessService postAccessService;
    private final AplicatieCvFileStorageService aplicatieCvFileStorageService;

    public AplicatieService(
            AplicatieRepository aplicatieRepository,
            PostRepository postRepository,
            PostAccessService postAccessService,
            AplicatieCvFileStorageService aplicatieCvFileStorageService) {
        this.aplicatieRepository = aplicatieRepository;
        this.postRepository = postRepository;
        this.postAccessService = postAccessService;
        this.aplicatieCvFileStorageService = aplicatieCvFileStorageService;
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
        a.setDataAplicare(Instant.now());
        a.setCvContinut(stripNullChars(request.cvContinut()));
        return aplicatieRepository.save(a);
    }

    @Transactional
    public Aplicatie savePublicApplicationMultipart(Long postId, String numeCandidat, String email, MultipartFile file)
            throws IOException {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        if (!post.isEnabled()) {
            throw new IllegalArgumentException("Acest post nu acceptă aplicări.");
        }
        String em = email != null ? email.trim() : "";
        String nume = numeCandidat != null ? numeCandidat.trim() : "";
        if (aplicatieRepository.existsByPost_IdAndEmailIgnoreCase(post.getId(), em)) {
            throw new IllegalArgumentException(
                    "Ați aplicat deja la acest post cu acest email. Nu se pot trimite două aplicări duplicate.");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CV-ul (fișier) este obligatoriu.");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "cv";
        byte[] bytes = file.getBytes();
        String relative = aplicatieCvFileStorageService.storeBytes(bytes, originalName);
        Aplicatie a = new Aplicatie(post, nume, em, originalName);
        a.setDataAplicare(Instant.now());
        a.setCvFisierPath(relative);
        a.setCvContinut(stripNullChars(buildCvContinutFromUpload(bytes, originalName)));
        return aplicatieRepository.save(a);
    }

    private static String buildCvContinutFromUpload(byte[] bytes, String originalName) {
        String ext = AplicatieCvFileStorageService.extensionOf(originalName);
        if (".txt".equals(ext)) {
            String s = new String(bytes, StandardCharsets.UTF_8);
            s = stripNullChars(s);
            if (s.length() > 80000) {
                return s.substring(0, 80000);
            }
            return s;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public List<AplicatieDashboardDto> findDashboardFor(Utilizator utilizator) {
        return aplicatieRepository.findAllWithPostGraph().stream()
                .filter(app -> postAccessService.canViewPost(utilizator, app.getPost()))
                .map(AplicatieService::toDashboardDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> getCvFileResponse(Long aplicatieId, Utilizator utilizator) {
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canViewPost(utilizator, a.getPost())) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }
        String pathStr = a.getCvFisierPath();
        if (pathStr == null || pathStr.isBlank()) {
            throw new IllegalArgumentException("Nu există fișier CV stocat pentru această aplicare.");
        }
        var path = aplicatieCvFileStorageService.resolveStoredPath(pathStr);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("Fișierul CV lipsește de pe disc.");
        }
        Resource resource = new FileSystemResource(path);
        String displayName = a.getCvNumeFisier() != null && !a.getCvNumeFisier().isBlank()
                ? a.getCvNumeFisier()
                : path.getFileName().toString();
        String lower = displayName.toLowerCase(Locale.ROOT);
        boolean inline = lower.endsWith(".pdf") || lower.endsWith(".txt");
        MediaType mediaType = mediaTypeForFilename(lower);
        ContentDisposition disposition = ContentDisposition.builder(inline ? "inline" : "attachment")
                .filename(displayName, StandardCharsets.UTF_8)
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentDisposition(disposition);
        return ResponseEntity.ok().headers(headers).body(resource);
    }

    private static MediaType mediaTypeForFilename(String lower) {
        if (lower.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }
        if (lower.endsWith(".docx")) {
            return MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        }
        if (lower.endsWith(".doc")) {
            return MediaType.parseMediaType("application/msword");
        }
        if (lower.endsWith(".txt")) {
            return MediaType.parseMediaType("text/plain;charset=UTF-8");
        }
        return MediaType.APPLICATION_OCTET_STREAM;
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
        String path = a.getCvFisierPath();
        return new AplicatieDashboardDto(
                a.getId(),
                a.getPost().getId(),
                a.getNumeCandidat(),
                a.getEmail(),
                a.getCvNumeFisier(),
                path != null && !path.isBlank(),
                a.getDataAplicare(),
                a.getCvContinut(),
                a.getPipelineState());
    }

    public List<Aplicatie> findAll() {
        return aplicatieRepository.findAll();
    }
}
