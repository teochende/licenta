package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.AplicatieCreateRequest;
import com.example.hrdatabase.dto.request.AplicatiePipelinePatchRequest;
import com.example.hrdatabase.dto.request.AplicatieVizibilitateItPatchRequest;
import com.example.hrdatabase.dto.ai.AiCvAnalyzeResponse;
import com.example.hrdatabase.dto.ai.AiEnglishVideoApiResponse;
import com.example.hrdatabase.dto.response.AplicatieDashboardDto;
import com.example.hrdatabase.dto.response.PageResponse;
import com.example.hrdatabase.dto.response.RecalcMatchScoreResultDto;
import com.example.hrdatabase.entity.Aplicatie;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.AplicatieRepository;
import com.example.hrdatabase.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AplicatieService {

    private static final Logger log = LoggerFactory.getLogger(AplicatieService.class);

    private static final ObjectMapper PIPELINE_OBJECT_MAPPER = new ObjectMapper();

    private final AplicatieRepository aplicatieRepository;
    private final PostRepository postRepository;
    private final PostAccessService postAccessService;
    private final AplicatieCvFileStorageService aplicatieCvFileStorageService;
    private final PostDescriereFileStorageService postDescriereFileStorageService;
    private final DocumentTextExtractor documentTextExtractor;
    private final CvJobMatchService cvJobMatchService;
    private final AiCvReviewClientService aiCvReviewClientService;
    private final AiEnglishVideoReviewClientService aiEnglishVideoReviewClientService;

    public AplicatieService(
            AplicatieRepository aplicatieRepository,
            PostRepository postRepository,
            PostAccessService postAccessService,
            AplicatieCvFileStorageService aplicatieCvFileStorageService,
            PostDescriereFileStorageService postDescriereFileStorageService,
            DocumentTextExtractor documentTextExtractor,
            CvJobMatchService cvJobMatchService,
            AiCvReviewClientService aiCvReviewClientService,
            AiEnglishVideoReviewClientService aiEnglishVideoReviewClientService) {
        this.aplicatieRepository = aplicatieRepository;
        this.postRepository = postRepository;
        this.postAccessService = postAccessService;
        this.aplicatieCvFileStorageService = aplicatieCvFileStorageService;
        this.postDescriereFileStorageService = postDescriereFileStorageService;
        this.documentTextExtractor = documentTextExtractor;
        this.cvJobMatchService = cvJobMatchService;
        this.aiCvReviewClientService = aiCvReviewClientService;
        this.aiEnglishVideoReviewClientService = aiEnglishVideoReviewClientService;
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
        boolean ai = Boolean.TRUE.equals(request.aiCvReview());
        a.setAiCvReview(ai);
        String jobText = buildJobTextForMatching(post);
        Set<String> jobKw = cvJobMatchService.extractJobKeywordsFromKeywordLines(jobText);
        logJobKeywords(post.getId(), jobKw);
        logCvKeywords(a.getId(), jobKw, a.getCvContinut());
        Integer score = cvJobMatchService.computeMatchScorePercentFromJobKeywords(jobKw, a.getCvContinut());
        a.setCvJobMatchScore(score);
        if (!ai) {
            a.setAiCvMatchScore(null);
            a.setAiCvObservatii(null);
            a.setAiCvConcluzii(null);
        }
        Aplicatie saved = aplicatieRepository.save(a);
        if (ai) {
            return runAiCvReviewAfterSave(saved, post);
        }
        return saved;
    }

    @Transactional
    public Aplicatie savePublicApplicationMultipart(
            Long postId,
            String numeCandidat,
            String email,
            MultipartFile file,
            MultipartFile videoFile,
            boolean aiCvReview)
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
        a.setAiCvReview(aiCvReview);
        String jobText = buildJobTextForMatching(post);
        Set<String> jobKw = cvJobMatchService.extractJobKeywordsFromKeywordLines(jobText);
        logJobKeywords(post.getId(), jobKw);
        logCvKeywords(a.getId(), jobKw, a.getCvContinut());
        Integer score = cvJobMatchService.computeMatchScorePercentFromJobKeywords(jobKw, a.getCvContinut());
        a.setCvJobMatchScore(score);
        if (!aiCvReview) {
            a.setAiCvMatchScore(null);
            a.setAiCvObservatii(null);
            a.setAiCvConcluzii(null);
        }
        if (videoFile != null && !videoFile.isEmpty()) {
            String videoOriginal =
                    videoFile.getOriginalFilename() != null ? videoFile.getOriginalFilename() : "video.mp4";
            byte[] videoBytes = videoFile.getBytes();
            String videoRelative = aplicatieCvFileStorageService.storeVideoBytes(videoBytes, videoOriginal);
            a.setVideoNumeFisier(stripNullChars(videoOriginal));
            a.setVideoFisierPath(videoRelative);
        }
        Aplicatie saved = aplicatieRepository.save(a);
        if (aiCvReview) {
            return runAiCvReviewAfterSave(saved, post);
        }
        return saved;
    }

    /**
     * După salvarea aplicării cu {@link Aplicatie#isAiCvReview()} {@code true}, apelează modulul AI și persistă scor + observații + concluzii.
     */
    private Aplicatie runAiCvReviewAfterSave(Aplicatie a, Post post) {
        String jobText = buildJobTextForMatching(post);
        Optional<AiCvAnalyzeResponse> opt = aiCvReviewClientService.analyze(a.getCvContinut(), jobText);
        if (opt.isPresent()) {
            AiCvAnalyzeResponse r = opt.get();
            a.setAiCvMatchScore(AiCvReviewClientService.clampScore(r.score()));
            a.setAiCvObservatii(AiCvReviewClientService.formatObservatii(r));
            String rec = r.recommendation();
            a.setAiCvConcluzii(rec != null && !rec.isBlank() ? rec : null);
        } else {
            a.setAiCvMatchScore(null);
            a.setAiCvConcluzii(
                    "Analiza AI nu a putut fi completată (serviciu indisponibil, text CV/job lipsă sau ai.cv.review.enabled=false). "
                            + "Porniți modul_ai_cv_review (FastAPI) și verificați ai.cv.review.base-url în application.properties.");
        }
        return aplicatieRepository.save(a);
    }

    /**
     * Dashboard: pornește sau oprește modul AI pentru o aplicare existentă (aceleași drepturi ca la pipeline).
     */
    @Transactional
    public AplicatieDashboardDto updateAiCvReview(Long aplicatieId, boolean enabled, Utilizator utilizator) {
        if (utilizator == null) {
            throw new AccessDeniedException("Neautentificat");
        }
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canAccessAplicatieDetail(utilizator, a.getPost(), a)) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }
        Post post = a.getPost();
        if (enabled) {
            ensureCvTextIfPossible(a);
            if (a.getCvContinut() == null || a.getCvContinut().isBlank()) {
                throw new IllegalArgumentException(
                        "Nu există text CV extras pentru această aplicare. Nu se poate rula analiza AI.");
            }
            a.setAiCvReview(true);
            if (a.getCvJobMatchScore() == null) {
                String jobText = buildJobTextForMatching(post);
                Set<String> jobKw = cvJobMatchService.extractJobKeywordsFromKeywordLines(jobText);
                logJobKeywords(post.getId(), jobKw);
                logCvKeywords(a.getId(), jobKw, a.getCvContinut());
                Integer score = cvJobMatchService.computeMatchScorePercentFromJobKeywords(jobKw, a.getCvContinut());
                a.setCvJobMatchScore(score);
            }
            a.setAiCvMatchScore(null);
            a.setAiCvObservatii(null);
            a.setAiCvConcluzii(null);
            aplicatieRepository.save(a);
            Aplicatie afterAi = runAiCvReviewAfterSave(a, post);
            return toDashboardDto(afterAi);
        }
        a.setAiCvReview(false);
        a.setAiCvMatchScore(null);
        a.setAiCvObservatii(null);
        a.setAiCvConcluzii(null);
        if (a.getCvJobMatchScore() == null) {
            ensureCvTextIfPossible(a);
            String jobText = buildJobTextForMatching(post);
            Set<String> jobKw = cvJobMatchService.extractJobKeywordsFromKeywordLines(jobText);
            logJobKeywords(post.getId(), jobKw);
            logCvKeywords(a.getId(), jobKw, a.getCvContinut());
            Integer score = cvJobMatchService.computeMatchScorePercentFromJobKeywords(jobKw, a.getCvContinut());
            a.setCvJobMatchScore(score);
        }
        aplicatieRepository.save(a);
        return toDashboardDto(a);
    }

    /**
     * Text folosit la matching: descriere text + câmpuri job + text extras din PDF/DOCX descriere (dacă există).
     */
    private String buildJobTextForMatching(Post post) {
        StringBuilder sb = new StringBuilder();
        if (post.getDescriere() != null && !post.getDescriere().isBlank()) {
            sb.append(post.getDescriere().trim());
        }
        if (post.getNume() != null && !post.getNume().isBlank()) {
            if (!sb.isEmpty()) sb.append('\n');
            sb.append(post.getNume().trim());
        }
        if (post.getSubdomeniu() != null && !post.getSubdomeniu().isBlank()) {
            sb.append(' ').append(post.getSubdomeniu().trim());
        }
        if (post.getNivel() != null && !post.getNivel().isBlank()) {
            sb.append(' ').append(post.getNivel().trim());
        }
        String relPath = post.getDescriereFisierPath();
        if (relPath != null && !relPath.isBlank()) {
            try {
                var path = postDescriereFileStorageService.resolveStoredPath(relPath);
                if (Files.exists(path)) {
                    byte[] fileBytes = Files.readAllBytes(path);
                    String name = post.getDescriereFisierNume() != null && !post.getDescriereFisierNume().isBlank()
                            ? post.getDescriereFisierNume()
                            : path.getFileName().toString();
                    String extracted = documentTextExtractor.extractFromBytes(fileBytes, name);
                    if (extracted != null && !extracted.isBlank()) {
                        if (!sb.isEmpty()) sb.append('\n');
                        sb.append(extracted);
                    }
                }
            } catch (Exception e) {
                // continuăm doar cu textul din câmpuri
            }
        }
        return sb.toString();
    }

    private String buildCvContinutFromUpload(byte[] bytes, String originalName) {
        String extracted = documentTextExtractor.extractFromBytes(bytes, originalName);
        if (extracted != null) {
            return stripNullChars(extracted);
        }
        // fallback: doar .txt dacă extractorul nu acoperă extensia
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
                .filter(app -> postAccessService.canAccessAplicatieDetail(utilizator, app.getPost(), app))
                .sorted(APLICATIE_DASHBOARD_SORT)
                .map(AplicatieService::toDashboardDto)
                .toList();
    }

    /**
     * Variantă ne-paginată cu aceleași filtre ca {@link #findDashboardForPaged} (q, postId, status).
     */
    @Transactional(readOnly = true)
    public List<AplicatieDashboardDto> findDashboardForFiltered(
            Utilizator utilizator,
            String q,
            Long postId,
            String listaStatus) {
        return filterDashboardAplicatii(utilizator, q, postId, listaStatus).stream()
                .map(AplicatieService::toDashboardDto)
                .toList();
    }

    /**
     * Listă paginată pentru secțiunea „Candidați” din dashboard: aceleași drepturi ca {@link #findDashboardFor},
     * cu căutare (nume, email, post, departament), filtru post și filtru activi / respinși / toți.
     */
    @Transactional(readOnly = true)
    public PageResponse<AplicatieDashboardDto> findDashboardForPaged(
            Utilizator utilizator,
            String q,
            Long postId,
            String listaStatus,
            int page,
            int size) {
        List<Aplicatie> filtered = filterDashboardAplicatii(utilizator, q, postId, listaStatus);

        long total = filtered.size();
        int safeSize = Math.max(1, Math.min(100, size));
        int safePage = Math.max(0, page);
        int from = (int) Math.min((long) safePage * safeSize, total);
        int to = (int) Math.min(from + safeSize, total);
        List<AplicatieDashboardDto> content =
                from >= to ? List.of() : filtered.subList(from, to).stream()
                        .map(AplicatieService::toDashboardDto)
                        .toList();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
        return new PageResponse<>(content, total, safePage, safeSize, totalPages);
    }

    private List<Aplicatie> filterDashboardAplicatii(
            Utilizator utilizator,
            String q,
            Long postId,
            String listaStatus) {
        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        ListaAplicantiFilter statusFilter = ListaAplicantiFilter.fromParam(listaStatus);
        return aplicatieRepository.findAllWithPostGraph().stream()
                .filter(app -> postAccessService.canAccessAplicatieDetail(utilizator, app.getPost(), app))
                .filter(app -> postId == null || postId.equals(app.getPost().getId()))
                .filter(app -> matchesDashboardQuery(qNorm, app))
                .filter(app -> matchesListaStatusFilter(app, statusFilter))
                .sorted(APLICATIE_DASHBOARD_SORT)
                .toList();
    }

    private enum ListaAplicantiFilter {
        ALL,
        ACTIVI,
        RESPINSI;

        static ListaAplicantiFilter fromParam(String raw) {
            if (raw == null || raw.isBlank()) {
                return ALL;
            }
            return switch (raw.trim().toLowerCase(Locale.ROOT)) {
                case "activi" -> ACTIVI;
                case "respinsi" -> RESPINSI;
                default -> ALL;
            };
        }
    }

    private static final Comparator<Aplicatie> APLICATIE_DASHBOARD_SORT =
            Comparator.comparing((Aplicatie a) -> lowerOrEmpty(a.getNumeCandidat()))
                    .thenComparing(a -> lowerOrEmpty(a.getEmail()))
                    .thenComparing(a -> lowerOrEmpty(a.getPost().getNume()))
                    .thenComparing(Aplicatie::getId, Comparator.reverseOrder());

    private static String lowerOrEmpty(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private static boolean matchesDashboardQuery(String qNorm, Aplicatie a) {
        if (qNorm.isEmpty()) {
            return true;
        }
        Post p = a.getPost();
        String dep = p.getDepartament() != null && p.getDepartament().getNume() != null
                ? p.getDepartament().getNume().toLowerCase(Locale.ROOT)
                : "";
        return containsLower(a.getNumeCandidat(), qNorm)
                || containsLower(a.getEmail(), qNorm)
                || containsLower(p.getNume(), qNorm)
                || containsLower(p.getSubdomeniu(), qNorm)
                || (!dep.isEmpty() && dep.contains(qNorm));
    }

    private static boolean containsLower(String field, String qNorm) {
        return field != null && field.toLowerCase(Locale.ROOT).contains(qNorm);
    }

    private static boolean matchesListaStatusFilter(Aplicatie a, ListaAplicantiFilter filter) {
        boolean respins = pipelineIndicaRespins(a.getPipelineState());
        return switch (filter) {
            case ALL -> true;
            case ACTIVI -> !respins;
            case RESPINSI -> respins;
        };
    }

    /**
     * Aliniat cu UI: candidat respins dacă există o etapă cu status {@code respins} în JSON-ul pipeline.
     */
    private static boolean pipelineIndicaRespins(String pipelineStateJson) {
        if (pipelineStateJson == null || pipelineStateJson.isBlank()) {
            return false;
        }
        try {
            JsonNode root = PIPELINE_OBJECT_MAPPER.readTree(pipelineStateJson);
            JsonNode status = root.get("status");
            if (status == null || !status.isObject()) {
                return false;
            }
            Iterator<Map.Entry<String, JsonNode>> it = status.fields();
            while (it.hasNext()) {
                JsonNode v = it.next().getValue();
                if (v != null && v.isTextual() && "respins".equalsIgnoreCase(v.asText())) {
                    return true;
                }
            }
        } catch (Exception ignored) {
            // JSON invalid: tratat ca ne-respins
        }
        return false;
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> getCvFileResponse(Long aplicatieId, Utilizator utilizator) {
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canAccessAplicatieDetail(utilizator, a.getPost(), a)) {
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

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> getVideoFileResponse(Long aplicatieId, Utilizator utilizator) {
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canAccessAplicatieDetail(utilizator, a.getPost(), a)) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }
        String pathStr = a.getVideoFisierPath();
        if (pathStr == null || pathStr.isBlank()) {
            throw new IllegalArgumentException("Nu există videoclip stocat pentru această aplicare.");
        }
        var path = aplicatieCvFileStorageService.resolveStoredPath(pathStr);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("Videoclipul lipsește de pe disc.");
        }
        Resource resource = new FileSystemResource(path);
        String displayName = a.getVideoNumeFisier() != null && !a.getVideoNumeFisier().isBlank()
                ? a.getVideoNumeFisier()
                : path.getFileName().toString();
        String lower = displayName.toLowerCase(Locale.ROOT);
        MediaType mediaType = mediaTypeForVideoFilename(lower);
        ContentDisposition disposition = ContentDisposition.builder("inline")
                .filename(displayName, StandardCharsets.UTF_8)
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentDisposition(disposition);
        return ResponseEntity.ok().headers(headers).body(resource);
    }

    private static MediaType mediaTypeForVideoFilename(String lower) {
        if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) {
            return MediaType.parseMediaType("video/mp4");
        }
        if (lower.endsWith(".webm")) {
            return MediaType.parseMediaType("video/webm");
        }
        if (lower.endsWith(".mov")) {
            return MediaType.parseMediaType("video/quicktime");
        }
        if (lower.endsWith(".mkv")) {
            return MediaType.parseMediaType("video/x-matroska");
        }
        if (lower.endsWith(".avi")) {
            return MediaType.parseMediaType("video/x-msvideo");
        }
        if (lower.endsWith(".mpeg") || lower.endsWith(".mpg")) {
            return MediaType.parseMediaType("video/mpeg");
        }
        return MediaType.APPLICATION_OCTET_STREAM;
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
    public void updateVizibilitateIntervievatoriTehnic(
            Long aplicatieId, AplicatieVizibilitateItPatchRequest request, Utilizator utilizator) {
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canManageVizibilitateIntervievatoriTehnic(utilizator, a.getPost())) {
            throw new AccessDeniedException("Nu puteți modifica vizibilitatea acestei aplicări.");
        }
        a.setVizibilIntervievatoriTehnic(Boolean.TRUE.equals(request.vizibilIntervievatoriTehnic()));
        aplicatieRepository.save(a);
    }

    @Transactional
    public void updatePipeline(Long aplicatieId, AplicatiePipelinePatchRequest request, Utilizator utilizator) {
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canAccessAplicatieDetail(utilizator, a.getPost(), a)) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }
        a.setPipelineState(stripNullChars(request.pipelineStateJson()));
        aplicatieRepository.save(a);
    }

    /**
     * Bifează/debifează „Review engleză automat”: la activare trimite videoclipul la modulul AI (o singură dată
     * cât există rezultate valide; reutilizare fără reapel la hover). La dezactivare păstrează scorurile în DB,
     * dar nu mai afișează fluxul AI în UI (pipeline).
     */
    @Transactional
    public AplicatieDashboardDto updateReviewEnglezaAutomat(Long aplicatieId, boolean enabled, Utilizator utilizator)
            throws IOException {
        if (utilizator == null) {
            throw new AccessDeniedException("Neautentificat");
        }
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canAccessAplicatieDetail(utilizator, a.getPost(), a)) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }

        if (!enabled) {
            a.setPipelineState(mergeReviewEnglezaAutomatIntoPipeline(a.getPipelineState(), false));
            a.setEnglezaAiError(null);
            aplicatieRepository.save(a);
            return toDashboardDto(aplicatieRepository.findByIdWithPostGraph(aplicatieId).orElseThrow());
        }

        String videoPathStr = a.getVideoFisierPath();
        if (videoPathStr == null || videoPathStr.isBlank()) {
            throw new IllegalArgumentException(
                    "Nu există videoclip încărcat pentru această aplicare. Analiza AI nu poate rula.");
        }

        boolean cachedOk = a.getEnglezaAiScore() != null
                && a.getEnglezaAiAnalyzedAt() != null
                && (a.getEnglezaAiError() == null || a.getEnglezaAiError().isBlank());
        if (cachedOk) {
            a.setPipelineState(mergeReviewEnglezaAutomatIntoPipeline(a.getPipelineState(), true));
            aplicatieRepository.save(a);
            return toDashboardDto(aplicatieRepository.findByIdWithPostGraph(aplicatieId).orElseThrow());
        }

        var path = aplicatieCvFileStorageService.resolveStoredPath(videoPathStr);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException(
                    "Fișierul video lipsește de pe server. Încărcați din nou videoclipul printr-o aplicare nouă.");
        }

        a.setPipelineState(mergeReviewEnglezaAutomatIntoPipeline(a.getPipelineState(), true));
        aplicatieRepository.save(a);

        Optional<AiEnglishVideoApiResponse> opt = aiEnglishVideoReviewClientService.analyzeVideoFromPath(
                path, a.getVideoNumeFisier() != null ? a.getVideoNumeFisier() : path.getFileName().toString());
        if (opt.isEmpty()) {
            a.setEnglezaAiError(
                    "Analiza engleză (video) a eșuat: modulul AI indisponibil sau răspuns invalid. "
                            + "Verificați modul_ai_cv_review (FastAPI), OPENAI_API_KEY și ai.cv.review.base-url.");
            a.setPipelineState(mergeReviewEnglezaAutomatIntoPipeline(a.getPipelineState(), false));
            aplicatieRepository.save(a);
            return toDashboardDto(aplicatieRepository.findByIdWithPostGraph(aplicatieId).orElseThrow());
        }

        applyEnglishVideoAiSuccess(a, opt.get());
        aplicatieRepository.save(a);
        return toDashboardDto(aplicatieRepository.findByIdWithPostGraph(aplicatieId).orElseThrow());
    }

    private static String mergeReviewEnglezaAutomatIntoPipeline(String pipelineJson, boolean enabled) {
        try {
            ObjectNode root;
            if (pipelineJson == null || pipelineJson.isBlank()) {
                root = PIPELINE_OBJECT_MAPPER.createObjectNode();
                root.set("status", PIPELINE_OBJECT_MAPPER.createObjectNode());
                root.set("details", PIPELINE_OBJECT_MAPPER.createObjectNode());
                root.put("unlockedUpTo", 0);
            } else {
                JsonNode n = PIPELINE_OBJECT_MAPPER.readTree(pipelineJson);
                root = n.isObject() ? (ObjectNode) n : PIPELINE_OBJECT_MAPPER.createObjectNode();
            }
            if (!root.has("status") || !root.get("status").isObject()) {
                root.set("status", PIPELINE_OBJECT_MAPPER.createObjectNode());
            }
            if (!root.has("details") || !root.get("details").isObject()) {
                root.set("details", PIPELINE_OBJECT_MAPPER.createObjectNode());
            }
            if (!root.has("unlockedUpTo") || !root.get("unlockedUpTo").isNumber()) {
                root.put("unlockedUpTo", 0);
            }
            root.put("reviewEnglezaAutomat", enabled);
            return PIPELINE_OBJECT_MAPPER.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Pipeline JSON invalid; reîncărcați dashboardul.", e);
        }
    }

    private static boolean readReviewEnglezaAutomatFromPipeline(String pipelineJson) {
        if (pipelineJson == null || pipelineJson.isBlank()) {
            return false;
        }
        try {
            JsonNode n = PIPELINE_OBJECT_MAPPER.readTree(pipelineJson).get("reviewEnglezaAutomat");
            return n != null && n.isBoolean() && n.booleanValue();
        } catch (Exception e) {
            return false;
        }
    }

    private static void applyEnglishVideoAiSuccess(Aplicatie a, AiEnglishVideoApiResponse r) {
        a.setEnglezaAiScore(AiCvReviewClientService.clampScore(r.englishScore()));
        a.setEnglezaAiPerformanceStatus(normalizeEnglishPerformanceStatus(r.performanceStatus()));
        a.setEnglezaAiVerdict(normalizeEnglishVerdict(r.hiringVerdict()));
        a.setEnglezaAiSummary(truncate(buildEnglishSummaryFromApi(r), 2000));
        String tip = r.tooltipSummary() != null && !r.tooltipSummary().isBlank()
                ? r.tooltipSummary()
                : defaultEnglishTooltipFromApi(r);
        a.setEnglezaAiTooltipSummary(truncate(tip, 4000));
        a.setEnglezaAiError(null);
        a.setEnglezaAiAnalyzedAt(Instant.now());
    }

    private static String normalizeEnglishPerformanceStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Average";
        }
        String s = raw.trim().toLowerCase(Locale.ROOT);
        if (s.equals("good") || s.equals("average") || s.equals("poor")) {
            return s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
        }
        return "Average";
    }

    private static String normalizeEnglishVerdict(String raw) {
        if (raw == null || raw.isBlank()) {
            return "PARTIAL";
        }
        String u = raw.trim().toUpperCase(Locale.ROOT);
        if (u.equals("YES") || u.equals("PARTIAL") || u.equals("NO")) {
            return u;
        }
        return "PARTIAL";
    }

    private static String buildEnglishSummaryFromApi(AiEnglishVideoApiResponse r) {
        String cefr = r.cefrLevel() != null ? r.cefrLevel() : "—";
        return String.format(
                Locale.ROOT,
                "Scor %d/100 · %s · verdict %s · CEFR %s",
                r.englishScore(),
                normalizeEnglishPerformanceStatus(r.performanceStatus()),
                normalizeEnglishVerdict(r.hiringVerdict()),
                cefr);
    }

    private static String defaultEnglishTooltipFromApi(AiEnglishVideoApiResponse r) {
        return String.join(
                "\n",
                "Verdict: " + normalizeEnglishVerdict(r.hiringVerdict()),
                "Performanță: " + normalizeEnglishPerformanceStatus(r.performanceStatus()),
                "CEFR estimat: " + (r.cefrLevel() != null ? r.cefrLevel() : "—"),
                "Fluență: " + truncate(safe(r.fluencyFeedback()), 220),
                "Claritate: " + truncate(safe(r.clarityFeedback()), 220),
                "Inteligibilitate / pronunție: " + truncate(safe(r.pronunciationFeedback()), 220));
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max) + "…";
    }

    /**
     * Recalculează scorul pentru o aplicare existentă (și re-extrage text CV din fișier dacă lipsește).
     */
    @Transactional
    public RecalcMatchScoreResultDto recalcMatchScoreForAplicatie(Long aplicatieId, boolean force, Utilizator caller) {
        if (caller == null) {
            throw new AccessDeniedException("Neautentificat");
        }
        Aplicatie a = aplicatieRepository.findByIdWithPostGraph(aplicatieId)
                .orElseThrow(() -> new IllegalArgumentException("Aplicare inexistentă: " + aplicatieId));
        if (!postAccessService.canAccessAplicatieDetail(caller, a.getPost(), a)) {
            throw new AccessDeniedException("Nu aveți acces la această aplicare.");
        }
        int processed = 1;
        if (!force && a.getCvJobMatchScore() != null) {
            return new RecalcMatchScoreResultDto(processed, 0, 0, 0);
        }
        boolean textOk = ensureCvTextIfPossible(a);
        String jobText = buildJobTextForMatching(a.getPost());
        Set<String> jobKw = cvJobMatchService.extractJobKeywordsFromKeywordLines(jobText);
        logJobKeywords(a.getPost().getId(), jobKw);
        logCvKeywords(a.getId(), jobKw, a.getCvContinut());
        Integer score = cvJobMatchService.computeMatchScorePercentFromJobKeywords(jobKw, a.getCvContinut());
        if (score == null) {
            return new RecalcMatchScoreResultDto(processed, 0, 0, textOk ? 1 : 1);
        }
        a.setCvJobMatchScore(score);
        aplicatieRepository.save(a);
        return new RecalcMatchScoreResultDto(processed, 1, 0, 0);
    }

    /**
     * Recalculează scorul pentru toate aplicările vizibile pentru caller (admin/mr) care sunt manual.
     * Dacă {@code onlyMissing} este {@code true}, recalculează doar cele fără scor.
     */
    @Transactional
    public RecalcMatchScoreResultDto recalcMatchScoreForAll(boolean onlyMissing, Utilizator caller) {
        if (caller == null) {
            throw new AccessDeniedException("Neautentificat");
        }
        int processed = 0;
        int updated = 0;
        int skippedNoText = 0;
        List<Aplicatie> apps = aplicatieRepository.findAllWithPostGraph();
        for (Aplicatie a : apps) {
            if (!postAccessService.canViewPost(caller, a.getPost())) {
                continue;
            }
            processed++;
            if (onlyMissing && a.getCvJobMatchScore() != null) {
                continue;
            }
            ensureCvTextIfPossible(a);
            String jobText = buildJobTextForMatching(a.getPost());
            Set<String> jobKw = cvJobMatchService.extractJobKeywordsFromKeywordLines(jobText);
            logJobKeywords(a.getPost().getId(), jobKw);
            logCvKeywords(a.getId(), jobKw, a.getCvContinut());
            Integer score = cvJobMatchService.computeMatchScorePercentFromJobKeywords(jobKw, a.getCvContinut());
            if (score == null) {
                skippedNoText++;
                continue;
            }
            a.setCvJobMatchScore(score);
            aplicatieRepository.save(a);
            updated++;
        }
        return new RecalcMatchScoreResultDto(processed, updated, 0, skippedNoText);
    }

    /**
     * Dacă {@code cvContinut} lipsește, încearcă să îl extragă din fișierul CV existent (pdf/doc/docx/txt).
     */
    private boolean ensureCvTextIfPossible(Aplicatie a) {
        String existing = a.getCvContinut();
        if (existing != null && !existing.isBlank()) {
            return true;
        }
        String pathStr = a.getCvFisierPath();
        if (pathStr == null || pathStr.isBlank()) {
            return false;
        }
        try {
            var path = aplicatieCvFileStorageService.resolveStoredPath(pathStr);
            if (!Files.exists(path)) {
                return false;
            }
            byte[] bytes = Files.readAllBytes(path);
            String name = a.getCvNumeFisier() != null && !a.getCvNumeFisier().isBlank()
                    ? a.getCvNumeFisier()
                    : path.getFileName().toString();
            String extracted = documentTextExtractor.extractFromBytes(bytes, name);
            if (extracted == null || extracted.isBlank()) {
                return false;
            }
            a.setCvContinut(stripNullChars(extracted));
            aplicatieRepository.save(a);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void logJobKeywords(Long postId, Set<String> jobKeywords) {
        // logăm la INFO doar keywords job (nu CV) pentru trasabilitate
        if (postId == null) {
            return;
        }
        if (jobKeywords == null || jobKeywords.isEmpty()) {
            log.info("Job {} keywords: (none found via =keywords=)", postId);
            return;
        }
        // evităm linii gigantice în log
        List<String> sorted = jobKeywords.stream().sorted().toList();
        if (sorted.size() <= 200) {
            log.info("Job {} keywords: {}", postId, sorted);
        } else {
            log.info("Job {} keywords (first 200 of {}): {}", postId, sorted.size(), sorted.subList(0, 200));
        }
    }

    private void logCvKeywords(Long aplicatieId, Set<String> jobKeywords, String cvText) {
        if (aplicatieId == null) {
            return;
        }
        if (jobKeywords == null || jobKeywords.isEmpty()) {
            log.info("Aplicatie {} CV keywords: (job has no keywords via =keywords=)", aplicatieId);
            return;
        }
        String cv = cvJobMatchService.normalizeSearchable(cvText);
        if (cv.isEmpty()) {
            log.info("Aplicatie {} CV keywords: (no CV text)", aplicatieId);
            return;
        }
        List<String> found = jobKeywords.stream()
                .filter(k -> k != null && !k.isBlank() && cv.contains(k))
                .sorted()
                .toList();
        List<String> missing = jobKeywords.stream()
                .filter(k -> k != null && !k.isBlank() && !cv.contains(k))
                .sorted()
                .toList();
        if (!found.isEmpty()) {
            log.info("Aplicatie {} CV keywords found: {}", aplicatieId, found.size() <= 200 ? found : found.subList(0, 200));
        } else {
            log.info("Aplicatie {} CV keywords found: (none)", aplicatieId);
        }
        if (!missing.isEmpty()) {
            log.info("Aplicatie {} CV keywords missing: {}", aplicatieId, missing.size() <= 200 ? missing : missing.subList(0, 200));
        }
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
        String videoPath = a.getVideoFisierPath();
        return new AplicatieDashboardDto(
                a.getId(),
                a.getPost().getId(),
                a.getNumeCandidat(),
                a.getEmail(),
                a.getCvNumeFisier(),
                path != null && !path.isBlank(),
                a.getVideoNumeFisier(),
                videoPath != null && !videoPath.isBlank(),
                a.getDataAplicare(),
                a.getCvContinut(),
                a.isAiCvReview(),
                a.getCvJobMatchScore(),
                a.getAiCvMatchScore(),
                a.getAiCvObservatii(),
                a.getAiCvConcluzii(),
                a.isVizibilIntervievatoriTehnic(),
                a.getPipelineState(),
                readReviewEnglezaAutomatFromPipeline(a.getPipelineState()),
                a.getEnglezaAiScore(),
                a.getEnglezaAiPerformanceStatus(),
                a.getEnglezaAiVerdict(),
                a.getEnglezaAiSummary(),
                a.getEnglezaAiTooltipSummary(),
                a.getEnglezaAiError(),
                a.getEnglezaAiAnalyzedAt());
    }

    public List<Aplicatie> findAll() {
        return aplicatieRepository.findAll();
    }
}
