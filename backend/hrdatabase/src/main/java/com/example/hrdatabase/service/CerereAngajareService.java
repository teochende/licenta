package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.CerereAngajareCreateRequest;
import com.example.hrdatabase.dto.request.CerereAngajareUpdateRequest;
import com.example.hrdatabase.dto.request.CerereOpenPostRequest;
import com.example.hrdatabase.dto.response.CerereAngajareViewDto;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.CerereAngajare;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.DescriereCerereMod;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.mapper.CerereAngajareMapper;
import com.example.hrdatabase.mapper.PostMapper;
import com.example.hrdatabase.repository.CerereAngajareRepository;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CerereAngajareService {

    private final CerereAngajareRepository cerereAngajareRepository;
    private final DepartamentRepository departamentRepository;
    private final UtilizatorRepository utilizatorRepository;
    private final PostRepository postRepository;
    private final CerereDescriereFileStorageService fileStorageService;

    public CerereAngajareService(
            CerereAngajareRepository cerereAngajareRepository,
            DepartamentRepository departamentRepository,
            UtilizatorRepository utilizatorRepository,
            PostRepository postRepository,
            CerereDescriereFileStorageService fileStorageService) {
        this.cerereAngajareRepository = cerereAngajareRepository;
        this.departamentRepository = departamentRepository;
        this.utilizatorRepository = utilizatorRepository;
        this.postRepository = postRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public CerereAngajare save(CerereAngajareCreateRequest request) {
        Departament departament = departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));

        DescriereCerereMod mod = parseDescriereMod(request.descriereMod());
        if (mod == DescriereCerereMod.FISIER) {
            throw new IllegalArgumentException("Pentru descriere din fișier folosiți cererea multipart (upload).");
        }

        CerereAngajare c = new CerereAngajare();
        c.setNumePost(request.numePost());
        c.setSubdomeniu(trimToNull(request.subdomeniu()));
        c.setDescriereMod(DescriereCerereMod.MANUAL);
        c.setDescriere(request.descriere());
        c.setNrPozitii(request.nrPozitii() != null ? request.nrPozitii() : 1);
        c.setDepartament(departament);
        c.setStatus(request.status() != null ? request.status() : "pending");

        if (request.creatDeUtilizatorId() != null) {
            Utilizator creatDe = utilizatorRepository.findById(request.creatDeUtilizatorId())
                    .orElseThrow(() -> new IllegalArgumentException("Utilizator inexistent: " + request.creatDeUtilizatorId()));
            c.setCreatDe(creatDe);
        }

        if (request.postDeschisId() != null) {
            Post post = postRepository.findById(request.postDeschisId())
                    .orElseThrow(() -> new IllegalArgumentException("Post inexistent: " + request.postDeschisId()));
            c.setPostDeschis(post);
        }

        if (request.intervievatoriTehniciIds() != null && !request.intervievatoriTehniciIds().isEmpty()) {
            c.setIntervievatoriTehnici(new ArrayList<>(utilizatorRepository.findAllById(request.intervievatoriTehniciIds())));
        }

        if (request.recrutoriIds() != null && !request.recrutoriIds().isEmpty()) {
            attachRecrutori(c, request.recrutoriIds());
        }

        return cerereAngajareRepository.save(c);
    }

    @Transactional
    public CerereAngajare replaceIntervievatoriTehnici(Long cerereId, List<Long> utilizatorIds) {
        CerereAngajare c = cerereAngajareRepository.findByIdWithIntervievatori(cerereId)
                .orElseThrow(() -> new IllegalArgumentException("Cerere inexistentă: " + cerereId));
        if (utilizatorIds == null || utilizatorIds.isEmpty()) {
            c.getIntervievatoriTehnici().clear();
            return cerereAngajareRepository.save(c);
        }
        List<Utilizator> list = utilizatorRepository.findAllById(utilizatorIds);
        long distinctIds = utilizatorIds.stream().distinct().count();
        if (list.size() != distinctIds) {
            throw new IllegalArgumentException("Unul sau mai mulți utilizatori nu există.");
        }
        for (Utilizator u : list) {
            if (u.getRol() != Rol.INTERVIEVATOR_TEHNIC) {
                throw new IllegalArgumentException(
                        "Pentru cerere, utilizatorul " + u.getId() + " trebuie să aibă rolul INTERVIEVATOR_TEHNIC");
            }
        }
        c.getIntervievatoriTehnici().clear();
        c.getIntervievatoriTehnici().addAll(list);
        return cerereAngajareRepository.save(c);
    }

    public List<CerereAngajare> findAll() {
        return cerereAngajareRepository.findAll();
    }

    @Transactional
    public CerereAngajareViewDto createFromManager(CerereAngajareCreateRequest request, Utilizator manager) {
        if (manager.getRol() != Rol.MANAGER_DEPARTAMENT && manager.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Doar managerul de departament sau administratorul poate crea cereri.");
        }
        Departament departament = departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));
        assertDepartamentAllowedForCreate(manager, departament);

        DescriereCerereMod mod = parseDescriereMod(request.descriereMod());
        if (mod == DescriereCerereMod.FISIER) {
            throw new IllegalArgumentException(
                    "Pentru descriere încărcată din fișier folosiți formularul cu atașament (multipart), nu JSON.");
        }
        String desc = request.descriere() != null ? request.descriere().trim() : "";
        if (desc.isEmpty()) {
            throw new IllegalArgumentException("Pentru descriere manuală, completați câmpul descriere.");
        }

        CerereAngajare c = new CerereAngajare();
        c.setNumePost(request.numePost().trim());
        c.setSubdomeniu(trimToNull(request.subdomeniu()));
        c.setDescriereMod(DescriereCerereMod.MANUAL);
        c.setDescriere(desc);
        c.setNrPozitii(request.nrPozitii() != null ? request.nrPozitii() : 1);
        c.setDepartament(departament);
        c.setStatus("pending");
        c.setCreatDe(manager);

        attachIntervievatori(c, request.intervievatoriTehniciIds());
        attachRecrutori(c, request.recrutoriIds());

        CerereAngajare saved = cerereAngajareRepository.save(c);
        return CerereAngajareMapper.toView(saved);
    }

    @Transactional
    public CerereAngajareViewDto createFromManagerMultipart(
            String numePost,
            Integer nrPozitii,
            Long departamentId,
            String subdomeniu,
            String descriereModRaw,
            String descriereText,
            String intervievatoriIdsCsv,
            String recrutoriIdsCsv,
            MultipartFile file,
            Utilizator manager) throws IOException {
        if (manager.getRol() != Rol.MANAGER_DEPARTAMENT && manager.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Doar managerul de departament sau administratorul poate crea cereri.");
        }
        Departament departament = departamentRepository.findById(departamentId)
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + departamentId));
        assertDepartamentAllowedForCreate(manager, departament);

        DescriereCerereMod mod = parseDescriereMod(descriereModRaw);
        CerereAngajare c = new CerereAngajare();
        c.setNumePost(numePost != null ? numePost.trim() : "");
        if (c.getNumePost().isEmpty()) {
            throw new IllegalArgumentException("Numele postului este obligatoriu.");
        }
        c.setSubdomeniu(trimToNull(subdomeniu));
        c.setNrPozitii(nrPozitii != null && nrPozitii > 0 ? nrPozitii : 1);
        c.setDepartament(departament);
        c.setStatus("pending");
        c.setCreatDe(manager);
        c.setDescriereMod(mod);

        List<Long> intIds = parseIdsCsv(intervievatoriIdsCsv);
        attachIntervievatori(c, intIds);
        attachRecrutori(c, parseIdsCsv(recrutoriIdsCsv));

        if (mod == DescriereCerereMod.MANUAL) {
            String t = descriereText != null ? descriereText.trim() : "";
            if (t.isEmpty()) {
                throw new IllegalArgumentException("Introduceți descrierea manuală sau alegeți modul fișier.");
            }
            c.setDescriere(t);
            c.setDescriereFisierNume(null);
            c.setDescriereFisierPath(null);
        } else {
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Încărcați un fișier .pdf sau .docx pentru descriere.");
            }
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "descriere.pdf";
            String stored = fileStorageService.store(file);
            c.setDescriereFisierNume(originalName);
            c.setDescriereFisierPath(stored);
            String note = descriereText != null ? descriereText.trim() : "";
            c.setDescriere(note.isEmpty() ? null : note);
        }

        CerereAngajare saved = cerereAngajareRepository.save(c);
        return CerereAngajareMapper.toView(saved);
    }

    private void attachIntervievatori(CerereAngajare c, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        List<Utilizator> ints = utilizatorRepository.findAllById(ids);
        if (ints.size() != ids.stream().distinct().count()) {
            throw new IllegalArgumentException("Intervievator inexistent.");
        }
        for (Utilizator u : ints) {
            if (u.getRol() != Rol.INTERVIEVATOR_TEHNIC) {
                throw new IllegalArgumentException("Utilizatorul " + u.getId() + " nu este intervievator tehnic.");
            }
        }
        c.setIntervievatoriTehnici(new ArrayList<>(ints));
    }

    private void attachRecrutori(CerereAngajare c, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        List<Utilizator> list = utilizatorRepository.findAllById(ids);
        if (list.size() != ids.stream().distinct().count()) {
            throw new IllegalArgumentException("Recrutor inexistent.");
        }
        for (Utilizator u : list) {
            if (u.getRol() != Rol.RECRUTOR) {
                throw new IllegalArgumentException("Utilizatorul " + u.getId() + " nu este recrutor.");
            }
        }
        c.setRecrutori(new ArrayList<>(list));
    }

    private static void assertDepartamentAllowedForCreate(Utilizator user, Departament departament) {
        if (user.getRol() == Rol.ADMIN) {
            return;
        }
        if (user.getRol() == Rol.MANAGER_DEPARTAMENT) {
            if (user.getDepartament() == null || !user.getDepartament().getId().equals(departament.getId())) {
                throw new IllegalArgumentException("Puteți crea cereri doar pentru propriul departament.");
            }
            return;
        }
        throw new AccessDeniedException("Nu puteți crea cereri.");
    }

    private void assertCanManageCerere(Utilizator user, CerereAngajare c) {
        if (user.getRol() == Rol.ADMIN || user.getRol() == Rol.MANAGER_RECRUTARE) {
            return;
        }
        if (user.getRol() == Rol.MANAGER_DEPARTAMENT && c.getDepartament() != null
                && user.getDepartament() != null
                && user.getDepartament().getId().equals(c.getDepartament().getId())) {
            return;
        }
        throw new AccessDeniedException("Nu aveți dreptul să modificați această cerere.");
    }

    @Transactional(readOnly = true)
    public CerereAngajareViewDto getCerereView(Long id, Utilizator user) {
        CerereAngajare c = cerereAngajareRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Cerere inexistentă: " + id));
        assertCanManageCerere(user, c);
        return CerereAngajareMapper.toView(c);
    }

    @Transactional
    public CerereAngajareViewDto updateCerere(Long id, CerereAngajareUpdateRequest req, Utilizator user) {
        CerereAngajare c = cerereAngajareRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Cerere inexistentă: " + id));
        assertCanManageCerere(user, c);
        if (!"pending".equals(c.getStatus())) {
            throw new IllegalArgumentException("Puteți modifica doar cereri în așteptare.");
        }

        if (req.numePost() != null && !req.numePost().isBlank()) {
            c.setNumePost(req.numePost().trim());
        }
        if (req.subdomeniu() != null) {
            c.setSubdomeniu(trimToNull(req.subdomeniu()));
        }
        if (req.nrPozitii() != null && req.nrPozitii() > 0) {
            c.setNrPozitii(req.nrPozitii());
        }
        if (req.descriere() != null) {
            if (c.getDescriereMod() == DescriereCerereMod.MANUAL) {
                String t = req.descriere().trim();
                if (t.isEmpty()) {
                    throw new IllegalArgumentException("Descrierea nu poate fi goală.");
                }
                c.setDescriere(t);
            } else {
                c.setDescriere(trimToNull(req.descriere()));
            }
        }
        if (req.intervievatoriTehniciIds() != null) {
            replaceIntervievatori(c, req.intervievatoriTehniciIds());
        }
        if (req.recrutoriIds() != null) {
            replaceRecrutori(c, req.recrutoriIds());
        }

        CerereAngajare saved = cerereAngajareRepository.save(c);
        return CerereAngajareMapper.toView(saved);
    }

    private void replaceIntervievatori(CerereAngajare c, List<Long> ids) {
        c.getIntervievatoriTehnici().clear();
        if (ids.isEmpty()) {
            return;
        }
        List<Utilizator> ints = utilizatorRepository.findAllById(ids);
        if (ints.size() != ids.stream().distinct().count()) {
            throw new IllegalArgumentException("Intervievator inexistent.");
        }
        for (Utilizator u : ints) {
            if (u.getRol() != Rol.INTERVIEVATOR_TEHNIC) {
                throw new IllegalArgumentException("Utilizatorul " + u.getId() + " nu este intervievator tehnic.");
            }
        }
        c.getIntervievatoriTehnici().addAll(ints);
    }

    private void replaceRecrutori(CerereAngajare c, List<Long> ids) {
        c.getRecrutori().clear();
        if (ids.isEmpty()) {
            return;
        }
        List<Utilizator> list = utilizatorRepository.findAllById(ids);
        if (list.size() != ids.stream().distinct().count()) {
            throw new IllegalArgumentException("Recrutor inexistent.");
        }
        for (Utilizator u : list) {
            if (u.getRol() != Rol.RECRUTOR) {
                throw new IllegalArgumentException("Utilizatorul " + u.getId() + " nu este recrutor.");
            }
        }
        c.getRecrutori().addAll(list);
    }

    private static List<Long> parseIdsCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static DescriereCerereMod parseDescriereMod(String raw) {
        if (raw == null || raw.isBlank()) {
            return DescriereCerereMod.MANUAL;
        }
        try {
            return DescriereCerereMod.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("descriereMod trebuie să fie MANUAL sau FISIER.");
        }
    }

    @Transactional(readOnly = true)
    public List<CerereAngajareViewDto> findPendingViews() {
        return cerereAngajareRepository.findByStatusWithDetails("pending").stream()
                .map(CerereAngajareMapper::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CerereAngajareViewDto> findMineViews(Long utilizatorId) {
        Utilizator u = utilizatorRepository.findById(utilizatorId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizator inexistent: " + utilizatorId));
        if (u.getRol() == Rol.ADMIN) {
            return cerereAngajareRepository.findAllForListWithDetails().stream()
                    .map(CerereAngajareMapper::toView)
                    .toList();
        }
        if (u.getRol() != Rol.MANAGER_DEPARTAMENT || u.getDepartament() == null) {
            return List.of();
        }
        return cerereAngajareRepository.findByDepartamentIdWithDetails(u.getDepartament().getId()).stream()
                .map(CerereAngajareMapper::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource loadDescriereFisierResource(Long cerereId, Utilizator user) {
        CerereAngajare c = cerereAngajareRepository.findById(cerereId)
                .orElseThrow(() -> new IllegalArgumentException("Cerere inexistentă: " + cerereId));
        if (c.getDescriereMod() != DescriereCerereMod.FISIER
                || c.getDescriereFisierPath() == null || c.getDescriereFisierPath().isBlank()) {
            throw new IllegalArgumentException("Cererea nu are fișier de descriere.");
        }
        assertCanAccessCerereFisier(user, c);
        var path = fileStorageService.resolveStoredPath(c.getDescriereFisierPath());
        if (!Files.exists(path)) {
            throw new IllegalStateException("Fișierul nu mai este disponibil pe server.");
        }
        return new FileSystemResource(path);
    }

    @Transactional(readOnly = true)
    public String getDescriereFisierDownloadName(Long cerereId) {
        CerereAngajare c = cerereAngajareRepository.findById(cerereId)
                .orElseThrow(() -> new IllegalArgumentException("Cerere inexistentă: " + cerereId));
        return c.getDescriereFisierNume() != null ? c.getDescriereFisierNume() : "descriere.pdf";
    }

    private void assertCanAccessCerereFisier(Utilizator user, CerereAngajare c) {
        if (user.getRol() == Rol.ADMIN || user.getRol() == Rol.MANAGER_RECRUTARE) {
            return;
        }
        if (user.getRol() == Rol.MANAGER_DEPARTAMENT && c.getDepartament() != null
                && user.getDepartament() != null
                && c.getDepartament().getId().equals(user.getDepartament().getId())) {
            return;
        }
        throw new AccessDeniedException("Nu aveți acces la acest fișier.");
    }

    @Transactional
    public PostViewDto openCerere(Long cerereId, CerereOpenPostRequest body, Utilizator user) {
        if (user.getRol() != Rol.MANAGER_RECRUTARE && user.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Doar managerul de recrutare sau adminul poate deschide postul.");
        }
        CerereAngajare c = cerereAngajareRepository.findByIdForOpen(cerereId)
                .orElseThrow(() -> new IllegalArgumentException("Cerere inexistentă: " + cerereId));
        if (!"pending".equals(c.getStatus())) {
            throw new IllegalArgumentException("Cererea nu mai este în așteptare.");
        }
        List<Long> recIds = body.recrutoriIds() != null ? body.recrutoriIds() : List.of();
        Set<Utilizator> recrutori = new HashSet<>(utilizatorRepository.findAllById(recIds));
        if (recrutori.size() != recIds.stream().distinct().count()) {
            throw new IllegalArgumentException("Unul sau mai mulți recrutori nu există.");
        }
        for (Utilizator u : recrutori) {
            if (u.getRol() != Rol.RECRUTOR) {
                throw new IllegalArgumentException("Utilizatorul " + u.getId() + " nu este recrutor.");
            }
        }

        Post post = new Post();
        post.setDepartament(c.getDepartament());
        String sub = c.getSubdomeniu();
        post.setSubdomeniu(sub != null && !sub.isBlank() ? sub : "—");
        post.setNume(c.getNumePost());
        post.setNivel("—");
        post.setDescriere(buildPostDescriereFromCerere(c));
        post.setEnabled(true);
        post.setPrioritate("mica");
        Long depId = c.getDepartament().getId();
        Integer maxO = postRepository.findMaxOrdineDashboardByDepartamentId(depId);
        post.setOrdineDashboard(maxO != null && maxO >= 0 ? maxO + 1 : 0);
        post.setRecrutori(recrutori);
        post.setIntervievatori(new HashSet<>(c.getIntervievatoriTehnici()));

        Post saved = postRepository.save(post);
        c.setPostDeschis(saved);
        c.setStatus("deschis");
        cerereAngajareRepository.save(c);

        return postRepository.findByIdWithAssignments(saved.getId())
                .map(PostMapper::toView)
                .orElseThrow(() -> new IllegalStateException("Post salvat dar negăsit: " + saved.getId()));
    }

    private static String buildPostDescriereFromCerere(CerereAngajare c) {
        if (c.getDescriereMod() == DescriereCerereMod.FISIER) {
            String fn = c.getDescriereFisierNume() != null ? c.getDescriereFisierNume() : "fișier";
            String base = "Descrierea detaliată a postului este în fișierul atașat la cerere: " + fn
                    + " (cerere #" + c.getId() + "). ";
            if (c.getDescriere() != null && !c.getDescriere().isBlank()) {
                return base + "Note suplimentare: " + c.getDescriere();
            }
            return base + "Contactați HR pentru detalii.";
        }
        return c.getDescriere() != null ? c.getDescriere() : "";
    }
}
