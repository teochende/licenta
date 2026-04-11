package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.CerereAngajare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface CerereAngajareRepository extends JpaRepository<CerereAngajare, Long> {

    @Modifying
    @Query(value = "DELETE FROM cerere_angajare_intervievatori WHERE utilizator_id = :uid", nativeQuery = true)
    void deleteAllCerereIntervievatoriForUser(@Param("uid") Long utilizatorId);

    @Modifying
    @Query(value = "DELETE FROM cerere_angajare_recrutori WHERE utilizator_id = :uid", nativeQuery = true)
    void deleteAllCerereRecrutoriForUser(@Param("uid") Long utilizatorId);

    @Modifying
    @Query("UPDATE CerereAngajare c SET c.creatDe = null WHERE c.creatDe.id = :uid")
    void clearCreatDeByUserId(@Param("uid") Long utilizatorId);

    @Modifying
    @Query("UPDATE CerereAngajare c SET c.postDeschis = null WHERE c.postDeschis.id = :postId")
    void clearPostDeschisByPostId(@Param("postId") Long postId);

    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            LEFT JOIN FETCH c.intervievatoriTehnici
            WHERE c.id = :id
            """)
    Optional<CerereAngajare> findByIdWithIntervievatori(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            JOIN FETCH c.departament
            LEFT JOIN FETCH c.intervievatoriTehnici
            WHERE c.id = :id
            """)
    Optional<CerereAngajare> findByIdForOpen(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            LEFT JOIN FETCH c.departament
            LEFT JOIN FETCH c.intervievatoriTehnici
            WHERE c.status = :status
            """)
    List<CerereAngajare> findByStatusWithDetails(@Param("status") String status);

    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            LEFT JOIN FETCH c.departament
            LEFT JOIN FETCH c.creatDe
            LEFT JOIN FETCH c.intervievatoriTehnici
            WHERE c.departament.id = :deptId
            ORDER BY c.id DESC
            """)
    List<CerereAngajare> findByDepartamentIdWithDetails(@Param("deptId") Long deptId);

    /** Listă toate cererile (ex.: administrator), cu departament și intervievatori încărcați. */
    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            LEFT JOIN FETCH c.departament
            LEFT JOIN FETCH c.creatDe
            LEFT JOIN FETCH c.intervievatoriTehnici
            ORDER BY c.id DESC
            """)
    List<CerereAngajare> findAllForListWithDetails();

    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            LEFT JOIN FETCH c.departament
            LEFT JOIN FETCH c.creatDe
            LEFT JOIN FETCH c.intervievatoriTehnici
            WHERE c.id = :id
            """)
    Optional<CerereAngajare> findByIdWithDetails(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT c FROM CerereAngajare c
            LEFT JOIN FETCH c.departament
            LEFT JOIN FETCH c.creatDe cr
            LEFT JOIN FETCH cr.departament
            LEFT JOIN FETCH c.intervievatoriTehnici
            LEFT JOIN FETCH c.postDeschis p
            LEFT JOIN FETCH p.departament
            """)
    List<CerereAngajare> findAll();
}
