# Schemă bloc (High-Level Design) — Simulator HR

Vedere **high-level** a aplicației `licenta_devm`, derivată din structura codului: blocuri mari, responsabilități și interacțiuni. Detaliul pe module software este în [diagrama-componente.md](./diagrama-componente.md); fluxurile runtime în [diagrama-arhitectura.md](./diagrama-arhitectura.md).

Diagrame [Mermaid](https://mermaid.js.org/) — randare în GitHub, VS Code, Cursor preview.

---

## 1. Schema bloc principală (5 blocuri + externe)

Cele **cinci blocuri** ale sistemului și dependențele externe. Săgețile indică direcția principală a apelului / datelor.

```mermaid
flowchart TB
    subgraph external_users["În afara sistemului"]
        U["Utilizatori<br/>HR + candidați"]
    end

    subgraph B1["Bloc 1 — Interfață utilizator"]
        UI["hrsimulator<br/>React + Vite<br/>Pagini, formulare, dashboard"]
    end

    subgraph B2["Bloc 2 — Nucleu aplicație"]
        CORE["hrdatabase<br/>Spring Boot<br/>API REST · JWT · business logic"]
    end

    subgraph B3["Bloc 3 — Persistență"]
        DATA["PostgreSQL HR<br/>+ stocare fișiere<br/>app.upload.dir"]
    end

    subgraph B4["Bloc 4 — Motor analiză AI"]
        AI["modul_ai_cv_review<br/>FastAPI :8000"]
    end

    subgraph external_cloud["Serviciu extern"]
        OAI["OpenAI API"]
    end

    U <-->|"HTTP<br/>:5173 dev"| UI
    UI <-->|"REST JSON / multipart<br/>/api · /auth"| CORE
    CORE <-->|"JDBC · read/write fișiere"| DATA
    CORE -->|"HTTP intern<br/>/analyze · /analyze-video"| AI
    AI <-->|"HTTPS"| OAI
```

### Tabel bloc → cod sursă

| Bloc | Folder / pachet | Rol |
|------|-----------------|-----|
| **1 — Interfață** | `hrsimulator/src/` | Prezentare, rutare, `apiFetch`, context autentificare |
| **2 — Nucleu** | `backend/hrdatabase/src/main/java/.../hrdatabase/` | Controllere, servicii, securitate, clienți AI |
| **3 — Persistență** | PostgreSQL + `${user.home}/.licenta_devm/uploads` | Entități JPA, CV, video, PDF descrieri |
| **4 — Motor AI** | `module_ai/modul_ai_cv_review/` | Analiză CV–job, feedback, video engleză |
| **Extern** | `platform.openai.com` | LLM, Whisper (prin modul AI) |

---

## 2. High-Level Design — interacțiuni pe tip de date

Aceeași schemă, cu **etichete pe fluxuri** (ce traversează granițele).

```mermaid
flowchart LR
    U((Utilizator))

    subgraph B1["Bloc 1"]
        UI[Interfață web]
    end

    subgraph B2["Bloc 2"]
        API[Nucleu Spring Boot]
    end

    subgraph B3["Bloc 3"]
        DB[(PostgreSQL)]
        FS[(Fișiere)]
    end

    subgraph B4["Bloc 4"]
        ML[Motor AI FastAPI]
    end

    OAI[OpenAI]

    U -->|"1. HTML/JS, acțiuni UI"| UI
    UI -->|"2. JWT + JSON / FormData"| API
    API -->|"3a. SQL entități"| DB
    API -->|"3b. bytes CV, video, PDF"| FS
    API -->|"4. text CV/job sau bytes video"| ML
    ML -->|"5. prompt / audio"| OAI
    ML -->|"6. scor, verdict JSON"| API
    API -->|"7. DTO dashboard"| UI
    UI -->|"8. afișare"| U
```

| Pas | De la | La | Conținut tipic |
|-----|-------|-----|----------------|
| 1 | Utilizator | UI | click, formulare, navigare |
| 2 | UI | Nucleu | `Authorization: Bearer`, body JSON sau multipart |
| 3a | Nucleu | PostgreSQL | `Utilizator`, `Post`, `CerereAngajare`, `Aplicatie` |
| 3b | Nucleu | Disc | `cv/`, `video/`, `cereri/`, `posturi/` |
| 4 | Nucleu | Motor AI | `cv_text` + `job_text` sau `video_file` |
| 5 | Motor AI | OpenAI | completări chat, transcriere Whisper |
| 6–8 | Retur | Utilizator | scor AI, pipeline, fișiere descărcabile |

**Important:** Blocul 1 **nu** apelează Blocul 4 direct; toate cererile AI trec prin Blocul 2 (`AiCvReviewClientService`, `AiEnglishVideoReviewClientService`).

---

## 3. Decompunere Bloc 2 — sub-blocuri domeniu (tot high-level)

Nucleul Spring Boot, împărțit pe **capabilități** mapate la controllere/servicii din cod (fără a detalia fiecare clasă).

```mermaid
flowchart TB
    subgraph B2["Bloc 2 — Nucleu aplicație (hrdatabase)"]
        direction TB

        GW["Graniță API<br/>Controllere REST"]

        subgraph SB["Sub-blocuri business"]
            AUTH["Autentificare<br/>AuthController · JwtService"]
            ORG["Organizație<br/>Departament · Utilizator · HrMeta"]
            REC["Recrutare<br/>Post · CerereAngajare"]
            APL["Aplicații & pipeline<br/>AplicatieController · AplicatieService"]
            ADM["Administrare<br/>Admin*Controller"]
        end

        subgraph SC["Sub-blocuri transversale"]
            SEC["Securitate<br/>SecurityConfig · JWT Filter"]
            DOC["Documente<br/>DocumentTextExtractor · PDFBox/POI"]
            MATCH["Potrivire locală<br/>CvJobMatchService"]
            AICL["Integrare AI<br/>AiCv* · AiEnglish* Client"]
            STO["Stocare fișiere<br/>*FileStorageService"]
            REPO["Acces date<br/>Repositories JPA"]
        end

        GW --> SEC
        SEC --> AUTH
        SEC --> ORG
        SEC --> REC
        SEC --> APL
        SEC --> ADM

        AUTH --> REPO
        ORG --> REPO
        REC --> REPO
        REC --> STO
        APL --> REPO
        APL --> STO
        APL --> DOC
        APL --> MATCH
        APL --> AICL
        ADM --> REPO
    end

    B3[("Bloc 3<br/>PostgreSQL + disc")]
    B4["Bloc 4<br/>Motor AI"]

    REPO --> B3
    STO --> B3
    AICL --> B4
```

### Mapare sub-bloc → API (prefixe)

| Sub-bloc | Controllere principale | Servicii reprezentative |
|----------|------------------------|-------------------------|
| Autentificare | `AuthController` | `AuthService`, `JwtService` |
| Organizație | `DepartamentController`, `UtilizatorController`, `HrMetaController` | `DepartamentService`, `UtilizatorService` |
| Recrutare | `PostController`, `CerereAngajareController` | `PostService`, `CerereAngajareService`, `PostAccessService` |
| Aplicații | `AplicatieController` | `AplicatieService` |
| Administrare | `AdminCatalogController`, `AdminCerereAngajareController`, `AdminPostAssignmentController`, `AdminAplicatieMatchController` | servicii asociate |
| Integrare AI | — (fără controller public) | `AiCvReviewClientService`, `AiEnglishVideoReviewClientService` |

---

## 4. Decompunere Bloc 1 — sub-blocuri UI

```mermaid
flowchart TB
    subgraph B1["Bloc 1 — Interfață (hrsimulator)"]
        APP["App.jsx<br/>Router · stare globală posturi/cereri"]
        CTX["LoginContext + localStorage"]

        subgraph API_JS["Strat integrare"]
            CLIENT["client.js · apiFetch"]
            MOD["authApi · postsApi · aplicatiiApi<br/>cereriApi · departamenteApi · …"]
        end

        subgraph PAGES["Zone funcționale UI"]
            PUB["Public<br/>Acasa · AplicareJob · Login"]
            HR["HR<br/>Dashboard · Administrare posturi · Cereri"]
            MD["Manager dept<br/>CerereAngajare · PosturiDepartament"]
            ADM_UI["Admin<br/>AdminPanel"]
        end

        APP --> CTX
        APP --> PAGES
        PAGES --> MOD
        MOD --> CLIENT
    end

    B2["Bloc 2 — Nucleu Spring Boot"]

    CLIENT -->|"REST"| B2
```

---

## 5. Decompunere Bloc 4 — sub-blocuri motor AI

```mermaid
flowchart TB
    subgraph B4["Bloc 4 — Motor analiză AI"]
        HTTP["main.py<br/>FastAPI endpoints"]

        subgraph SVC["Servicii"]
            PARSE["parsing_service"]
            AISVC["ai_service"]
            SIM["similarity_service"]
            VID["video_service"]
        end

        DB_AI[("cv_matcher.db<br/>feedback")]
    end

    B2["Bloc 2 — Nucleu"]
    OAI["OpenAI"]

    B2 -->|"POST /analyze"| HTTP
    B2 -->|"POST /analyze-video"| HTTP
    HTTP --> PARSE
    HTTP --> AISVC
    HTTP --> SIM
    HTTP --> VID
    AISVC --> OAI
    VID --> OAI
    SIM --> DB_AI
    HTTP --> DB_AI
```

---

## 6. Vedere bloc (sintaxă block — alternativă)

Diagramă compactă tip **block diagram** (Mermaid `block-beta`; necesită renderer recent).

```mermaid
block-beta
    columns 3

    block:groupUI:1
        ui["Bloc 1: Interfață\nReact / hrsimulator"]
    block:groupCore:1
        core["Bloc 2: Nucleu\nSpring Boot / hrdatabase"]
    block:groupData:1
        data["Bloc 3: Persistență\nPostgreSQL + fișiere"]

    block:groupAI:1
        ai["Bloc 4: Motor AI\nFastAPI"]
    block:groupExt:1
        oai["OpenAI"]

    ui --> core
    core --> data
    core --> ai
    ai --> oai
```

---

## 7. Legenda și graniți de sistem

```mermaid
flowchart LR
    subgraph inside["În interiorul aplicației HR Database"]
        B1["Bloc 1"]
        B2["Bloc 2"]
        B3["Bloc 3"]
        B4["Bloc 4"]
        B1 --- B2
        B2 --- B3
        B2 --- B4
    end

  EXT1["Utilizatori"]
  EXT2["OpenAI"]

  EXT1 -.-> B1
  B4 -.-> EXT2
```

| Graniță | Ce nu traversează |
|---------|------------------|
| Utilizator → doar Bloc 1 | Nu există acces direct la PostgreSQL, fișiere sau FastAPI din browser |
| Bloc 1 → doar Bloc 2 | Frontend-ul nu cunoaște URL-ul OpenAI |
| Bloc 4 → OpenAI | Cheia API rămâne în mediul Python |

---

## Fișiere sursă

| Bloc | Locație |
|------|---------|
| 1 | `hrsimulator/` |
| 2 | `backend/hrdatabase/` |
| 3 | `application.properties` (`spring.datasource`, `app.upload.dir`) |
| 4 | `module_ai/modul_ai_cv_review/` |

La modificări majore de structură (ex. nou microserviciu), actualizează această schemă bloc înainte de diagramele detaliate.
