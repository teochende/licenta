# Diagramă de clase — aplicație HR Database

Documentul descrie modelul de domeniu și tipurile auxiliare din proiectul `licenta_devm`: backend **Spring Boot / JPA** (`backend/hrdatabase`) și contractele **Pydantic** din serviciul AI (`module_ai/modul_ai_cv_review`).

Diagramele folosesc [Mermaid](https://mermaid.js.org/syntax/classDiagram.html) (randare în GitHub, VS Code cu extensie Mermaid, Cursor preview etc.).

---

## 1. Model de persistență (entități JPA)

Relațiile reflectă mapările din pachetul `com.example.hrdatabase.entity`.

```mermaid
classDiagram
    direction TB

    class Departament {
        +Long id
        +String nume
    }

    class Utilizator {
        +Long id
        +String numeUtilizator
        +String email
        -String parola
        +Rol rol
        +Rol rolDorit
        +Departament departament
        +getAuthorities() Collection
        +getUsername() String
    }

    class Rol {
        <<enumeration>>
        ADMIN
        INTERVIEVATOR_TEHNIC
        RECRUTOR
        MANAGER_RECRUTARE
        MANAGER_DEPARTAMENT
        GUEST
    }

    class Post {
        +Long id
        +Departament departament
        +String subdomeniu
        +String nume
        +String nivel
        +String descriere
        +String descriereFisierPath
        +String descriereFisierNume
        +boolean enabled
        +String prioritate
        +Integer ordineDashboard
        +Integer nrPozitii
        +Set recrutori
        +Set intervievatori
    }

    class CerereAngajare {
        +Long id
        +String numePost
        +String subdomeniu
        +DescriereCerereMod descriereMod
        +String descriere
        +String descriereFisierNume
        +String descriereFisierPath
        +Integer nrPozitii
        +Departament departament
        +String status
        +Utilizator creatDe
        +Post postDeschis
        +List intervievatoriTehnici
        +List recrutori
    }

    class DescriereCerereMod {
        <<enumeration>>
        MANUAL
        FISIER
    }

    class Aplicatie {
        +Long id
        +Post post
        +String numeCandidat
        +String email
        +String cvNumeFisier
        +String cvFisierPath
        +String videoNumeFisier
        +String videoFisierPath
        +String cvContinut
        +Boolean aiCvReview
        +Integer cvJobMatchScore
        +Integer aiCvMatchScore
        +String aiCvObservatii
        +String aiCvConcluzii
        +Boolean vizibilIntervievatoriTehnic
        +String pipelineState
        +Integer englezaAiScore
        +String englezaAiPerformanceStatus
        +String englezaAiVerdict
        +String englezaAiSummary
        +String englezaAiTooltipSummary
        +String englezaAiError
        +Instant englezaAiAnalyzedAt
        +Instant dataAplicare
    }

    class Candidat {
        +Long id
    }

    Utilizator "0..*" --> "0..1" Departament : departament
    Utilizator --> Rol : rol, rolDorit

    Post "n" --> "1" Departament : departament
    Post "n" --> "m" Utilizator : recrutori
    Post "n" --> "m" Utilizator : intervievatori

    CerereAngajare "n" --> "1" Departament : departament
    CerereAngajare "n" --> "0..1" Utilizator : creatDe
    CerereAngajare "0..1" --> "0..1" Post : postDeschis
    CerereAngajare "n" --> "m" Utilizator : intervievatoriTehnici
    CerereAngajare "n" --> "m" Utilizator : recrutori
    CerereAngajare --> DescriereCerereMod : descriereMod

    Aplicatie "n" --> "1" Post : post

    note for Utilizator "Implementeaza UserDetails (Spring Security). Autoritati: ROLE_ + nume rol."
```

### Legături tabele de asociere (JPA)

| Relație | Tabel join |
|--------|------------|
| `Post` ↔ `Utilizator` (recrutori) | `post_recrutori` |
| `Post` ↔ `Utilizator` (intervievatori) | `post_intervievatori` |
| `CerereAngajare` ↔ `Utilizator` (intervievatori) | `cerere_angajare_intervievatori` |
| `CerereAngajare` ↔ `Utilizator` (recrutori) | `cerere_angajare_recrutori` |

Entitatea `Candidat` există în cod (`candidat`) cu un singur identificator; nu este legată prin JPA de celelalte clase de mai sus în forma actuală.

---

## 2. Modul AI — modele Pydantic (`modul_ai_cv_review`)

Contracte de request/response HTTP folosite de serviciul Python (ex.: analiză CV, feedback, analiză video engleză).

```mermaid
classDiagram
    class AnalyzeResponse {
        +int score
        +list matching_skills
        +list missing_skills
        +str recommendation
        +str cv_text
        +str job_text
    }

    class FeedbackRequest {
        +str cv_text
        +str job_text
        +float ai_score
        +float human_score
        +str notes
    }

    class FeedbackResponse {
        +str message
        +int feedback_id
        +float difference
    }

    class VideoEnglishAnalysisResponse {
        +int english_score
        +str cefr_level
        +str pronunciation_feedback
        +str fluency_feedback
        +str grammar_feedback
        +str vocabulary_feedback
        +str clarity_feedback
        +list strengths
        +list improvements
        +list recommendations
        +str performance_status
        +str hiring_verdict
        +str tooltip_summary
    }

    FeedbackRequest ..> FeedbackResponse : produce
    note for AnalyzeResponse "Raspuns analiza potrivire CV-job"
    note for VideoEnglishAnalysisResponse "Raspuns analiza competente engleza din video"
```

---

## Fișiere sursă principale

- Entități JPA: `backend/hrdatabase/src/main/java/com/example/hrdatabase/entity/`
- Modele AI: `module_ai/modul_ai_cv_review/db/models.py`

Dacă actualizezi entitățile sau DTO-urile, regenerează sau adaptează manual diagramele de mai sus pentru a rămâne aliniate codului.
