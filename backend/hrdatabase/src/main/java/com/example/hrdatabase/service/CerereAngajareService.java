package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.CerereAngajareCreateRequest;
import com.example.hrdatabase.entity.CerereAngajare;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.CerereAngajareRepository;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

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
}
