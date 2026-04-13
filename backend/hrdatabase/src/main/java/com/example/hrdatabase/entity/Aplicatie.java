package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.Instant;

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

    /** Cale relativă la fișierul CV pe disc (ex. aplicatii/uuid.pdf), sub {@code app.upload.dir}. */
    @Column(name = "cv_fisier_path", length = 512)
    private String cvFisierPath;

    /** Text CV (simulare: conținut introdus la aplicare fără stocare fișier). */
    @Column(name = "cv_continut", columnDefinition = "text")
    private String cvContinut;

    /**
     * Dacă este {@code true}, etapa de Review CV folosește fluxul AI (nu se calculează scorul manual).
     * <p>
     * Notă: este {@link Boolean} (nu primitive) ca să putem porni aplicația chiar dacă în DB există rânduri vechi
     * cu {@code NULL}; la runtime tratăm {@code NULL} ca {@code false} și facem backfill automat la startup.
     */
    @Column(name = "ai_cv_review")
    private Boolean aiCvReview = Boolean.FALSE;

    /**
     * Scor de potrivire CV ↔ descriere job (0-100) pentru review manual.
     * Este calculat doar când {@link #aiCvReview} este {@code false}.
     */
    @Column(name = "cv_job_match_score")
    private Integer cvJobMatchScore;

    /** JSON: starea pipeline-ului din dashboard (toggle-uri, status etape, detalii). */
    @Column(name = "pipeline_state", columnDefinition = "text")
    private String pipelineState;

    /** Momentul aplicării (server). */
    @Column(name = "data_aplicare")
    private Instant dataAplicare;

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

    public String getCvFisierPath() {
        return cvFisierPath;
    }

    public void setCvFisierPath(String cvFisierPath) {
        this.cvFisierPath = cvFisierPath;
    }

    public String getCvContinut() {
        return cvContinut;
    }

    public void setCvContinut(String cvContinut) {
        this.cvContinut = cvContinut;
    }

    public boolean isAiCvReview() {
        return Boolean.TRUE.equals(aiCvReview);
    }

    public void setAiCvReview(boolean aiCvReview) {
        this.aiCvReview = aiCvReview;
    }

    public Boolean getAiCvReviewRaw() {
        return aiCvReview;
    }

    public Integer getCvJobMatchScore() {
        return cvJobMatchScore;
    }

    public void setCvJobMatchScore(Integer cvJobMatchScore) {
        this.cvJobMatchScore = cvJobMatchScore;
    }

    public String getPipelineState() {
        return pipelineState;
    }

    public void setPipelineState(String pipelineState) {
        this.pipelineState = pipelineState;
    }

    public Instant getDataAplicare() {
        return dataAplicare;
    }

    public void setDataAplicare(Instant dataAplicare) {
        this.dataAplicare = dataAplicare;
    }
}
