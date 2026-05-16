# Diagramă de componente — aplicație HR Database

Documentul descrie **componentele software** din `licenta_devm` și **dependențele** între ele (ce furnizează / ce consumă fiecare modul). Complementează [diagrama-arhitectura.md](./diagrama-arhitectura.md) (fluxuri runtime) și [diagrama-clase.md](./diagrama-clase.md) (model de domeniu).

Diagramele folosesc [Mermaid](https://mermaid.js.org/). Pentru o diagramă UML strictă de componente, aceeași structură poate fi redată în PlantUML cu stereotipul `component`.

---

## 1. Componente de nivel sistem

Trei artefacte deployabile principale + infrastructură externă.

```mermaid
flowchart TB
    subgraph comp_hrsimulator["«component» hrsimulator"]
        direction TB
        IF_FE["«interface»<br/>HTTP REST client<br/>(/api, /auth)"]
    end

    subgraph comp_hrdatabase["«component» hrdatabase"]
        direction TB
        IF_API["«interface»<br/>REST API :8080"]
        IF_AI_CLIENT["«interface»<br/>AI Client HTTP"]
    end

    subgraph comp_ai["«component» modul_ai_cv_review"]
        direction TB
        IF_AI["«interface»<br/>FastAPI :8000"]
    end

    PG[("«component»<br/>PostgreSQL")]
    FS[("«component»<br/>FileSystem<br/>uploads")]
    OAI["«component»<br/>OpenAI API"]

    Browser["Actor: Browser"] --> IF_FE
    IF_FE --> IF_API
    IF_API --> PG
    IF_API --> FS
    IF_AI_CLIENT --> IF_AI
    IF_AI --> OAI
    IF_AI --> SQLITE[("SQLite<br/>feedback")]
```

| Componentă | Pachet / folder | Rol |
|------------|-----------------|-----|
| **hrsimulator** | `hrsimulator/` | SPA React; prezentare și apeluri HTTP |
| **hrdatabase** | `backend/hrdatabase/` | API, securitate, business logic, JPA |
| **modul_ai_cv_review** | `module_ai/modul_ai_cv_review/` | Analiză CV–job, feedback, video engleză |
| **PostgreSQL** | extern | Persistență relațională |
| **FileSystem** | `app.upload.dir` | CV, video, descrieri fișier |

---

## 2. Frontend — `hrsimulator`

### 2.1 Structură componente

```mermaid
flowchart TB
    subgraph hrsimulator["Component: hrsimulator"]
        APP["App.jsx<br/>Router + stare globală"]

        subgraph ctx["Context / hooks"]
            LC["LoginContext"]
            HOOK["useMyLocalStorage"]
        end

        subgraph api_layer["Strat API"]
            CLIENT["client.js<br/>apiFetch"]
            AUTH_API["authApi"]
            POSTS_API["postsApi"]
            APP_API["aplicatiiApi"]
            CER_API["cereriApi"]
            DEPT_API["departamenteApi"]
            USER_API["utilizatoriApi"]
            HR_API["hrMetaApi"]
            MAP["mapUser"]
        end

        subgraph ui_public["UI — public"]
            ACASA["Acasa"]
            APLIC["AplicareJob"]
            LOGIN["Login / Register"]
        end

        subgraph ui_hr["UI — HR autentificat"]
            DASH["Dashboard"]
            ADM_POST["AdministrarePosturi"]
            ADauga["AdaugarePost"]
            CER_LIST["CereriList"]
            CER_MELE["CereriMele"]
            CER_NEW["CerereAngajare"]
            POST_DEPT["PosturiDepartament"]
            REC_FIN["RecrutariFinalizate"]
        end

        subgraph ui_admin["UI — Admin"]
            ADMIN["AdminPanel"]
        end

        subgraph ui_shared["UI — partajat"]
            TB["Toolbar"]
            JC["JobCard"]
            CVR["CVReview"]
            CVL["CvFisierLink"]
            VFL["VideoFisierLink"]
            PIPE["PipelineReadonly"]
            UIKIT["ui/*"]
        end
    end

    APP --> ctx
    APP --> api_layer
    APP --> ui_public
    APP --> ui_hr
    APP --> ui_admin
    TB --> LC

    ui_public --> api_layer
    ui_hr --> api_layer
    ui_admin --> api_layer
    DASH --> CVR
    DASH --> CVL
    DASH --> VFL
    DASH --> PIPE

    AUTH_API --> CLIENT
    POSTS_API --> CLIENT
    APP_API --> CLIENT
    CER_API --> CLIENT
    DEPT_API --> CLIENT
    USER_API --> CLIENT
    HR_API --> CLIENT
    AUTH_API --> MAP
```

### 2.2 Mapare rute → componente UI

| Rută | Componentă principală | Modul API |
|------|------------------------|-----------|
| `/` | `Acasa` | `postsApi` (disponibile) |
| `/aplicare-job` | `AplicareJob` | `aplicatiiApi` |
| `/login`, `/register` | `Login`, `Register` | `authApi` |
| `/dashboard` | `Dashboard` | `aplicatiiApi`, `postsApi` |
| `/administrare-posturi` | `AdministrarePosturi` | `postsApi`, `hrMetaApi`, `departamenteApi` |
| `/cereri` | `CereriList` | `cereriApi` |
| `/cerere-angajare` | `CerereAngajare` | `cereriApi` |
| `/cererile-mele` | `CereriMele` | `cereriApi` |
| `/posturi-departament` | `PosturiDepartament` | `postsApi` |
| `/admin` | `AdminPanel` | `utilizatoriApi`, `departamenteApi`, `hrMetaApi` |
| `/cont-in-asteptare` | `ContInAsteptare` | — |

---

## 3. Backend — `hrdatabase`

### 3.1 Controllere (interfață REST expusă)

```mermaid
flowchart LR
    subgraph controllers["«component» Controllere REST"]
        AuthC["AuthController<br/>/auth"]
        PostC["PostController<br/>/api/posturi"]
        AplC["AplicatieController<br/>/api/aplicatii"]
        CerC["CerereAngajareController<br/>/api/cereri-angajare"]
        DeptC["DepartamentController<br/>/api/departamente"]
        UserC["UtilizatorController<br/>/api/utilizatori"]
        HrC["HrMetaController<br/>/api/hr"]
        AdmCat["AdminCatalogController"]
        AdmCer["AdminCerereAngajareController"]
        AdmPost["AdminPostAssignmentController"]
        AdmApl["AdminAplicatieMatchController"]
        GEH["GlobalExceptionHandler"]
    end
```

### 3.2 Servicii și dependențe interne

```mermaid
flowchart TB
    subgraph security["«component» security"]
        SEC_CFG["SecurityConfig"]
        JWT_F["JwtAuthenticationFilter"]
        JWT_S["JwtService"]
        UDS["SecurityUserDetailsService"]
        PERM["PermissionExpressions"]
    end

    subgraph services["«component» service"]
        AuthS["AuthService"]
        PostS["PostService"]
        PostAcc["PostAccessService"]
        CerS["CerereAngajareService"]
        AplS["AplicatieService"]
        UserS["UtilizatorService"]
        DeptS["DepartamentService"]
        CandS["CandidatService"]
        CvMatch["CvJobMatchService"]
        DocExt["DocumentTextExtractor"]
        RoleClean["RoleAssignmentCleanupService"]
        AiCv["AiCvReviewClientService"]
        AiVid["AiEnglishVideoReviewClientService"]
    end

    subgraph storage["«component» storage"]
        StorCv["AplicatieCvFileStorageService"]
        StorPost["PostDescriereFileStorageService"]
        StorCer["CerereDescriereFileStorageService"]
    end

    subgraph repos["«component» repository"]
        RUser["UtilizatorRepository"]
        RPost["PostRepository"]
        RApl["AplicatieRepository"]
        RCer["CerereAngajareRepository"]
        RDept["DepartamentRepository"]
        RCand["CandidatRepository"]
        SpecU["UtilizatorSpecifications"]
        SpecD["DepartamentSpecifications"]
    end

    subgraph mappers["«component» mapper"]
        MUser["UtilizatorMapper"]
        MPost["PostMapper"]
        MCer["CerereAngajareMapper"]
    end

    subgraph config["«component» config"]
        AiProps["AiCvReviewProperties"]
        AiCfg["AiCvReviewConfig"]
        Backfill["DatabaseBackfillRunner"]
    end

    subgraph external["Extern"]
        PG[("PostgreSQL")]
        DISK[("FileSystem")]
        FASTAPI["modul_ai_cv_review"]
    end

    AuthC --> AuthS
    PostC --> PostS
    AplC --> AplS
    CerC --> CerS
    DeptC --> DeptS
    UserC --> UserS
    HrC --> UserS

    AuthS --> JWT_S
    AuthS --> RUser
    PostS --> RPost
    PostS --> PostAcc
    PostS --> StorPost
    PostS --> MPost
    CerS --> RCer
    CerS --> StorCer
    CerS --> MCer
    AplS --> RApl
    AplS --> RPost
    AplS --> StorCv
    AplS --> AiCv
    AplS --> AiVid
    AplS --> CvMatch
    AplS --> DocExt
    AplS --> PostAcc
    UserS --> RUser
    UserS --> MUser
    DeptS --> RDept

    AiCv --> AiProps
    AiVid --> AiProps
    AiCfg --> AiCv
    AiCfg --> AiVid

    repos --> PG
    storage --> DISK
    AiCv --> FASTAPI
    AiVid --> FASTAPI

    SEC_CFG --> JWT_F
    JWT_F --> JWT_S
    JWT_F --> UDS
    UDS --> RUser
```

### 3.3 Tabel dependențe servicii → infrastructură

| Serviciu | Repository / storage | Alte componente |
|----------|----------------------|-----------------|
| `AuthService` | `UtilizatorRepository` | `JwtService`, `PasswordEncoder` |
| `PostService` | `PostRepository` | `PostAccessService`, `PostDescriereFileStorageService`, `PostMapper` |
| `CerereAngajareService` | `CerereAngajareRepository` | `CerereDescriereFileStorageService`, `UtilizatorRepository` |
| `AplicatieService` | `AplicatieRepository`, `PostRepository` | storage CV/video, `AiCvReviewClientService`, `AiEnglishVideoReviewClientService`, `CvJobMatchService`, `DocumentTextExtractor` |
| `UtilizatorService` | `UtilizatorRepository` | `UtilizatorMapper`, `RoleAssignmentCleanupService` |
| `DepartamentService` | `DepartamentRepository` | — |
| `AiCvReviewClientService` | — | `RestClient` → FastAPI `/analyze` |
| `AiEnglishVideoReviewClientService` | — | `RestTemplate` → FastAPI `/analyze-video` |

### 3.4 Entități JPA (componentă model)

| Entitate | Repository |
|----------|------------|
| `Utilizator` | `UtilizatorRepository` |
| `Departament` | `DepartamentRepository` |
| `Post` | `PostRepository` |
| `CerereAngajare` | `CerereAngajareRepository` |
| `Aplicatie` | `AplicatieRepository` |
| `Candidat` | `CandidatRepository` |
| `Rol`, `DescriereCerereMod` | (enum-uri în entități) |

---

## 4. Modul AI — `modul_ai_cv_review`

```mermaid
flowchart TB
    subgraph modul_ai["Component: modul_ai_cv_review"]
        MAIN["main.py<br/>FastAPI app"]

        subgraph http["Endpoints"]
            E_ANALYZE["POST /analyze"]
            E_FEED["POST /feedback"]
            E_VIDEO["POST /analyze-video"]
            E_UI["GET /"]
        end

        subgraph svc["services/"]
            PARSE["parsing_service"]
            AI["ai_service"]
            SIM["similarity_service"]
            VIDEO["video_service"]
        end

        subgraph db_pkg["db/"]
            DB["database.py"]
            MODELS["models.py"]
        end

        STATIC["static/index.html"]
        SQLITE[("cv_matcher.db")]
    end

    OAI["OpenAI API"]

    MAIN --> http
    E_ANALYZE --> PARSE
    E_ANALYZE --> AI
    E_ANALYZE --> SIM
    E_FEED --> DB
    E_VIDEO --> VIDEO
    E_VIDEO --> AI
    E_UI --> STATIC
    DB --> SQLITE
    SIM --> DB
    AI --> OAI
    VIDEO --> OAI
```

| Componentă | Fișier | Responsabilitate |
|------------|--------|------------------|
| `main.py` | rutare HTTP, validare input | |
| `parsing_service` | extragere text PDF/DOCX/TXT | |
| `ai_service` | prompt LLM, scor structurat | |
| `similarity_service` | cazuri similare din feedback | |
| `video_service` | ffmpeg, Whisper, evaluare engleză | |
| `database.py` | CRUD feedback SQLite | |
| `models.py` | contracte Pydantic request/response | |

---

## 5. Interfețe între componente (contracte)

### 5.1 Frontend → Backend

Toate modulele `*Api.js` folosesc `apiFetch` din `client.js` (JSON sau `FormData`, header `Authorization` opțional).

```mermaid
flowchart LR
    CLIENT["client.apiFetch"]
    AUTH["authApi"]
    POSTS["postsApi"]
    APL["aplicatiiApi"]
    CER["cereriApi"]
    DEPT["departamenteApi"]
    USR["utilizatoriApi"]
    HR["hrMetaApi"]

    BE_AUTH["AuthController"]
    BE_POST["PostController"]
    BE_APL["AplicatieController"]
    BE_CER["CerereAngajareController"]
    BE_DEPT["DepartamentController"]
    BE_USR["UtilizatorController"]
    BE_HR["HrMetaController"]
    BE_ADM["Admin*Controller"]

    AUTH --> CLIENT --> BE_AUTH
    POSTS --> CLIENT --> BE_POST
    APL --> CLIENT --> BE_APL
    CER --> CLIENT --> BE_CER
    DEPT --> CLIENT --> BE_DEPT
    USR --> CLIENT --> BE_USR
    HR --> CLIENT --> BE_HR
    USR --> CLIENT --> BE_ADM
    DEPT --> CLIENT --> BE_ADM
```

### 5.2 Backend → Modul AI

| Client Java | Endpoint | Body | Răspuns DTO |
|-------------|----------|------|-------------|
| `AiCvReviewClientService` | `POST /analyze` | `cv_text`, `job_text` (form) | `AiCvAnalyzeResponse` |
| `AiEnglishVideoReviewClientService` | `POST /analyze-video` | `video_file` (multipart) | `AiEnglishVideoApiResponse` |

Configurare: prefix `ai.cv.review.*` în `AiCvReviewProperties`, beans în `AiCvReviewConfig`.

### 5.3 DTO-uri (straturi de contract)

| Strat | Locație | Rol |
|-------|---------|-----|
| Request/Response REST | `dto/request`, `dto/response` | JSON API Spring |
| AI bridge | `dto/ai` | mapare JSON FastAPI ↔ entitate `Aplicatie` |
| Pydantic | `module_ai/.../db/models.py` | schema modul AI |

---

## 6. Diagramă componente — aplicații (pipeline recrutare)

Vedere pe **capabilități** (nu pe fișiere), pentru licență / documentație funcțională.

```mermaid
flowchart LR
    subgraph cap_auth["Autentificare"]
        C1["Înregistrare / login JWT"]
        C2["Aprobare rol GUEST"]
    end

    subgraph cap_post["Posturi"]
        C3["Listare publică disponibile"]
        C4["CRUD posturi MR"]
        C5["Atribuiri recrutori / IT"]
    end

    subgraph cap_cer["Cereri angajare"]
        C6["Cerere MD"]
        C7["Aprobare + deschidere post MR"]
    end

    subgraph cap_apl["Aplicații"]
        C8["Aplicare candidat"]
        C9["Dashboard pipeline"]
        C10["Match score local"]
        C11["Review CV AI"]
        C12["Review engleză video AI"]
    end

    subgraph cap_admin["Administrare"]
        C13["Utilizatori / departamente"]
        C14["Catalog admin"]
    end

    cap_auth --> cap_post
    cap_cer --> cap_post
    cap_post --> cap_apl
    cap_auth --> cap_apl
    cap_auth --> cap_admin
```

| Capabilitate | Componente implicate (principal) |
|--------------|----------------------------------|
| Autentificare | `Login`, `authApi`, `AuthController`, `AuthService`, `SecurityConfig` |
| Posturi | `Acasa`, `AdministrarePosturi`, `PostController`, `PostService` |
| Cereri | `CerereAngajare`, `CereriList`, `CerereAngajareController`, `CerereAngajareService` |
| Aplicații | `AplicareJob`, `Dashboard`, `AplicatieController`, `AplicatieService` |
| AI CV | `CVReview`, `AiCvReviewClientService`, FastAPI `/analyze` |
| AI engleză | `Dashboard`, `AiEnglishVideoReviewClientService`, `/analyze-video` |

---

## Fișiere sursă principale

| Componentă | Locație |
|------------|---------|
| Shell frontend | `hrsimulator/src/App.jsx`, `main.jsx` |
| API client | `hrsimulator/src/api/client.js` |
| Controllere | `backend/hrdatabase/.../controller/` |
| Servicii | `backend/hrdatabase/.../service/` |
| Securitate | `backend/hrdatabase/.../security/` |
| Repositories | `backend/hrdatabase/.../repository/` |
| Modul AI | `module_ai/modul_ai_cv_review/main.py`, `services/`, `db/` |
| Arhitectură | `diagrame/diagrama-arhitectura.md` |
| Clase | `diagrame/diagrama-clase.md` |

La adăugarea unui controller, serviciu sau modul `*Api.js`, actualizează diagramele și tabelele de mai sus.
