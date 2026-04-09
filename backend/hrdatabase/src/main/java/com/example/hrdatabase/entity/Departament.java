package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "departament")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Departament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 128)
    private String nume;

    protected Departament() {
    }

    public Departament(String nume) {
        this.nume = nume;
    }

    public Long getId() {
        return id;
    }

    public String getNume() {
        return nume;
    }

    public void setNume(String nume) {
        this.nume = nume;
    }
}
