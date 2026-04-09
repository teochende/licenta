package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Utilizator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface UtilizatorRepository extends JpaRepository<Utilizator, Long> {

    Optional<Utilizator> findByEmail(String email);

    @Query("SELECT DISTINCT u FROM Utilizator u LEFT JOIN FETCH u.departament")
    List<Utilizator> findAll();
}
