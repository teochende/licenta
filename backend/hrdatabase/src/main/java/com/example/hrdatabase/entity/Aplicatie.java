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

    /** Numele fișierului video încărcat la aplicare (opțional, max. 5 min în UI). */
    @Column(name = "video_nume_fisier", length = 512)
    private String videoNumeFisier;

    /** Cale relativă la videoclip pe disc (ex. aplicatii/uuid.mp4). */
    @Column(name = "video_fisier_path", length = 512)
    private String videoFisierPath;

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
     * Scor de potrivire CV ↔ job (0–100) calculat manual (keyword-based).
     * Este calculat implicit pentru toate aplicările (indiferent dacă este activ și review AI).
     */
    @Column(name = "cv_job_match_score")
    private Integer cvJobMatchScore;

    /** Scor AI (0–100) generat de modulul {@code modul_ai_cv_review} când {@link #aiCvReview} este {@code true}. */
    @Column(name = "ai_cv_match_score")
    private Integer aiCvMatchScore;

    /** Observații AI (competențe potrivite / lipsă), populat când {@link #aiCvReview} este {@code true}. */
    @Column(name = "ai_cv_observatii", columnDefinition = "text")
    private String aiCvObservatii;

    /** Concluzii / recomandare AI, populat când {@link #aiCvReview} este {@code true}. */
    @Column(name = "ai_cv_concluzii", columnDefinition = "text")
    private String aiCvConcluzii;

    /**
     * Dacă este {@code true}, intervievatorii tehnici atribuiți postului văd această aplicare în dashboard
     * (listă, CV, pipeline). Recrutorii (sau admin / MR) o activează explicit; implicit {@code false}.
     */
    @Column(name = "vizibil_intervievatori_tehnic")
    private Boolean vizibilIntervievatoriTehnic = Boolean.FALSE;

    /** JSON: starea pipeline-ului din dashboard (toggle-uri, status etape, detalii). */
    @Column(name = "pipeline_state", columnDefinition = "text")
    private String pipelineState;

    /** Scor AI (0–100) pentru competențe engleză din videoclip, după {@code POST /analyze-video}. */
    @Column(name = "engleza_ai_score")
    private Integer englezaAiScore;

    /** Good / Average / Poor — nivel general raportat de modulul AI. */
    @Column(name = "engleza_ai_performance_status", length = 32)
    private String englezaAiPerformanceStatus;

    /** YES / PARTIAL / NO — verdict pentru comunicare eficientă în engleză la job. */
    @Column(name = "engleza_ai_verdict", length = 16)
    private String englezaAiVerdict;

    /** Rezumat scurt AI (afișare în dashboard). */
    @Column(name = "engleza_ai_summary", columnDefinition = "text")
    private String englezaAiSummary;

    /** Text concis pentru tooltip (linii separate prin \\n). */
    @Column(name = "engleza_ai_tooltip_summary", columnDefinition = "text")
    private String englezaAiTooltipSummary;

    /** Ultima eroare la analiza video (null dacă succes). */
    @Column(name = "engleza_ai_error", columnDefinition = "text")
    private String englezaAiError;

    /** Momentul ultimei analize AI reușite. */
    @Column(name = "engleza_ai_analyzed_at")
    private Instant englezaAiAnalyzedAt;

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

    public String getVideoNumeFisier() {
        return videoNumeFisier;
    }

    public void setVideoNumeFisier(String videoNumeFisier) {
        this.videoNumeFisier = videoNumeFisier;
    }

    public String getVideoFisierPath() {
        return videoFisierPath;
    }

    public void setVideoFisierPath(String videoFisierPath) {
        this.videoFisierPath = videoFisierPath;
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

    public Integer getAiCvMatchScore() {
        return aiCvMatchScore;
    }

    public void setAiCvMatchScore(Integer aiCvMatchScore) {
        this.aiCvMatchScore = aiCvMatchScore;
    }

    public String getAiCvObservatii() {
        return aiCvObservatii;
    }

    public void setAiCvObservatii(String aiCvObservatii) {
        this.aiCvObservatii = aiCvObservatii;
    }

    public String getAiCvConcluzii() {
        return aiCvConcluzii;
    }

    public void setAiCvConcluzii(String aiCvConcluzii) {
        this.aiCvConcluzii = aiCvConcluzii;
    }

    public boolean isVizibilIntervievatoriTehnic() {
        return Boolean.TRUE.equals(vizibilIntervievatoriTehnic);
    }

    public void setVizibilIntervievatoriTehnic(boolean vizibilIntervievatoriTehnic) {
        this.vizibilIntervievatoriTehnic = vizibilIntervievatoriTehnic;
    }

    public String getPipelineState() {
        return pipelineState;
    }

    public void setPipelineState(String pipelineState) {
        this.pipelineState = pipelineState;
    }

    public Integer getEnglezaAiScore() {
        return englezaAiScore;
    }

    public void setEnglezaAiScore(Integer englezaAiScore) {
        this.englezaAiScore = englezaAiScore;
    }

    public String getEnglezaAiPerformanceStatus() {
        return englezaAiPerformanceStatus;
    }

    public void setEnglezaAiPerformanceStatus(String englezaAiPerformanceStatus) {
        this.englezaAiPerformanceStatus = englezaAiPerformanceStatus;
    }

    public String getEnglezaAiVerdict() {
        return englezaAiVerdict;
    }

    public void setEnglezaAiVerdict(String englezaAiVerdict) {
        this.englezaAiVerdict = englezaAiVerdict;
    }

    public String getEnglezaAiSummary() {
        return englezaAiSummary;
    }

    public void setEnglezaAiSummary(String englezaAiSummary) {
        this.englezaAiSummary = englezaAiSummary;
    }

    public String getEnglezaAiTooltipSummary() {
        return englezaAiTooltipSummary;
    }

    public void setEnglezaAiTooltipSummary(String englezaAiTooltipSummary) {
        this.englezaAiTooltipSummary = englezaAiTooltipSummary;
    }

    public String getEnglezaAiError() {
        return englezaAiError;
    }

    public void setEnglezaAiError(String englezaAiError) {
        this.englezaAiError = englezaAiError;
    }

    public Instant getEnglezaAiAnalyzedAt() {
        return englezaAiAnalyzedAt;
    }

    public void setEnglezaAiAnalyzedAt(Instant englezaAiAnalyzedAt) {
        this.englezaAiAnalyzedAt = englezaAiAnalyzedAt;
    }

    public Instant getDataAplicare() {
        return dataAplicare;
    }

    public void setDataAplicare(Instant dataAplicare) {
        this.dataAplicare = dataAplicare;
    }
}
