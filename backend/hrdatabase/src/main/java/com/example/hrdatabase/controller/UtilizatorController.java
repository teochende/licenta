package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.UtilizatorRequestDTO;
import com.example.hrdatabase.dto.request.UtilizatorUpdateRequestDTO;
import com.example.hrdatabase.dto.response.UtilizatorResponseDTO;
import com.example.hrdatabase.service.UtilizatorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public List<UtilizatorResponseDTO> list() {
        return utilizatorService.findAll();
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
