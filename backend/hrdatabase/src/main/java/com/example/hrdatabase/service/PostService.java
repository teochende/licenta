package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.PostCreateRequest;
import com.example.hrdatabase.dto.request.PostDashboardOrderRequest;
import com.example.hrdatabase.dto.request.PostPatchRequest;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final DepartamentRepository departamentRepository;
    private final UtilizatorRepository utilizatorRepository;
    private final AplicatieRepository aplicatieRepository;
    private final CerereAngajareRepository cerereAngajareRepository;
    private final PostAccessService postAccessService;
    private final PostDescriereFileStorageService postDescriereFileStorageService;

    public PostService(
            PostRepository postRepository,
            DepartamentRepository departamentRepository,
            UtilizatorRepository utilizatorRepository,
            AplicatieRepository aplicatieRepository,
            CerereAngajareRepository cerereAngajareRepository,
            PostAccessService postAccessService,
            PostDescriereFileStorageService postDescriereFileStorageService) {
        this.postRepository = postRepository;
        this.departamentRepository = departamentRepository;
        this.utilizatorRepository = utilizatorRepository;
        this.aplicatieRepository = aplicatieRepository;
        this.cerereAngajareRepository = cerereAngajareRepository;
        this.postAccessService = postAccessService;
        this.postDescriereFileStorageService = postDescriereFileStorageService;
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
                .map(PostMapper::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PostViewDto> findPostDtosFor(Utilizator utilizator) {
        return postRepository.findAll().stream()
                .filter(p -> postAccessService.canViewPost(utilizator, p))
                .map(PostMapper::toView)
                .toList();
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
}
