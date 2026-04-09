package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "posturi")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Corespondent cu „domeniu” din simulator (ex.: Programare). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "departament_id")
    private Departament departament;

    @Column(nullable = false, length = 128)
    private String subdomeniu;

    @Column(nullable = false, length = 256)
    private String nume;

    @Column(nullable = false, length = 64)
    private String nivel;

    @Column(columnDefinition = "text")
    private String descriere;

    @Column(nullable = false)
    private boolean enabled = true;

    /** Recrutori atribuiți postului (ca în simulator: assignedRecruteri). */
    @ManyToMany
    @JoinTable(
            name = "post_recrutori",
            joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "utilizator_id"))
    private Set<Utilizator> recrutori = new HashSet<>();

    /** Intervievatori tehnici atribuiți (assignedIntervievatori). */
    @ManyToMany
    @JoinTable(
            name = "post_intervievatori",
            joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "utilizator_id"))
    private Set<Utilizator> intervievatori = new HashSet<>();

    public Post() {
    }

    public Long getId() {
        return id;
    }

    public Departament getDepartament() {
        return departament;
    }

    public void setDepartament(Departament departament) {
        this.departament = departament;
    }

    public String getSubdomeniu() {
        return subdomeniu;
    }

    public void setSubdomeniu(String subdomeniu) {
        this.subdomeniu = subdomeniu;
    }

    public String getNume() {
        return nume;
    }

    public void setNume(String nume) {
        this.nume = nume;
    }

    public String getNivel() {
        return nivel;
    }

    public void setNivel(String nivel) {
        this.nivel = nivel;
    }

    public String getDescriere() {
        return descriere;
    }

    public void setDescriere(String descriere) {
        this.descriere = descriere;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Set<Utilizator> getRecrutori() {
        return recrutori;
    }

    public void setRecrutori(Set<Utilizator> recrutori) {
        this.recrutori = recrutori;
    }

    public Set<Utilizator> getIntervievatori() {
        return intervievatori;
    }

    public void setIntervievatori(Set<Utilizator> intervievatori) {
        this.intervievatori = intervievatori;
    }
}
