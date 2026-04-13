package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Aplicatie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface AplicatieRepository extends JpaRepository<Aplicatie, Long> {

    @Modifying
    @Query("DELETE FROM Aplicatie a WHERE a.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);

    boolean existsByPost_IdAndEmailIgnoreCase(Long postId, String email);

    @Modifying
    @Query(value = "UPDATE aplicatie SET ai_cv_review = false WHERE ai_cv_review IS NULL", nativeQuery = true)
    int backfillAiCvReviewFalse();

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
            WHERE a.id = :id
            """)
    Optional<Aplicatie> findByIdWithPostGraph(Long id);

    @Query("""
            SELECT DISTINCT a FROM Aplicatie a
            JOIN FETCH a.post p
            LEFT JOIN FETCH p.departament
            """)
    List<Aplicatie> findAllWithPostGraph();
}
