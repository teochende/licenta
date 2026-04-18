package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.dto.request.PostDashboardOrderRequest;
import com.example.hrdatabase.dto.request.PostPatchRequest;
import com.example.hrdatabase.dto.response.PageResponse;
import com.example.hrdatabase.dto.response.PosturiDisponibileMetaDto;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.mapper.PostMapper;
import com.example.hrdatabase.repository.AplicatieRepository;
import com.example.hrdatabase.repository.CerereAngajareRepository;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import com.example.hrdatabase.validation.PostDescriereSectionValidator;
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
public class PostService {

    private static final Logger log = LoggerFactory.getLogger(PostService.class);

    private final PostRepository postRepository;
    private final DepartamentRepository departamentRepository;
    private final UtilizatorRepository utilizatorRepository;
    private final AplicatieRepository aplicatieRepository;
    private final CerereAngajareRepository cerereAngajareRepository;
    private final PostAccessService postAccessService;
    private final PostDescriereFileStorageService postDescriereFileStorageService;
    private final DocumentTextExtractor documentTextExtractor;

    public PostService(
            PostRepository postRepository,
            DepartamentRepository departamentRepository,
            UtilizatorRepository utilizatorRepository,
            AplicatieRepository aplicatieRepository,
            CerereAngajareRepository cerereAngajareRepository,
            PostAccessService postAccessService,
            PostDescriereFileStorageService postDescriereFileStorageService,
            DocumentTextExtractor documentTextExtractor) {
        this.postRepository = postRepository;
        this.departamentRepository = departamentRepository;
        this.utilizatorRepository = utilizatorRepository;
        this.aplicatieRepository = aplicatieRepository;
        this.cerereAngajareRepository = cerereAngajareRepository;
        this.postAccessService = postAccessService;
        this.postDescriereFileStorageService = postDescriereFileStorageService;
        this.documentTextExtractor = documentTextExtractor;
    }

    @Transactional
    public PostViewDto save(PostCreateRequest request) {
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
        post.setPrioritate("mica");
        Integer maxO = postRepository.findMaxOrdineDashboardByDepartamentId(departament.getId());
        post.setOrdineDashboard(maxO != null && maxO >= 0 ? maxO + 1 : 0);

        assertDescriereSectiuniObligatorii(post);
        return PostMapper.toView(postRepository.save(post));
    }

