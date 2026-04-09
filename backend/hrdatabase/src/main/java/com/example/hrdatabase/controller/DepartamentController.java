package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.DepartamentCreateRequest;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.service.DepartamentService;
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
    public Departament create(@RequestBody DepartamentCreateRequest request) {
        return departamentService.save(request);
    }

    @GetMapping
    public List<Departament> list() {
        return departamentService.findAll();
    }
}
