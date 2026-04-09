package com.example.hrdatabase.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "candidat")
public class Candidat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)         // important cand folosesc postrge sql sa pun IDENTITY si nu AUTO
    private Long id;

    public Candidat() {
    }

    public Long getId() {
        return id;
    }

}