    @Transactional
    public PostViewDto updateFull(Long postId, PostCreateRequest request) {
        Post post = postRepository.findByIdWithAssignments(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        Departament departament = departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));
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
        assertDescriereSectiuniObligatorii(post);
        return PostMapper.toView(postRepository.save(post));
    }

    @Transactional
    public void deleteById(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        if (post.getDescriereFisierPath() != null && !post.getDescriereFisierPath().isBlank()) {
            postDescriereFileStorageService.deleteIfExists(post.getDescriereFisierPath());
        }
        cerereAngajareRepository.clearPostDeschisByPostId(postId);
        aplicatieRepository.deleteByPostId(postId);
        postRepository.deleteById(postId);
    }

    @Transactional
    public PostViewDto uploadDescriereFisier(Long postId, MultipartFile file, Utilizator utilizator) throws IOException {
        assertAdminOrManagerRecrutare(utilizator);
        Post post = postRepository.findByIdWithAssignments(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        String stored = postDescriereFileStorageService.store(file);
        String old = post.getDescriereFisierPath();
        if (old != null && !old.isBlank()) {
            postDescriereFileStorageService.deleteIfExists(old);
        }
        post.setDescriereFisierPath(stored);
        String nume = file.getOriginalFilename();
        post.setDescriereFisierNume(nume != null && !nume.isBlank() ? nume : "descriere");
        assertDescriereSectiuniObligatorii(post);
        return PostMapper.toView(postRepository.save(post));
    }

    @Transactional
    public PostViewDto clearDescriereFisier(Long postId, Utilizator utilizator) {
        assertAdminOrManagerRecrutare(utilizator);
        Post post = postRepository.findByIdWithAssignments(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        String old = post.getDescriereFisierPath();
        if (old != null && !old.isBlank()) {
            postDescriereFileStorageService.deleteIfExists(old);
        }
        post.setDescriereFisierPath(null);
        post.setDescriereFisierNume(null);
        assertDescriereSectiuniObligatorii(post);
        return PostMapper.toView(postRepository.save(post));
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> getDescriereFisierResponse(Long postId, Utilizator utilizator) {
        Post post = postRepository.findByIdWithAssignments(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        if (!postAccessService.canViewPost(utilizator, post)) {
            throw new AccessDeniedException("Nu aveți acces la acest post.");
        }
        String pathStr = post.getDescriereFisierPath();
        if (pathStr == null || pathStr.isBlank()) {
            throw new IllegalArgumentException("Nu există fișier de descriere pentru acest post.");
        }
        var path = postDescriereFileStorageService.resolveStoredPath(pathStr);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("Fișierul de descriere lipsește de pe disc.");
        }
        Resource resource = new FileSystemResource(path);
        String displayName = post.getDescriereFisierNume() != null && !post.getDescriereFisierNume().isBlank()
                ? post.getDescriereFisierNume()
                : path.getFileName().toString();
        String lower = displayName.toLowerCase(Locale.ROOT);
        boolean inline = lower.endsWith(".pdf");
        MediaType mediaType = lower.endsWith(".pdf")
                ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        ContentDisposition disposition = ContentDisposition.builder(inline ? "inline" : "attachment")
                .filename(displayName, StandardCharsets.UTF_8)
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentDisposition(disposition);
        return ResponseEntity.ok().headers(headers).body(resource);
    }

    private static void assertAdminOrManagerRecrutare(Utilizator utilizator) {
        if (utilizator.getRol() != Rol.ADMIN && utilizator.getRol() != Rol.MANAGER_RECRUTARE) {
            throw new AccessDeniedException("Doar administratorul sau managerul de recrutare pot modifica fișierul de descriere.");
        }
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

    @Transactional(readOnly = true)
    public List<PostViewDto> findPublicEnabledDtos() {
        return postRepository.findAll().stream()
                .filter(Post::isEnabled)
                .map(this::toViewForListing)
                .toList();
    }

    @Transactional(readOnly = true)
    public PosturiDisponibileMetaDto findPublicEnabledMeta() {
        TreeSet<String> domenii = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        TreeSet<String> subdomenii = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        TreeSet<String> niveluri = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for (Post p : postRepository.findAll()) {
            if (!p.isEnabled()) {
                continue;
            }
            String d = depName(p);
            if (!d.isBlank()) {
                domenii.add(d);
            }
            if (p.getSubdomeniu() != null && !p.getSubdomeniu().isBlank()) {
                subdomenii.add(p.getSubdomeniu());
            }
            if (p.getNivel() != null && !p.getNivel().isBlank()) {
                niveluri.add(p.getNivel());
            }
        }
        return new PosturiDisponibileMetaDto(List.copyOf(domenii), List.copyOf(subdomenii), List.copyOf(niveluri));
    }

    /**
     * Listă publică paginată: filtre exacte pe domeniu (nume departament), subdomeniu, nivel; căutare {@code q}
     * pe nume, subdomeniu, nivel, nume departament (ca în administrare).
     */
    @Transactional(readOnly = true)
    public PageResponse<PostViewDto> findPublicEnabledDtosPaged(
            String q, String domeniu, String subdomeniu, String nivel, int page, int size) {
        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String dExact = domeniu != null ? domeniu.trim() : "";
        String sdExact = subdomeniu != null ? subdomeniu.trim() : "";
        String nExact = nivel != null ? nivel.trim() : "";

        Comparator<Post> cmp = Comparator.comparing(PostService::depName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(
                        p -> p.getNume() != null ? p.getNume() : "",
                        String.CASE_INSENSITIVE_ORDER);

        List<Post> filtered = postRepository.findAll().stream()
                .filter(Post::isEnabled)
                .filter(p -> dExact.isEmpty() || depName(p).equals(dExact))
                .filter(p -> sdExact.isEmpty() || Objects.equals(nullToEmpty(p.getSubdomeniu()), sdExact))
                .filter(p -> nExact.isEmpty() || Objects.equals(nullToEmpty(p.getNivel()), nExact))
                .filter(p -> qNorm.isEmpty() || postMatchesAdminQuery(p, qNorm))
                .sorted(cmp)
                .toList();

        long total = filtered.size();
        int safeSize = Math.max(1, Math.min(100, size));
        int safePage = Math.max(0, page);
        int from = (int) Math.min((long) safePage * safeSize, total);
        int to = (int) Math.min(from + safeSize, total);
        List<PostViewDto> content =
                from >= to ? List.of() : filtered.subList(from, to).stream().map(this::toViewForListing).toList();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
        return new PageResponse<>(content, total, safePage, safeSize, totalPages);
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }

    private static String depName(Post p) {
        if (p.getDepartament() == null || p.getDepartament().getNume() == null) {
            return "";
        }
        return p.getDepartament().getNume();
    }

    @Transactional(readOnly = true)
    public List<PostViewDto> findPostDtosFor(Utilizator utilizator) {
        return postRepository.findAll().stream()
                .filter(p -> postAccessService.canViewPost(utilizator, p))
                .map(this::toViewForListing)
                .toList();
    }

    /**
     * Aceleași drepturi ca {@link #findPostDtosFor(Utilizator)}, cu căutare/filtrare și paginare în memorie
     * (după filtrarea accesului), pentru ecrane de administrare.
     */
    @Transactional(readOnly = true)
    public PageResponse<PostViewDto> findPostDtosForPaged(
            Utilizator utilizator,
            String q,
            Boolean enabled,
            Long departamentId,
            int page,
            int size) {
        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        List<Post> filtered = postRepository.findAll().stream()
                .filter(p -> postAccessService.canViewPost(utilizator, p))
                .filter(p -> enabled == null || p.isEnabled() == enabled)
                .filter(p -> departamentId == null
                        || (p.getDepartament() != null && departamentId.equals(p.getDepartament().getId())))
                .filter(p -> qNorm.isEmpty() || postMatchesAdminQuery(p, qNorm))
                .toList();
        long total = filtered.size();
        int safeSize = Math.max(1, Math.min(100, size));
        int safePage = Math.max(0, page);
        int from = (int) Math.min((long) safePage * safeSize, total);
        int to = (int) Math.min(from + safeSize, total);
        List<PostViewDto> content =
                from >= to ? List.of() : filtered.subList(from, to).stream().map(this::toViewForListing).toList();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
        return new PageResponse<>(content, total, safePage, safeSize, totalPages);
    }

    private static boolean postMatchesAdminQuery(Post p, String qNorm) {
        if (p.getNume() != null && p.getNume().toLowerCase(Locale.ROOT).contains(qNorm)) {
            return true;
        }
        if (p.getSubdomeniu() != null && p.getSubdomeniu().toLowerCase(Locale.ROOT).contains(qNorm)) {
            return true;
        }
        if (p.getNivel() != null && p.getNivel().toLowerCase(Locale.ROOT).contains(qNorm)) {
            return true;
        }
        return p.getDepartament() != null
                && p.getDepartament().getNume() != null
                && p.getDepartament().getNume().toLowerCase(Locale.ROOT).contains(qNorm);
    }

    /**
     * Text descriere pentru afișare: descrierea introdusă ca text sau, dacă lipsește, text extras din fișierul PDF/DOCX.
     * Zona de keywords (linii care încep cu {@code =keywords=}) este exclusă din afișare.
     */
    private PostViewDto toViewForListing(Post p) {
        PostViewDto base = PostMapper.toView(p);
        String descriereAfisare = buildDescriereAfisareFaraKeywords(p);
        return new PostViewDto(
                base.id(),
                base.departamentId(),
                base.domeniu(),
                base.subdomeniu(),
                base.nume(),
                base.nivel(),
                descriereAfisare,
                base.descriereFisierNume(),
                base.descriereFisierStocat(),
                base.enabled(),
                base.prioritate(),
                base.ordineDashboard(),
                base.assignedRecrutori(),
                base.assignedIntervievatori()
        );
    }

    private String buildDescriereAfisareFaraKeywords(Post post) {
        if (post == null) {
            return "";
        }
        String text = post.getDescriere();
        if (text == null || text.isBlank()) {
            String pathStr = post.getDescriereFisierPath();
            if (pathStr != null && !pathStr.isBlank()) {
                try {
                    var path = postDescriereFileStorageService.resolveStoredPath(pathStr);
                    if (Files.exists(path)) {
                        byte[] bytes = Files.readAllBytes(path);
                        // Pentru extensie folosim numele real de pe disc (uuid.pdf / uuid.docx),
                        // ca să funcționeze chiar dacă numele original nu conține extensie.
                        text = documentTextExtractor.extractFromBytes(bytes, path.getFileName().toString());
                        if (text == null || text.isBlank()) {
                            log.warn(
                                    "Nu s-a putut extrage descrierea pentru post {} din fișierul {} (nume afișare: {}).",
                                    post.getId(),
                                    pathStr,
                                    post.getDescriereFisierNume());
                        }
                    } else {
                        log.warn("Fișier descriere lipsă pe disc pentru post {}: {}", post.getId(), pathStr);
                    }
                } catch (Exception e) {
                    log.warn(
                            "Eroare la extragerea descrierii pentru post {} din {}: {}",
                            post.getId(),
                            pathStr,
                            e.getMessage());
                }
            }
        }
        return stripKeywordsSection(text != null ? text : "");
    }

    /**
     * Returnează doar conținutul de job până la prima linie care începe cu {@code =keywords=}.
     * Keywords-urile rămân doar în fișier / textul original folosit de angajați, nu în afișare.
     */
    private static String stripKeywordsSection(String s) {
        if (s == null || s.isBlank()) {
            return "";
        }
        String[] lines = s.replace("\r\n", "\n").split("\n", -1);
        StringBuilder out = new StringBuilder();
        for (String line : lines) {
            String t = line != null ? line.trim() : "";
            if (t.startsWith("=keywords=")) {
                break;
            }
            // Dacă există o zonă marcată „keywords / key words / cuvinte cheie”, nu o afișăm public (și oprim acolo).
            String lower = t.toLowerCase(Locale.ROOT);
            if (lower.contains("keywords")
                    || lower.contains("key words")
                    || lower.contains("key-words")
                    || lower.contains("cuvinte cheie")) {
                break;
            }
            // Ascundem delimitatorul intern (și liniile cu doar '=') din descrierile publice.
            // Exemplu:
            // ====================================================================
            // // for internal usage – do not publish on the public job description
            // ====================================================================
            if (!t.isEmpty()
                    && t.chars().allMatch(ch -> ch == '=')
                    && t.length() >= 12) {
                continue;
            }
            if (lower.contains("for internal usage") || lower.contains("do not publish")) {
                continue;
            }
            if (!out.isEmpty()) out.append('\n');
            out.append(line);
        }
        return out.toString().trim();
    }

    @Transactional
    public PostViewDto setIntervievatoriForDepartmentManager(Long postId, List<Long> intervievatoriIds, Utilizator manager) {
        if (manager.getRol() != Rol.MANAGER_DEPARTAMENT) {
            throw new AccessDeniedException("Doar managerul de departament poate modifica intervievatorii pe posturile din departament.");
        }
        if (manager.getDepartament() == null) {
            throw new IllegalStateException("Manager fără departament atribuit.");
        }
        Post post = postRepository.findByIdWithAssignments(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + postId));
        if (post.getDepartament() == null || !manager.getDepartament().getId().equals(post.getDepartament().getId())) {
            throw new AccessDeniedException("Postul nu aparține departamentului dvs.");
        }
        Set<Utilizator> intervievatori = loadUtilizatori(intervievatoriIds != null ? intervievatoriIds : List.of());
        assertRolSet(intervievatori, Rol.INTERVIEVATOR_TEHNIC, "Intervievator tehnic");
        post.setIntervievatori(intervievatori);
        return PostMapper.toView(postRepository.save(post));
    }

    @Transactional
    public PostViewDto patchPost(Long id, PostPatchRequest request, Utilizator utilizator) {
        if (request.descriere() == null && request.enabled() == null
                && request.prioritate() == null && request.ordineDashboard() == null) {
            throw new IllegalArgumentException("Trimiteți cel puțin un câmp de modificat.");
        }
        Post post = postRepository.findByIdWithAssignments(id)
                .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + id));
        if (!postAccessService.canViewPost(utilizator, post)) {
            throw new AccessDeniedException("Nu aveți acces la acest post.");
        }
        if (request.descriere() != null) {
            if (!postAccessService.canEditDescriere(utilizator, post)) {
                throw new AccessDeniedException("Nu puteți modifica descrierea acestui post.");
            }
            post.setDescriere(request.descriere());
            assertDescriereSectiuniObligatorii(post);
        }
        if (request.enabled() != null) {
            if (!postAccessService.canToggleEnabled(utilizator)) {
                throw new AccessDeniedException("Nu puteți activa/dezactiva posturi.");
            }
            post.setEnabled(request.enabled());
        }
        if (request.prioritate() != null) {
            if (!postAccessService.canEditPostDashboardFields(utilizator, post)) {
                throw new AccessDeniedException("Nu puteți modifica prioritatea acestui post.");
            }
            post.setPrioritate(normalizePrioritate(request.prioritate()));
        }
        if (request.ordineDashboard() != null) {
            if (!postAccessService.canEditPostDashboardFields(utilizator, post)) {
                throw new AccessDeniedException("Nu puteți modifica ordinea acestui post.");
            }
            post.setOrdineDashboard(request.ordineDashboard());
        }
        return PostMapper.toView(postRepository.save(post));
    }

    @Transactional
    public List<PostViewDto> updateDashboardOrder(PostDashboardOrderRequest request, Utilizator utilizator) {
        if (request.departamentId() == null || request.postIdsOrdered() == null) {
            throw new IllegalArgumentException("departamentId și postIdsOrdered sunt obligatorii.");
        }
        if (utilizator.getRol() == Rol.RECRUTOR || utilizator.getRol() == Rol.INTERVIEVATOR_TEHNIC) {
            throw new AccessDeniedException("Reordonarea este disponibilă pentru HR, administrator sau manager departament.");
        }
        if (utilizator.getRol() == Rol.MANAGER_DEPARTAMENT) {
            if (utilizator.getDepartament() == null
                    || !utilizator.getDepartament().getId().equals(request.departamentId())) {
                throw new AccessDeniedException("Puteți reordona doar posturile din departamentul dvs.");
            }
        }
        List<Long> ids = request.postIdsOrdered();
        departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));
        List<Post> toSave = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            Long pid = ids.get(i);
            Post p = postRepository.findByIdWithAssignments(pid)
                    .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + pid));
            if (p.getDepartament() == null || !p.getDepartament().getId().equals(request.departamentId())) {
                throw new IllegalArgumentException("Postul " + pid + " nu aparține departamentului indicat.");
            }
            if (!postAccessService.canEditPostDashboardFields(utilizator, p)) {
                throw new AccessDeniedException("Nu aveți dreptul să modificați ordinea postului " + pid + ".");
            }
            p.setOrdineDashboard(i);
            toSave.add(p);
        }
        postRepository.saveAll(toSave);
        return toSave.stream().map(PostMapper::toView).collect(Collectors.toList());
    }

    private static String normalizePrioritate(String raw) {
        if (raw == null || raw.isBlank()) {
            return "mica";
        }
        String s = raw.trim().toLowerCase();
        if (!Set.of("critic", "mare", "medie", "mica").contains(s)) {
            throw new IllegalArgumentException("prioritate trebuie să fie critic, mare, medie sau mica.");
        }
        return s;
    }

    /**
     * Dacă există text public de afișat (câmp text sau extras din fișier), trebuie să includă toate secțiunile standard.
     */
    private void assertDescriereSectiuniObligatorii(Post post) {
        String afisare = buildDescriereAfisareFaraKeywords(post);
        if (afisare == null || afisare.isBlank()) {
            return;
        }
        PostDescriereSectionValidator.assertComplete(afisare);
    }
}
