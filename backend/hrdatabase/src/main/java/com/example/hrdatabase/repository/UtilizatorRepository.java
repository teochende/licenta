package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface UtilizatorRepository extends JpaRepository<Utilizator, Long> {

    long countByRol(Rol rol);

    Optional<Utilizator> findByEmail(String email);

    @EntityGraph(attributePaths = {"departament"})
    @Override
    List<Utilizator> findAll();
}
