package com.example.hrdatabase.service;

import com.example.hrdatabase.entity.Candidat;
import com.example.hrdatabase.repository.CandidatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CandidatService {

    private final CandidatRepository candidatRepository;

    public CandidatService(CandidatRepository candidatRepository) {
        this.candidatRepository = candidatRepository;
    }

    @Transactional
    public Candidat save(Candidat candidat) {
        return candidatRepository.save(candidat);
    }

    public List<Candidat> findAll() {
        return candidatRepository.findAll();
    }
}
