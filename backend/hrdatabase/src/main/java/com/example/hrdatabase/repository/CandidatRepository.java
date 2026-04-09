package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Candidat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(exported = false)
public interface CandidatRepository extends JpaRepository<Candidat, Long> {
}
