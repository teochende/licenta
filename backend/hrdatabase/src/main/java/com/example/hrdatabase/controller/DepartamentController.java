package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.DepartamentCreateRequest;
import com.example.hrdatabase.dto.request.DepartamentManagerAssignRequest;
import com.example.hrdatabase.dto.request.DepartamentUpdateRequest;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.service.DepartamentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departamente")
public class DepartamentController {

    private final DepartamentService departamentService;

    public DepartamentController(DepartamentService departamentService) {
        this.departamentService = departamentService;
    }

    @PostMapping
    @PreAuthorize("@perm.isAdmin()")
    public Departament create(@Valid @RequestBody DepartamentCreateRequest request) {
        return departamentService.save(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.isAdmin()")
    public Departament update(@PathVariable Long id, @Valid @RequestBody DepartamentUpdateRequest request) {
        return departamentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.isAdmin()")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        departamentService.deleteById(id);
    }

    /**
     * Setează managerul de departament (un singur utilizator cu {@code MANAGER_DEPARTAMENT} pe acest departament).
     */
    @PostMapping("/{id}/manager")
    @PreAuthorize("@perm.isAdmin()")
    public Departament assignManager(
            @PathVariable Long id,
            @Valid @RequestBody DepartamentManagerAssignRequest request) {
        return departamentService.assignManager(id, request.utilizatorId());
    }

    @GetMapping
    public List<Departament> list() {
        return departamentService.findAll();
    }
}
