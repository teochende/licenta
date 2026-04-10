package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Aplicatie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface AplicatieRepository extends JpaRepository<Aplicatie, Long> {

    boolean existsByPost_IdAndEmailIgnoreCase(Long postId, String email);

    @Query("""
            SELECT DISTINCT a FROM Aplicatie a
            LEFT JOIN FETCH a.post p
            LEFT JOIN FETCH p.departament
            """)
    List<Aplicatie> findAll();

    @Query("""
            SELECT DISTINCT a FROM Aplicatie a
            JOIN FETCH a.post p
            LEFT JOIN FETCH p.departament
            LEFT JOIN FETCH p.recrutori
            LEFT JOIN FETCH p.intervievatori
            WHERE a.id = :id
            """)
    Optional<Aplicatie> findByIdWithPostGraph(Long id);

    @Query("""
            SELECT DISTINCT a FROM Aplicatie a
            JOIN FETCH a.post p
            LEFT JOIN FETCH p.departament
            LEFT JOIN FETCH p.recrutori
            LEFT JOIN FETCH p.intervievatori
            """)
    List<Aplicatie> findAllWithPostGraph();
}
