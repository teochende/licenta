package com.example.hrdatabase.service;

import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.repository.CerereAngajareRepository;
import com.example.hrdatabase.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * La schimbarea rolului sau la ștergerea unui utilizator, elimină asignările incompatibile
 * (recrutor/intervievator pe posturi, intervievator pe cereri).
 */
@Service
public class RoleAssignmentCleanupService {

    private final PostRepository postRepository;
    private final CerereAngajareRepository cerereAngajareRepository;

    public RoleAssignmentCleanupService(
            PostRepository postRepository,
            CerereAngajareRepository cerereAngajareRepository) {
        this.postRepository = postRepository;
        this.cerereAngajareRepository = cerereAngajareRepository;
    }

    /**
     * Rulează după ce noul rol este deja persistat pe entitate (sau înainte de delete user).
     */
    @Transactional
    public void afterRoleChange(Long utilizatorId, Rol vechi, Rol nou) {
        if (vechi == nou) {
            return;
        }
        if (nou != Rol.RECRUTOR) {
            postRepository.deleteAllRecrutoriAssignmentsForUser(utilizatorId);
            cerereAngajareRepository.deleteAllCerereRecrutoriForUser(utilizatorId);
        }
        if (nou != Rol.INTERVIEVATOR_TEHNIC) {
            postRepository.deleteAllIntervievatoriAssignmentsForUser(utilizatorId);
            cerereAngajareRepository.deleteAllCerereIntervievatoriForUser(utilizatorId);
        }
    }

    @Transactional
    public void removeAllAssignmentsForUser(Long utilizatorId) {
        postRepository.deleteAllRecrutoriAssignmentsForUser(utilizatorId);
        postRepository.deleteAllIntervievatoriAssignmentsForUser(utilizatorId);
        cerereAngajareRepository.deleteAllCerereIntervievatoriForUser(utilizatorId);
        cerereAngajareRepository.deleteAllCerereRecrutoriForUser(utilizatorId);
    }

    @Transactional
    public void beforeUserDeleted(Long utilizatorId) {
        removeAllAssignmentsForUser(utilizatorId);
        cerereAngajareRepository.clearCreatDeByUserId(utilizatorId);
    }
}
