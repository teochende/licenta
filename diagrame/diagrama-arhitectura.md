# Diagramă de arhitectură — aplicație HR Database

Documentul descrie arhitectura runtime și integrările proiectului `licenta_devm`: frontend **React / Vite** (`hrsimulator`), backend **Spring Boot** (`backend/hrdatabase`), baza de date **PostgreSQL**, stocare fișiere pe disc și modulul auxiliar **FastAPI** (`module_ai/modul_ai_cv_review`).

Diagramele folosesc [Mermaid](https://mermaid.js.org/) (randare în GitHub, VS Code cu extensie Mermaid, Cursor preview etc.).

---

## 1. Vedere de ansamblu (sistem)

Aplicația HR este un sistem **multi-tier**: utilizatorii interacționează doar cu frontend-ul; backend-ul centralizează autentificarea, regulile de business, persistența și apelurile către serviciul AI. Modulul AI este un proces separat, apelat **server-to-server** de Spring Boot (nu direct din browser).

```mermaid
flowchart TB
    subgraph clients["Clienți"]
        UHR["Utilizatori HR<br/>(recrutori, manageri, IT)"]
        UCand["Candidați / vizitatori"]
    end

    subgraph frontend["Frontend — hrsimulator"]
        SPA["SPA React + Vite<br/>:5173 dev"]
        LS["localStorage<br/>JWT + profil"]
        API["Strat API JS<br/>/api, /auth"]
    end

    subgraph backend["Backend — hrdatabase"]
        SB["Spring Boot REST<br/>:8080"]
        SEC["Spring Security<br/>JWT stateless"]
        SVC["Servicii domeniu<br/>Post, Cerere, Aplicatie…"]
        JPA["Spring Data JPA"]
        FS["Stocare fișiere<br/>app.upload.dir"]
        AICl["Clienți HTTP AI<br/>RestClient / RestTemplate"]
    end

    subgraph data["Date"]
        PG[("PostgreSQL<br/>bază HR")]
        UPLOAD[("Fișiere locale<br/>CV, video, descrieri")]
        SQLITE[("SQLite<br/>cv_matcher.db")]
    end

    subgraph ai["Modul AI — modul_ai_cv_review"]
        FAST["FastAPI :8000"]
        PARSE["parsing_service"]
        AISVC["ai_service"]
        VID["video_service<br/>ffmpeg + Whisper"]
    end

    EXT["OpenAI API<br/>(opțional / obligatoriu video)"]

    UHR --> SPA
    UCand --> SPA
    SPA --> LS
    SPA --> API
    API -->|"proxy Vite dev<br/>sau CORS prod"| SB

    SB --> SEC
    SEC --> SVC
    SVC --> JPA
    SVC --> FS
    SVC --> AICl
    JPA --> PG
    FS --> UPLOAD

    AICl -->|"POST /analyze<br/>POST /analyze-video"| FAST
    FAST --> PARSE
    FAST --> AISVC
    FAST --> VID
    FAST --> SQLITE
    AISVC --> EXT
    VID --> EXT
```

### Roluri principale ale componentelor

| Componentă | Tehnologie | Responsabilitate |
|------------|------------|------------------|
| `hrsimulator` | React 18, Vite, React Router | UI: login, posturi, cereri, dashboard aplicanți, aplicare job |
| `hrdatabase` | Spring Boot 3, JPA, Security | API REST, JWT, autorizare pe rol, orchestrare AI, upload |
| PostgreSQL | JDBC | Entități: utilizatori, posturi, cereri, aplicații |
| Fișiere locale | `app.upload.dir` | CV, videoclipuri, descrieri job/cerere (PDF/DOCX) |
| `modul_ai_cv_review` | FastAPI, Pydantic | Potrivire CV–job, feedback, analiză engleză din video |
| OpenAI | API extern | LLM pentru scor/recomandare; Whisper + evaluare pentru video |

---

## 2. Arhitectură logică pe straturi

```mermaid
flowchart LR
    subgraph presentation["Prezentare"]
        UI["Componente React<br/>Dashboard, AplicareJob, Admin…"]
        CTX["LoginContext + hooks"]
    end

    subgraph integration["Integrare frontend"]
        AUTH_API["authApi.js"]
        POST_API["postsApi.js"]
        APP_API["aplicatiiApi.js"]
        CER_API["cereriApi.js"]
    end

    subgraph api["API Spring — controllere"]
        AC["AuthController /auth"]
        PC["PostController"]
        APC["AplicatieController"]
        CC["CerereAngajareController"]
        ADM["Admin*Controller"]
    end

    subgraph application["Aplicație backend"]
        AS["AplicatieService"]
        PS["PostService / CerereAngajareService"]
        US["UtilizatorService"]
        CVMS["CvJobMatchService"]
        AICV["AiCvReviewClientService"]
        AIVID["AiEnglishVideoReviewClientService"]
        STO["*FileStorageService"]
    end

    subgraph infrastructure["Infrastructură"]
        REPO["Repositories JPA"]
        DB[("PostgreSQL")]
        DISK[("uploads/")]
        PY["FastAPI modul AI"]
    end

    UI --> CTX
    UI --> integration
    integration -->|"Bearer JWT"| api
    api --> application
    application --> REPO
    application --> STO
    application --> AICV
    application --> AIVID
    REPO --> DB
    STO --> DISK
    AICV --> PY
    AIVID --> PY
```

Backend-ul urmează un model **controller → service → repository**, cu securitate declarativă (`@PreAuthorize` / `PermissionExpressions`) pe metodele de serviciu sau controller.

---

## 3. Mediu de dezvoltare (deployment local)

```mermaid
flowchart LR
    Browser["Browser<br/>http://localhost:5173"]

    subgraph vite["Vite dev server"]
        PROXY["Proxy /api, /auth → :8080"]
    end

    SB["Spring Boot<br/>localhost:8080"]
    PG[("PostgreSQL<br/>localhost:5432/HR")]
    AI["uvicorn main:app<br/>127.0.0.1:8000"]
    FILES["~/.licenta_devm/uploads"]

    Browser --> vite
    vite --> PROXY --> SB
    SB --> PG
    SB --> FILES
    SB -->|"ai.cv.review.base-url"| AI
```

| Port / cale | Serviciu |
|-------------|----------|
| `5173` | Frontend Vite (`npm run dev`) |
| `8080` | Backend Spring Boot (implicit) |
| `5432` | PostgreSQL, baza `HR` |
| `8000` | Modul AI FastAPI |
| `${user.home}/.licenta_devm/uploads` | Rădăcină upload (`application.properties`) |

Configurare relevantă: `hrsimulator/vite.config.js` (proxy), `application.properties` (DB, JWT, CORS, AI, upload).

---

## 4. Securitate și acces API

Autentificarea este **stateless JWT** (HS256). Frontend-ul stochează tokenul în `localStorage` și îl trimite ca `Authorization: Bearer …`.

```mermaid
sequenceDiagram
    actor U as Utilizator
    participant R as React hrsimulator
    participant A as AuthController
    participant F as JwtAuthenticationFilter
    participant C as Controller protejat

    U->>R: login email/parolă
    R->>A: POST /auth/login
    A-->>R: accessToken (JWT)
    R->>R: salvează token + profil

    U->>R: acțiune protejată
    R->>C: request + Bearer JWT
    C->>F: validează token
    F-->>C: SecurityContext (rol ROLE_*)
    C-->>R: JSON răspuns
```

**Rute publice** (fără JWT), conform `SecurityConfig`:

- `POST /auth/login`, `POST /auth/register`
- `POST /api/aplicatii`, `POST /api/aplicatii/json` — aplicare la job
- `GET /api/posturi/disponibile`, `GET /api/posturi/disponibile/meta` — listă posturi pentru candidați

Toate celelalte rute sub `/api/**` necesită autentificare. Rolurile (`ADMIN`, `RECRUTOR`, `MANAGER_RECRUTARE`, etc.) limitează operațiile în servicii.

---

## 5. Flux: aplicare job + review CV AI

Candidatul trimite formular multipart către backend. Dacă este bifat review AI, backend-ul extrage text CV/job, apelează modulul Python și persistă scorul pe entitatea `Aplicatie`.

```mermaid
sequenceDiagram
    actor Cand as Candidat
    participant FE as React
    participant BE as AplicatieController / Service
    participant FS as FileStorage
    participant PG as PostgreSQL
    participant AI as FastAPI /analyze
    participant OAI as OpenAI

    Cand->>FE: aplicare + CV (+ video opțional)
    FE->>BE: POST /api/aplicatii (multipart)
    BE->>FS: salvează CV (și video)
    BE->>PG: INSERT Aplicatie

    alt aiCvReview = true
        BE->>BE: extrage text CV + descriere post
        BE->>AI: POST /analyze (cv_text, job_text)
        AI->>OAI: prompt structurat (dacă există cheie)
        AI-->>BE: score, skills, recommendation
        BE->>PG: UPDATE scor AI, observații
    end

    BE-->>FE: răspuns aplicare
```

**Notă:** Browser-ul **nu** apelează direct `:8000`; doar Spring Boot, prin `AiCvReviewClientService` (`ai.cv.review.enabled`, `ai.cv.review.base-url`).

---

## 6. Flux: review engleză din videoclip

Declanșat din dashboard (utilizatori autorizați), după ce există deja un fișier video salvat pe aplicare.

```mermaid
sequenceDiagram
    participant HR as Utilizator HR
    participant FE as React Dashboard
    participant BE as AplicatieService
    participant FS as FileStorage
    participant AI as FastAPI /analyze-video
    participant W as Whisper + LLM

    HR->>FE: activează „Review engleză automat”
    FE->>BE: PATCH .../review-engleza-automat
    BE->>FS: citește bytes video
    BE->>AI: POST /analyze-video (multipart video_file)
    AI->>AI: ffmpeg durată + extragere audio
    AI->>W: transcriere + evaluare JSON
    W-->>AI: scor CEFR, verdict, feedback
    AI-->>BE: VideoEnglishAnalysisResponse
    BE->>BE: persistă englezaAi* pe Aplicatie
    BE-->>FE: DTO dashboard actualizat
```

Pentru acest flux, `OPENAI_API_KEY` este necesară în mediul modulului AI.

---

## 7. Modul AI — structură internă

```mermaid
flowchart TB
    MAIN["main.py<br/>FastAPI app"]

    subgraph endpoints["Endpoints HTTP"]
        E1["POST /analyze"]
        E2["POST /feedback"]
        E3["POST /analyze-video"]
        E4["GET / UI static"]
    end

    subgraph services["services/"]
        P["parsing_service<br/>PDF, DOCX, TXT"]
        AI["ai_service<br/>scor + recomandare"]
        SIM["similarity_service<br/>cazuri similare"]
        V["video_service<br/>ffmpeg, Whisper"]
    end

    subgraph persistence["db/"]
        DBI["database.py"]
        MOD["models.py Pydantic"]
        SQL[("cv_matcher.db")]
    end

    MAIN --> endpoints
    E1 --> P
    E1 --> AI
    E1 --> SIM
    E2 --> DBI
    E3 --> V
    E3 --> AI
    DBI --> SQL
    AI --> OAI["OpenAI API"]
    V --> OAI
```

Feedback-ul uman (`POST /feedback`) alimentează învățarea din cazuri similare pentru analizele viitoare în MVP-ul modulului AI.

---

## 8. Domenii funcționale (mapare UI → API)

| Zonă UI (hrsimulator) | API principal | Observații |
|----------------------|-------------|------------|
| Login / Register | `/auth/*` | JWT; cont nou poate aștepta aprobare rol |
| Acasă / posturi disponibile | `GET /api/posturi/disponibile` | Public |
| Aplicare job | `POST /api/aplicatii` | Public; upload CV până la 10 MB, video până la 200 MB |
| Dashboard recrutare | `GET /api/aplicatii/dashboard` | Filtrare server după rol și atribuiri |
| Cereri angajare | `/api/cereri-angajare` | Manager departament / flux aprobare |
| Administrare | `/api/admin/*`, `/api/utilizatori`, `/api/departamente` | Rol `ADMIN` / manageri |
| Meta HR | `/api/hr` | Recrutori, intervievatori, roluri |

---

## Fișiere sursă principale

| Concern | Locație |
|---------|---------|
| Frontend entry + rute | `hrsimulator/src/App.jsx` |
| Proxy dev | `hrsimulator/vite.config.js` |
| Config backend | `backend/hrdatabase/src/main/resources/application.properties` |
| Securitate JWT | `backend/hrdatabase/.../security/SecurityConfig.java` |
| Client AI CV | `.../service/AiCvReviewClientService.java` |
| Client AI video | `.../service/AiEnglishVideoReviewClientService.java` |
| Modul AI | `module_ai/modul_ai_cv_review/main.py` |
| Diagramă clase | `diagrame/diagrama-clase.md` |

Dacă schimbi porturi, proxy-ul sau integrarea AI, actualizează această diagramă pentru a rămâne aliniată mediului tău de rulare.
