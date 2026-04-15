package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.DepartamentCreateRequest;
import com.example.hrdatabase.dto.request.DepartamentUpdateRequest;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.PostRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DepartamentService {

    private final DepartamentRepository departamentRepository;
    private final PostRepository postRepository;
    private final UtilizatorRepository utilizatorRepository;
    private final RoleAssignmentCleanupService roleAssignmentCleanupService;

    public DepartamentService(
            DepartamentRepository departamentRepository,
            PostRepository postRepository,
            UtilizatorRepository utilizatorRepository,
            RoleAssignmentCleanupService roleAssignmentCleanupService) {
        this.departamentRepository = departamentRepository;
        this.postRepository = postRepository;
        this.utilizatorRepository = utilizatorRepository;
        this.roleAssignmentCleanupService = roleAssignmentCleanupService;
    }

    @Transactional
    public Departament save(DepartamentCreateRequest request) {
        Departament d = new Departament(request.nume());
        return departamentRepository.save(d);
    }

    @Transactional
    public Departament update(Long id, DepartamentUpdateRequest request) {
        Departament d = departamentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + id));
        d.setNume(request.nume());
        return departamentRepository.save(d);
    }

    @Transactional
    public void deleteById(Long id) {
        if (postRepository.countByDepartament_Id(id) > 0) {
            throw new IllegalArgumentException(
                    "Nu se poate șterge departamentul: există posturi asociate. Ștergeți sau mutați posturile mai întâi.");
        }
        if (utilizatorRepository.countByDepartament_Id(id) > 0) {
            throw new IllegalArgumentException(
                    "Nu se poate șterge departamentul: există utilizatori legați de acest departament. "
                            + "Reatribuiți managerii sau modificați departamentul utilizatorilor.");
        }
        departamentRepository.deleteById(id);
    }

    /**
     * Setează un singur manager de departament: utilizatorul primește rolul {@link Rol#MANAGER_DEPARTAMENT}
     * și departamentul; ceilalți manageri ai aceluiași departament sunt retrogradați la
     * {@link Rol#MANAGER_RECRUTARE} (fără departament) și se curăță asignările incompatibile.
     */
    @Transactional
    public Departament assignManager(Long departamentId, Long utilizatorId) {
        Departament dep = departamentRepository.findById(departamentId)
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + departamentId));
        Utilizator noulManager = utilizatorRepository.findById(utilizatorId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizator inexistent: " + utilizatorId));

        for (Utilizator alt : utilizatorRepository.findByDepartament_IdAndRol(departamentId, Rol.MANAGER_DEPARTAMENT)) {
            if (alt.getId().equals(utilizatorId)) {
                continue;
            }
            Rol vechi = alt.getRol();
            alt.setRol(Rol.MANAGER_RECRUTARE);
            alt.setDepartament(null);
            roleAssignmentCleanupService.afterRoleChange(alt.getId(), vechi, Rol.MANAGER_RECRUTARE);
            utilizatorRepository.save(alt);
        }

        Rol vechiN = noulManager.getRol();
        noulManager.setRol(Rol.MANAGER_DEPARTAMENT);
        noulManager.setDepartament(dep);
        roleAssignmentCleanupService.afterRoleChange(noulManager.getId(), vechiN, Rol.MANAGER_DEPARTAMENT);
        utilizatorRepository.save(noulManager);
        return dep;
    }

    public List<Departament> findAll() {
        return departamentRepository.findAll();
    }
}
