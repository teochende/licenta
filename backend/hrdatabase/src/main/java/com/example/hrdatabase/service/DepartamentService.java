package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.DepartamentCreateRequest;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.repository.DepartamentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DepartamentService {

    private final DepartamentRepository departamentRepository;

    public DepartamentService(DepartamentRepository departamentRepository) {
        this.departamentRepository = departamentRepository;
    }

    @Transactional
    public Departament save(DepartamentCreateRequest request) {
        Departament d = new Departament(request.nume());
        return departamentRepository.save(d);
    }

    public List<Departament> findAll() {
        return departamentRepository.findAll();
    }
}
