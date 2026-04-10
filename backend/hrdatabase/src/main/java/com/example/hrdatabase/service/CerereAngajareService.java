package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.CerereAngajareCreateRequest;
import com.example.hrdatabase.dto.request.CerereOpenPostRequest;
import com.example.hrdatabase.dto.response.CerereAngajareViewDto;
import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.CerereAngajare;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.CerereAngajareRepository;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import com.example.hrdatabase.mapper.CerereAngajareMapper;
import com.example.hrdatabase.mapper.PostMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CerereAngajareService {

    private final CerereAngajareRepository cerereAngajareRepository;
    private final DepartamentRepository departamentRepository;
    private final UtilizatorRepository utilizatorRepository;
    private final PostRepository postRepository;

    public CerereAngajareService(
            CerereAngajareRepository cerereAngajareRepository,
            DepartamentRepository departamentRepository,
            UtilizatorRepository utilizatorRepository,
            PostRepository postRepository) {
        this.cerereAngajareRepository = cerereAngajareRepository;
        this.departamentRepository = departamentRepository;
        this.utilizatorRepository = utilizatorRepository;
        this.postRepository = postRepository;
    }

    @Transactional
    public CerereAngajare save(CerereAngajareCreateRequest request) {
        Departament departament = departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));

        CerereAngajare c = new CerereAngajare();
        c.setNumePost(request.numePost());
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
        if (manager.getRol() != Rol.MANAGER_DEPARTAMENT) {
            throw new AccessDeniedException("Doar managerul de departament poate crea cereri.");
        }
        Departament departament = departamentRepository.findById(request.departamentId())
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));
        if (manager.getDepartament() == null
                || !manager.getDepartament().getId().equals(departament.getId())) {
            throw new IllegalArgumentException("Puteți crea cereri doar pentru propriul departament.");
        }

        CerereAngajare c = new CerereAngajare();
        c.setNumePost(request.numePost());
        c.setDescriere(request.descriere());
        c.setNrPozitii(request.nrPozitii() != null ? request.nrPozitii() : 1);
        c.setDepartament(departament);
        c.setStatus("pending");
        c.setCreatDe(manager);

        if (request.intervievatoriTehniciIds() != null && !request.intervievatoriTehniciIds().isEmpty()) {
            List<Utilizator> ints = utilizatorRepository.findAllById(request.intervievatoriTehniciIds());
            if (ints.size() != request.intervievatoriTehniciIds().stream().distinct().count()) {
                throw new IllegalArgumentException("Intervievator inexistent.");
            }
            for (Utilizator u : ints) {
                if (u.getRol() != Rol.INTERVIEVATOR_TEHNIC) {
                    throw new IllegalArgumentException("Utilizatorul " + u.getId() + " nu este intervievator tehnic.");
                }
            }
            c.setIntervievatoriTehnici(new ArrayList<>(ints));
        }

        CerereAngajare saved = cerereAngajareRepository.save(c);
        return CerereAngajareMapper.toView(saved);
    }

    @Transactional(readOnly = true)
    public List<CerereAngajareViewDto> findPendingViews() {
        return cerereAngajareRepository.findByStatusWithDetails("pending").stream()
                .map(CerereAngajareMapper::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CerereAngajareViewDto> findMineViews(Long managerId) {
        return cerereAngajareRepository.findByCreatDeIdWithDetails(managerId).stream()
                .map(CerereAngajareMapper::toView)
                .toList();
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
        post.setSubdomeniu("—");
        post.setNume(c.getNumePost());
        post.setNivel("—");
        post.setDescriere(c.getDescriere() != null ? c.getDescriere() : "");
        post.setEnabled(true);
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
}
