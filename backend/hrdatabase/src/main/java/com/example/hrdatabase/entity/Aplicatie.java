package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "aplicatie")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Aplicatie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(name = "nume_candidat", nullable = false, length = 128)
    private String numeCandidat;

    @Column(nullable = false, length = 255)
    private String email;

    /** Numele fișierului CV încărcat (stocare efectivă poate veni ulterior). */
    @Column(name = "cv_nume_fisier", length = 512)
    private String cvNumeFisier;

    /** Text CV (simulare: conținut introdus la aplicare fără stocare fișier). */
    @Column(name = "cv_continut", columnDefinition = "text")
    private String cvContinut;

    /** JSON: starea pipeline-ului din dashboard (toggle-uri, status etape, detalii). */
    @Column(name = "pipeline_state", columnDefinition = "text")
    private String pipelineState;

    protected Aplicatie() {
    }

    public Aplicatie(Post post, String numeCandidat, String email, String cvNumeFisier) {
        this.post = post;
        this.numeCandidat = numeCandidat;
        this.email = email;
        this.cvNumeFisier = cvNumeFisier;
    }

    public Long getId() {
        return id;
    }

    public Post getPost() {
        return post;
    }

    public void setPost(Post post) {
        this.post = post;
    }

    public String getNumeCandidat() {
        return numeCandidat;
    }

    public void setNumeCandidat(String numeCandidat) {
        this.numeCandidat = numeCandidat;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCvNumeFisier() {
        return cvNumeFisier;
    }

    public void setCvNumeFisier(String cvNumeFisier) {
        this.cvNumeFisier = cvNumeFisier;
    }

    public String getCvContinut() {
        return cvContinut;
    }

    public void setCvContinut(String cvContinut) {
        this.cvContinut = cvContinut;
    }

    public String getPipelineState() {
        return pipelineState;
    }

    public void setPipelineState(String pipelineState) {
        this.pipelineState = pipelineState;
    }
}
