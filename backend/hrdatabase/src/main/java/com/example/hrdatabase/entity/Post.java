package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
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

    /** Cale relativă la fișierul de descriere (pdf/docx), sub {@code app.upload.dir}. */
    @Column(name = "descriere_fisier_path", length = 512)
    private String descriereFisierPath;

    /** Numele original al fișierului de descriere (afișare / descărcare). */
    @Column(name = "descriere_fisier_nume", length = 512)
    private String descriereFisierNume;

    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * Prioritate afișată pe job card: critic, mare, medie, mica (implicit).
     */
    @Column(name = "prioritate", nullable = false, length = 16)
    private String prioritate = "mica";

    /**
     * Ordine în cadrul aceluiași departament (dashboard); valori mai mici pot apărea primele după sortarea după prioritate.
     */
    @Column(name = "ordine_dashboard")
    private Integer ordineDashboard = 0;

    @Column(name = "nr_pozitii", nullable = false)
    @ColumnDefault("1")
    private Integer nrPozitii = 1;

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

    public String getDescriereFisierPath() {
        return descriereFisierPath;
    }

    public void setDescriereFisierPath(String descriereFisierPath) {
        this.descriereFisierPath = descriereFisierPath;
    }

    public String getDescriereFisierNume() {
        return descriereFisierNume;
    }

    public void setDescriereFisierNume(String descriereFisierNume) {
        this.descriereFisierNume = descriereFisierNume;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getPrioritate() {
        return prioritate;
    }

    public void setPrioritate(String prioritate) {
        this.prioritate = prioritate != null && !prioritate.isBlank() ? prioritate : "mica";
    }

    public Integer getOrdineDashboard() {
        return ordineDashboard;
    }

    public void setOrdineDashboard(Integer ordineDashboard) {
        this.ordineDashboard = ordineDashboard != null ? ordineDashboard : 0;
    }

    public Integer getNrPozitii() {
        return nrPozitii;
    }

    public void setNrPozitii(Integer nrPozitii) {
        this.nrPozitii = nrPozitii != null && nrPozitii > 0 ? nrPozitii : 1;
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
