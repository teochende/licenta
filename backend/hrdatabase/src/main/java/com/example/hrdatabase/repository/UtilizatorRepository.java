package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface UtilizatorRepository extends JpaRepository<Utilizator, Long> {

    long countByRol(Rol rol);

    List<Utilizator> findByRol(Rol rol);

    List<Utilizator> findByDepartament_IdAndRol(Long departamentId, Rol rol);

    long countByDepartament_Id(Long departamentId);

    Optional<Utilizator> findByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByNumeUtilizatorIgnoreCase(String numeUtilizator);

    @Query("SELECT DISTINCT u FROM Utilizator u LEFT JOIN FETCH u.departament WHERE u.id = :id")
    Optional<Utilizator> findByIdWithDepartament(@Param("id") Long id);

    @EntityGraph(attributePaths = {"departament"})
    @Override
    List<Utilizator> findAll();
}
