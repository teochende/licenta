package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;

@RepositoryRestResource(exported = false)
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("SELECT DISTINCT p FROM Post p LEFT JOIN FETCH p.departament LEFT JOIN FETCH p.recrutori LEFT JOIN FETCH p.intervievatori")
    List<Post> findAll();
}
