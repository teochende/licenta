package com.example.hrdatabase.service;

import com.example.hrdatabase.entity.Post;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class PostAccessService {

    public boolean canViewPost(Utilizator user, Post post) {
        if (user == null || post == null) {
            return false;
        }
        return switch (user.getRol()) {
            case ADMIN, MANAGER_RECRUTARE -> true;
            case MANAGER_DEPARTAMENT -> {
                if (user.getDepartament() == null || post.getDepartament() == null) {
                    yield false;
                }
                yield Objects.equals(user.getDepartament().getId(), post.getDepartament().getId());
            }
            case RECRUTOR -> post.getRecrutori().stream().anyMatch(u -> u.getId().equals(user.getId()));
            case INTERVIEVATOR_TEHNIC -> post.getIntervievatori().stream().anyMatch(u -> u.getId().equals(user.getId()));
        };
    }

    public boolean canEditDescriere(Utilizator user, Post post) {
        if (user == null || post == null) {
            return false;
        }
        if (user.getRol() == Rol.ADMIN || user.getRol() == Rol.MANAGER_RECRUTARE) {
            return true;
        }
        return user.getRol() == Rol.RECRUTOR && post.getRecrutori().stream().anyMatch(u -> u.getId().equals(user.getId()))
                || user.getRol() == Rol.INTERVIEVATOR_TEHNIC
                        && post.getIntervievatori().stream().anyMatch(u -> u.getId().equals(user.getId()));
    }

    public boolean canToggleEnabled(Utilizator user) {
        return user != null && (user.getRol() == Rol.ADMIN || user.getRol() == Rol.MANAGER_RECRUTARE);
    }
}
