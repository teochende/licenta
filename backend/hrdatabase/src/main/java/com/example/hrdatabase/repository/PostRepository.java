package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface PostRepository extends JpaRepository<Post, Long> {

    long countByDepartament_Id(Long departamentId);

    @Modifying
    @Query(value = "DELETE FROM post_recrutori WHERE utilizator_id = :uid", nativeQuery = true)
    void deleteAllRecrutoriAssignmentsForUser(@Param("uid") Long utilizatorId);

    @Modifying
    @Query(value = "DELETE FROM post_intervievatori WHERE utilizator_id = :uid", nativeQuery = true)
    void deleteAllIntervievatoriAssignmentsForUser(@Param("uid") Long utilizatorId);

    /**
     * Un singur {@code JOIN FETCH} pe colecții per query (Hibernate interzice două colecții „bag” simultan).
     * {@code recrutori} / {@code intervievatori} se încarcă lazy în cadrul tranzacției serviciului.
     */
    @Query("SELECT DISTINCT p FROM Post p LEFT JOIN FETCH p.departament")
    List<Post> findAll();

    @Query("""
            SELECT DISTINCT p FROM Post p
            LEFT JOIN FETCH p.departament
            WHERE p.id = :id
            """)
    Optional<Post> findByIdWithAssignments(@Param("id") Long id);

    @Query("SELECT COALESCE(MAX(p.ordineDashboard), -1) FROM Post p WHERE p.departament.id = :depId")
    Integer findMaxOrdineDashboardByDepartamentId(@Param("depId") Long depId);
}
