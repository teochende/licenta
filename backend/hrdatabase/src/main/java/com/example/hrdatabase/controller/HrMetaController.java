package com.example.hrdatabase.controller;

import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/hr")
public class HrMetaController {

    private final UtilizatorRepository utilizatorRepository;

    public HrMetaController(UtilizatorRepository utilizatorRepository) {
        this.utilizatorRepository = utilizatorRepository;
    }

    @GetMapping("/recrutori")
    @PreAuthorize("hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public List<IdNumeDto> recrutori() {
        return utilizatorRepository.findByRol(Rol.RECRUTOR).stream()
                .map(u -> new IdNumeDto(u.getId(), u.getNumeUtilizator()))
                .sorted((a, b) -> a.numeUtilizator().compareToIgnoreCase(b.numeUtilizator()))
                .toList();
    }

    @GetMapping("/intervievatori-tehnici")
    @PreAuthorize("hasRole('MANAGER_DEPARTAMENT') or hasRole('MANAGER_RECRUTARE') or hasRole('ADMIN')")
    public List<IdNumeDto> intervievatoriTehnici() {
        return utilizatorRepository.findByRol(Rol.INTERVIEVATOR_TEHNIC).stream()
                .map(u -> new IdNumeDto(u.getId(), u.getNumeUtilizator()))
                .sorted((a, b) -> a.numeUtilizator().compareToIgnoreCase(b.numeUtilizator()))
                .toList();
    }

    public record IdNumeDto(Long id, String numeUtilizator) {
    }
}
