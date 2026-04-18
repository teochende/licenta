package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.UtilizatorRequestDTO;
import com.example.hrdatabase.dto.request.UtilizatorUpdateRequestDTO;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.dto.response.UtilizatorResponseDTO;
import com.example.hrdatabase.service.UtilizatorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/utilizatori")
@PreAuthorize("@perm.isAdmin()")
public class UtilizatorController {

    private final UtilizatorService utilizatorService;

    public UtilizatorController(UtilizatorService utilizatorService) {
        this.utilizatorService = utilizatorService;
    }

    @PostMapping
    public UtilizatorResponseDTO create(@Valid @RequestBody UtilizatorRequestDTO request) {
        return utilizatorService.save(request);
    }

    @GetMapping
    public Object list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) Long departamentId) {
        if (page != null && size != null) {
            int p = Math.max(0, page);
            int s = Math.min(100, Math.max(1, size));
            Rol rolFilter = parseRolFilter(rol);
            return utilizatorService.findPaged(q, rolFilter, departamentId, p, s);
        }
        return utilizatorService.findAll();
    }

    private static Rol parseRolFilter(String rol) {
        if (!StringUtils.hasText(rol)) {
            return null;
        }
        try {
            return Rol.valueOf(rol.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    @PatchMapping("/{id}")
    public UtilizatorResponseDTO update(
            @PathVariable Long id,
            @Valid @RequestBody UtilizatorUpdateRequestDTO request) {
        return utilizatorService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        utilizatorService.deleteById(id);
    }
}
