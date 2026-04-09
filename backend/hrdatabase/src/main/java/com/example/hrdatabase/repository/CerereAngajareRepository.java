package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.CerereAngajare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;

@RepositoryRestResource(exported = false)
public interface CerereAngajareRepository extends JpaRepository<CerereAngajare, Long> {

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
