package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cerere_angajare")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CerereAngajare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nume_post", nullable = false, length = 256)
    private String numePost;

    @Column(columnDefinition = "text")
    private String descriere;

    @Column(name = "nr_pozitii", nullable = false)
    private Integer nrPozitii = 1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "departament_id")
    private Departament departament;

    /** Ex.: pending, deschis (ca în simulator). */
    @Column(nullable = false, length = 32)
    private String status = "pending";

    /** Managerul de departament care a trimis cererea (createdBy din UI). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creat_de_utilizator_id")
    private Utilizator creatDe;

    /**
     * Postul deschis din această cerere după acțiunea „Deschide post” (opțional până la deschidere).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_deschis_id")
    private Post postDeschis;

    @ManyToMany
    @JoinTable(
            name = "cerere_angajare_intervievatori",
            joinColumns = @JoinColumn(name = "cerere_id"),
            inverseJoinColumns = @JoinColumn(name = "utilizator_id"))
    private List<Utilizator> intervievatoriTehnici = new ArrayList<>();

    public CerereAngajare() {
    }

    public Long getId() {
        return id;
    }

    public String getNumePost() {
        return numePost;
    }

    public void setNumePost(String numePost) {
        this.numePost = numePost;
    }

    public String getDescriere() {
        return descriere;
    }

    public void setDescriere(String descriere) {
        this.descriere = descriere;
    }

    public Integer getNrPozitii() {
        return nrPozitii;
    }

    public void setNrPozitii(Integer nrPozitii) {
        this.nrPozitii = nrPozitii;
    }

    public Departament getDepartament() {
        return departament;
    }

    public void setDepartament(Departament departament) {
        this.departament = departament;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Utilizator getCreatDe() {
        return creatDe;
    }

    public void setCreatDe(Utilizator creatDe) {
        this.creatDe = creatDe;
    }

    public Post getPostDeschis() {
        return postDeschis;
    }

    public void setPostDeschis(Post postDeschis) {
        this.postDeschis = postDeschis;
    }

    public List<Utilizator> getIntervievatoriTehnici() {
        return intervievatoriTehnici;
    }

    public void setIntervievatoriTehnici(List<Utilizator> intervievatoriTehnici) {
        this.intervievatoriTehnici = intervievatoriTehnici;
    }
}
