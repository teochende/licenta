package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Aplicatie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;

@RepositoryRestResource(exported = false)
public interface AplicatieRepository extends JpaRepository<Aplicatie, Long> {

    @Query("""
            SELECT DISTINCT a FROM Aplicatie a
            LEFT JOIN FETCH a.post p
            LEFT JOIN FETCH p.departament
            """)
    List<Aplicatie> findAll();
}
