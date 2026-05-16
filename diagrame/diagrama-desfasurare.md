# Diagramă de desfășurare — aplicație HR Database

Documentul descrie **unde rulează aplicația ta**, privită ca **un singur sistem** („Aplicația HR Database” / „Simulator HR”), nu ca trei produse separate (frontend, backend, modul AI). Procesele interne (Vite, Spring Boot, FastAPI) sunt **detalii de implementare** din același mediu de rulare; utilizatorul și documentația de licență văd **un punct de intrare** și **un set de dependențe externe**.

Pentru descompunerea pe straturi, vezi [diagrama-arhitectura.md](./diagrama-arhitectura.md) și [diagrama-componente.md](./diagrama-componente.md).

Diagramele folosesc [Mermaid](https://mermaid.js.org/).

---

## 1. Vedere unitară — ce se deployează

Artefactul logic deployat este **întreaga aplicație HR**: interfață web, API, logică de business, integrare AI și persistență orchestrate împreună. Nu există, în documentația aceasta, trei aplicații distincte la nivel de desfășurare — există **o aplicație** și câteva **sisteme externe** de care depinde.

```mermaid
flowchart TB
    subgraph actors["Actori"]
        UHR["Utilizatori HR<br/>(recrutori, manageri, admin)"]
        UCAND["Candidați / vizitatori"]
    end

    subgraph client_device["«device» Client"]
        BROWSER["Browser web"]
    end

    subgraph runtime["«executionEnvironment» Mediu de rulare<br/>(ex.: stație Windows locală)"]
        APP["«deployed artifact»<br/><b>Aplicația HR Database</b><br/>Simulator HR — sistem complet"]
    end

    subgraph external["«node» Dependențe externe"]
        PG[("«database» PostgreSQL<br/>bază HR :5432")]
        FS[("«storage» Fișiere aplicație<br/>~/.licenta_devm/uploads")]
        OAI["«external service» OpenAI API<br/>(analiză CV / video)"]
    end

    UHR --> BROWSER
    UCAND --> BROWSER
    BROWSER -->|"HTTP — punct unic<br/>de acces utilizator"| APP

    APP -->|"JDBC"| PG
    APP -->|"read/write"| FS
    APP -->|"HTTPS (opțional /<br/>obligatoriu pentru video)"| OAI
```

### Ce înseamnă „Aplicația HR Database” (un singur tot)

| Inclus în artefactul unitar | Rol (intern, nedeployat separat în această diagramă) |
|----------------------------|------------------------------------------------------|
| Interfață web | React + Vite (`hrsimulator`) |
| Serviciu aplicație | Spring Boot (`hrdatabase`) — API, JWT, JPA |
| Motor analiză AI | FastAPI (`modul_ai_cv_review`) — apelat intern de serviciul aplicație |
| Configurare comună | `application.properties`, proxy Vite dev, `ai.cv.review.base-url` |

Utilizatorul **nu** accesează direct porturile 8080 sau 8000 în fluxul normal: în dezvoltare intră pe **un URL** (frontend), iar restul comunicării este internă mediului de rulare.

---

## 2. Punct unic de acces și comunicații

```mermaid
flowchart LR
    USER((Utilizator))

    subgraph app_boundary["Aplicația HR Database — frontieră de sistem"]
        ENTRY["Interfață web<br/>(singură poartă pentru UI)"]
        CORE["Nucleu aplicație<br/>API + reguli + fișiere"]
        AIINT["Integrare analiză AI<br/>(apel intern)"]
        ENTRY --> CORE
        CORE --> AIINT
        AIINT --> CORE
    end

    PG[("PostgreSQL")]
    DISK[("Uploads")]
    CLOUD["OpenAI"]

    USER --> ENTRY
    CORE --> PG
    CORE --> DISK
    AIINT --> CLOUD
```

| Legătură | De la | Către | Protocol / observație |
|---------|-------|-------|------------------------|
| Utilizare | Browser | **Aplicația** (UI) | HTTP(S) — ex. `http://localhost:5173` în dev |
| Date structurate | Aplicația | PostgreSQL | JDBC `localhost:5432/HR` |
| Documente | Aplicația | Disc local | `${user.home}/.licenta_devm/uploads` |
| Inteligență artificială | Aplicația | OpenAI | API key în mediul modulului AI |

În **mediul de dezvoltare** actual, proxy-ul Vite redirecționează `/api` și `/auth` către nucleul aplicației (port 8080) — aceasta este o **legătură internă**, nu o a doua aplicație pentru utilizator.

---

## 3. Nod de desfășurare — mediu local (dezvoltare)

Tot sistemul rulează, în practică, pe **aceeași mașină** (ex. Windows 10/11). Un singur nod găzduiește artefactul aplicație; dependențele externe sunt PostgreSQL (același host sau rețea locală) și serviciul cloud OpenAI.

```mermaid
flowchart TB
    subgraph workstation["«node» PC dezvoltator / server local"]
        direction TB

        APP_BOX["«deployment» Aplicația HR Database"]

        note1["Procese interne pornite împreună cu aplicația:<br/>
        • UI dev (Vite) — intrare utilizator :5173<br/>
        • Nucleu API (Spring Boot) — :8080<br/>
        • Analiză AI (uvicorn) — :8000<br/>
        <i>Nu sunt puncte de intrare separate pentru utilizator.</i>"]

        APP_BOX --- note1
    end

    PG[("PostgreSQL<br/>localhost:5432")]
    UP[("~/.licenta_devm/uploads")]
    OAI["api.openai.com"]

    APP_BOX --> PG
    APP_BOX --> UP
    APP_BOX --> OAI

    DEV((Dezvoltator / operator)) -->|"pornește / oprește<br/>întreaga aplicație"| APP_BOX
    USER((Utilizator final)) -->|"Browser → :5173"| APP_BOX
```

### Pornirea aplicației ca tot unitar

Pentru ca **întregul sistem** să fie funcțional, trebuie active toate procesele interne și dependența PostgreSQL:

| Pas | Acțiune | Face parte din |
|-----|---------|----------------|
| 1 | PostgreSQL pornit, baza `HR` disponibilă | Infrastructură externă |
| 2 | `uvicorn` în `module_ai/modul_ai_cv_review` | Aplicația (subsistem AI) |
| 3 | Spring Boot `hrdatabase` | Aplicația (nucleu) |
| 4 | `npm run dev` în `hrsimulator` | Aplicația (UI) |
| 5 | (Opțional) `OPENAI_API_KEY` setat | Capabilități AI complete |

Dacă lipsește un proces intern, **aplicația unitară** este parțial indisponibilă (ex. fără AI — aplicările merg, dar review-ul CV/video eșuează).

---

## 4. Artefacte și reprezentare fizică

La nivel de **artefact deployat**, proiectul sursă `licenta_devm` se materializează astfel:

```mermaid
flowchart LR
    subgraph repo["Depozit sursă licenta_devm"]
        SRC["Cod sursă<br/>hrsimulator + backend + module_ai"]
    end

    subgraph built["Artefacte la rulare (același mediu)"]
        UI["Resurse UI<br/>(dev: Vite; prod: build static)"]
        JAR["Aplicație Java<br/>hrdatabase.jar / Gradle bootRun"]
        PY["Runtime Python<br/>modul_ai + venv"]
        CFG["Config + secrete<br/>application.properties, .env"]
    end

    subgraph persisted["Stare persistentă"]
        DBDATA[("Date PostgreSQL")]
        FILES[("Fișiere upload")]
        SQLAI[("cv_matcher.db<br/>feedback AI")]
    end

    SRC -->|"build / run"| built
    built --> persisted
```

| Stare | Locație tipică | Proprietar logic |
|-------|----------------|------------------|
| Utilizatori, posturi, aplicații | PostgreSQL `HR` | Aplicația |
| CV, video, PDF descrieri | `app.upload.dir` | Aplicația |
| Feedback învățare AI | `cv_matcher.db` (lângă modul AI) | Aplicația (capabilitate AI) |

---

## 5. Mediu de producție (vedere unitară, conceptuală)

În producție, același **tot unitar** poate fi expus printr-un **singur domeniu**; procesele interne stau în spatele unui reverse proxy — utilizatorul vede tot **o aplicație**.

```mermaid
flowchart TB
    USER((Utilizatori))

    subgraph internet["Rețea"]
        DNS["https://hr.exemplu.ro"]
    end

    subgraph server["«node» Server aplicație"]
        PROXY["Reverse proxy<br/>(nginx / Caddy)"]
        UNIT["Aplicația HR Database<br/>UI static + API + AI<br/>(unul sau mai multe procese,<br/>o singură frontieră)"]
        PROXY --> UNIT
    end

    PG[("PostgreSQL<br/>server DB")]
    VOL[("Volume fișiere<br/>uploads")]
    OAI["OpenAI API"]

    USER --> DNS --> PROXY
    UNIT --> PG
    UNIT --> VOL
    UNIT --> OAI
```

Această variantă nu este neapărat implementată în repo; ilustrează că **desfășurarea documentată** rămâne un singur sistem, indiferent câte procese OS rulează în spate.

---

## 6. Matrice: elemente din diagramă vs. folder repo

Pentru aliniere cu codul, fără a sparge diagrama în „3 aplicații”:

| Element diagramă (unitar) | Reprezentare în cod (referință) |
|---------------------------|----------------------------------|
| Interfață web | `hrsimulator/` |
| Nucleu API + persistență | `backend/hrdatabase/` |
| Integrare AI | `module_ai/modul_ai_cv_review/` |
| Configurare globală | `application.properties`, `vite.config.js` |
| Intrare utilizator (dev) | `http://localhost:5173` |
| Bază de date | `jdbc:postgresql://localhost:5432/HR` |

---

## Fișiere sursă și documente înrudite

| Document | Conținut |
|----------|----------|
| `diagrame/diagrama-arhitectura.md` | Fluxuri și integrări (vedere tehnică) |
| `diagrame/diagrama-componente.md` | Module software interne |
| `diagrame/diagrama-clase.md` | Model de domeniu |
| `backend/hrdatabase/src/main/resources/application.properties` | DB, upload, AI, CORS |
| `hrsimulator/vite.config.js` | Proxy dev către nucleu |

Dacă schimbi modul de publicare (un singur container, un singur port public), actualizează **punctul unic de acces** din secțiunile 2 și 5, păstrând aplicația ca tot unitar.
