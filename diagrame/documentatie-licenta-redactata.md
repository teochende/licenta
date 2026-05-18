# Documentație lucrare de licență - Simulator HR

Notă de redactare: textul de mai jos este formulat original, pe baza codului din proiectul `licenta_devm`. Când sunt folosite informații despre tehnologii, standarde, domeniu sau soluții similare, sursele sunt indicate prin citări numerice de forma `[n]`, corelate cu Bibliografia. Marcajele de tip `[Figura X]` indică locuri unde este recomandat să inserezi capturi de ecran, diagrame Mermaid exportate sau listinguri de cod.

## Cuprins propus

1. Introducere
2. Stadiul cunoașterii
3. Modelarea soluției
4. Concluzii și planuri de viitor
5. Bibliografie
6. Anexe

---

# 1. Introducere

## 1.1. Contextul și motivația temei

Recrutarea este un proces organizațional complex, în care mai multe roluri trebuie să colaboreze asupra acelorași date: manageri de departament, manageri de recrutare, recrutori, intervievatori tehnici, administratori și candidați. În practică, aceste date pot ajunge dispersate în e-mailuri, documente locale, foi de calcul sau discuții informale. Rezultatul este o trasabilitate redusă a deciziilor, dificultăți în urmărirea stadiului fiecărui candidat și un efort repetitiv mare pentru echipele HR.

Sistemele de tip Applicant Tracking System (ATS) au apărut pentru a digitaliza și centraliza aceste activități. Conform definițiilor din industria HR, un ATS este o aplicație software care sprijină gestionarea digitală a recrutării și a procesului de angajare [12], [13]. Proiectul de față, denumit **Simulator HR**, nu își propune să concureze cu platforme comerciale mari, ci să reproducă într-un cadru academic un flux realist de recrutare internă, implementat cu tehnologii moderne și extensibil cu funcții de analiză bazată pe inteligență artificială.

Aplicația dezvoltată în repository-ul `licenta_devm` acoperă fluxul de la cererea internă de angajare până la aplicarea candidatului, evaluarea CV-ului, parcurgerea pipeline-ului de recrutare și analiza opțională a competențelor de engleză dintr-un videoclip încărcat de candidat.

[Figura 1 - Captură cu pagina principală a aplicației, unde apar posturile disponibile.]

## 1.2. Problema abordată

Problema principală tratată în lucrare este următoarea: **cum poate fi construită o aplicație web integrată care să modeleze procesul de recrutare, să diferențieze accesul pe roluri, să gestioneze documente și aplicații ale candidaților și să ofere suport automat pentru evaluarea CV-urilor fără a elimina decizia umană?**

Subproblemele rezolvate sunt:

- modelarea entităților principale: utilizatori, departamente, posturi, cereri de angajare și aplicații;
- implementarea autentificării și autorizării pe bază de JWT și roluri;
- construirea unei interfețe web pentru candidați și personal HR;
- stocarea fișierelor încărcate: CV-uri, videoclipuri și descrieri de post;
- extragerea textului din PDF/DOCX/TXT pentru calcularea scorului de potrivire;
- integrarea unui modul AI separat, apelat de backend, nu direct din browser;
- documentarea arhitecturii prin diagrame, fluxuri și fragmente de cod.

## 1.3. Obiectivele lucrării

Obiectivul general este proiectarea și implementarea unei aplicații web pentru simularea și sprijinirea procesului de recrutare.

Obiective specifice:

1. Definirea unui model de date relațional pentru domeniul HR.
2. Implementarea backend-ului REST în Java 21 și Spring Boot.
3. Implementarea autentificării stateless cu JSON Web Token, standard definit în RFC 7519 [1].
4. Implementarea unei interfețe SPA în React, construită cu Vite.
5. Implementarea fluxului cerere de angajare - post - aplicare candidat - dashboard.
6. Implementarea unui algoritm local de potrivire CV-job pe baza cuvintelor cheie.
7. Integrarea unui serviciu FastAPI pentru analiză AI CV-job și analiză video.
8. Realizarea diagramelor de arhitectură, componente, clase și desfășurare.

## 1.4. Structura lucrării

Capitolul 2 prezintă stadiul actual al recrutării asistate software și exemple de soluții similare. Capitolul 3 descrie modelarea și implementarea soluției: tehnologii, arhitectură, model de date, fluxuri funcționale, securitate, integrare AI și exemple de cod. Capitolul 4 sintetizează concluziile, limitările și direcțiile viitoare. Bibliografia reunește sursele folosite, iar anexele pot conține endpoint-uri API, diagrame și listinguri extinse.

---

# 2. Stadiul cunoașterii

## 2.1. Evoluția recrutării digitale

Recrutarea a evoluat de la procese predominant manuale către sisteme digitale care centralizează candidații, posturile, documentele și evaluările. Platformele ATS permit gestionarea electronică a aplicărilor și reduc dependența de instrumente nestructurate. Soluțiile moderne includ, pe lângă stocarea aplicațiilor, funcții precum publicarea posturilor, filtrarea candidaților, programarea interviurilor, colectarea feedback-ului și raportarea [12], [13].

În ultimii ani, inteligența artificială a devenit relevantă în recrutare prin funcții precum generarea descrierilor de post, screening-ul CV-urilor, sumarizarea profilurilor și analiza comunicării candidaților. SHRM observă extinderea rolului AI în activitățile HR, inclusiv în recrutare, dar subliniază importanța păstrării judecății umane și a atenției la bias, acuratețe și confidențialitate [15], [16].

## 2.2. Cerințe actuale pentru o aplicație HR

O aplicație HR modernă trebuie să îndeplinească mai multe cerințe:

- să centralizeze posturile, cererile și aplicațiile;
- să ofere acces diferențiat pe roluri;
- să păstreze istoricul stadiilor din pipeline;
- să permită încărcarea și consultarea documentelor;
- să protejeze datele personale;
- să permită integrarea unor servicii externe fără expunerea secretelor în browser.

Pentru că aplicațiile HR procesează date personale, inclusiv CV-uri și eventual materiale video, proiectarea trebuie raportată la principiile de protecție a datelor. Regulamentul UE 2016/679 (GDPR) stabilește cadrul general pentru prelucrarea datelor personale în Uniunea Europeană [17]. În lucrarea de față, acest aspect este tratat prin autentificare, autorizare pe roluri și limitarea accesului la documente, urmând ca politicile de retenție și consimțământ să fie direcții viitoare.

## 2.3. Soluții software similare

Exemple relevante de soluții comerciale sunt:

| Soluție | Caracteristici relevante | Raportare la proiect |
|---|---|---|
| Workday Talent Acquisition | Suite enterprise pentru recrutare și managementul talentelor, cu funcții AI [14] | Platformă complexă, orientată către organizații mari |
| Greenhouse | Platformă de recrutare și applicant tracking [13] | SaaS comercial, cu fluxuri mature de hiring |
| SAP SuccessFactors Recruiting | Componentă HR pentru procese de recrutare și management candidați [12] | Soluție enterprise integrată în ecosistem SAP |

Simulator HR se diferențiază prin faptul că este o aplicație educațională, transparentă la nivel de cod, auto-găzduită local și construită pentru a demonstra integrarea dintre frontend, backend, persistență și AI. Scopul nu este acoperirea tuturor funcțiilor enterprise, ci construirea unui prototip complet, coerent și explicabil.

## 2.4. Tehnologii și concepte relevante

Proiectul folosește o arhitectură client-server. Frontend-ul este o aplicație React, iar backend-ul expune API-uri REST. Vite este folosit pentru dezvoltarea rapidă a frontend-ului și oferă server de dezvoltare cu Hot Module Replacement [6]. Backend-ul este construit cu Spring Boot, framework care simplifică dezvoltarea aplicațiilor Java și integrarea cu module precum Spring Web, Spring Data JPA și Spring Security [2], [3], [4].

Pentru persistență este folosit PostgreSQL, sistem relațional open-source documentat oficial de PostgreSQL Global Development Group [7]. Pentru documente, Apache PDFBox și Apache POI permit lucrul cu PDF-uri și fișiere Microsoft Office [10], [11]. Modulul AI este construit cu FastAPI, framework Python bazat pe type hints și standarde precum OpenAPI și JSON Schema [8]. Pentru transcriere audio și evaluare semantică se folosește API-ul OpenAI, inclusiv endpoint-uri de speech-to-text [9].

---

# 3. Modelarea soluției

## 3.1. Prezentarea generală a aplicației

Simulator HR este compus din trei părți principale:

- `hrsimulator` - frontend React/Vite;
- `backend/hrdatabase` - backend Spring Boot cu API REST, securitate, business logic și JPA;
- `module_ai/modul_ai_cv_review` - serviciu Python FastAPI pentru analiză CV-job, feedback și analiză video.

În utilizare, candidatul sau utilizatorul HR interacționează cu aplicația prin browser. Frontend-ul comunică prin API cu backend-ul Spring Boot. Backend-ul gestionează autentificarea, regulile de business, datele relaționale, fișierele și apelurile către modulul AI. Modulul AI nu este apelat direct din browser, ceea ce permite păstrarea cheii OpenAI în mediul serverului Python.

[Figura 2 - Diagrama de arhitectură din `diagrame/diagrama-arhitectura.md`, secțiunea „Vedere de ansamblu”.]

## 3.2. Actori și roluri

Aplicația definește următoarele roluri principale în enum-ul `Rol` și în `LoginContext`:

| Rol | Responsabilitate |
|---|---|
| `ADMIN` | gestionează utilizatori, departamente și operații administrative |
| `MANAGER_RECRUTARE` | administrează posturi, cereri și recrutări finalizate |
| `MANAGER_DEPARTAMENT` | creează cereri de angajare și urmărește posturile departamentului |
| `RECRUTOR` | lucrează cu aplicațiile candidaților pe posturile atribuite |
| `INTERVIEVATOR_TEHNIC` | vede aplicațiile marcate vizibile pentru partea tehnică |
| `GUEST` | cont în așteptare până la validarea rolului |

[Figura 3 - Captură cu pagina de administrare utilizatori, unde se observă rolurile.]

## 3.3. Cerințe funcționale

Cerințele funcționale principale sunt:

1. autentificare și înregistrare utilizatori;
2. afișarea posturilor disponibile pentru candidați;
3. aplicarea la un post cu CV obligatoriu și video opțional;
4. crearea cererilor de angajare de către managerul de departament;
5. deschiderea posturilor din cereri de către managerul de recrutare;
6. administrarea posturilor, recrutorilor și intervievatorilor;
7. dashboard pentru candidați și pipeline;
8. scor local CV-job;
9. review AI pentru CV;
10. review automat al competențelor de engleză din video;
11. administrarea utilizatorilor și departamentelor.

## 3.4. Cerințe nefuncționale

Cerințele nefuncționale urmărite sunt:

- securitate prin autentificare JWT și autorizare pe roluri;
- separarea responsabilităților pe straturi;
- persistență relațională în PostgreSQL;
- stocare stabilă a fișierelor prin `app.upload.dir`;
- toleranță la indisponibilitatea modulului AI pentru fluxul CV;
- limite de dimensiune pentru upload-uri multipart;
- posibilitatea de extindere ulterioară cu deployment, notificări și rapoarte.

## 3.5. Tehnologii utilizate

### 3.5.1. Frontend: React și Vite

Frontend-ul este o SPA React, definită în folderul `hrsimulator`. Fișierul `package.json` include dependențe precum `react`, `react-dom` și `react-router-dom`. Aplicația folosește `App.jsx` pentru rutare și stare globală, iar `LoginContext` pentru păstrarea datelor de autentificare.

Vite este folosit ca server de dezvoltare și build tool. Configurația `vite.config.js` definește proxy pentru `/api` și `/auth` către backend-ul Spring Boot:

```js
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
    '/auth': { target: 'http://localhost:8080', changeOrigin: true },
  },
}
```

[Listare 1 - Configurația proxy din `hrsimulator/vite.config.js`.]

### 3.5.2. Backend: Java 21 și Spring Boot

Backend-ul este o aplicație Gradle, definită în `backend/hrdatabase`. Fișierul `build.gradle` configurează Java 21 și Spring Boot 4.0.5. Sunt folosite module pentru web, securitate, validare, JPA, PostgreSQL, parsare documente și JWT.

Straturile backend-ului sunt:

- controllere REST în pachetul `controller`;
- servicii de business în `service`;
- entități JPA în `entity`;
- repository-uri în `repository`;
- DTO-uri în `dto`;
- securitate în `security`;
- configurări în `config`.

[Figura 4 - Diagrama de componente din `diagrame/diagrama-componente.md`.]

### 3.5.3. Baza de date: PostgreSQL și JPA

Persistența principală este realizată în PostgreSQL. Conexiunea este configurată în `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/HR
spring.jpa.hibernate.ddl-auto=update
```

JPA/Hibernate mapează clasele Java pe tabele. Repository-urile Spring Data JPA reduc codul necesar pentru operații CRUD și interogări [4].

### 3.5.4. Modul AI: Python și FastAPI

Modulul AI se află în `module_ai/modul_ai_cv_review`. Acesta expune endpoint-uri:

- `POST /analyze` - analiză CV-job;
- `POST /feedback` - salvare feedback uman pentru cazuri similare;
- `POST /analyze-video` - analiză engleză din videoclip.

FastAPI validează request-urile și response-urile prin modele Pydantic din `db/models.py`. Modulul folosește `pdfplumber`, `python-docx`, `openai`, `imageio-ffmpeg` și SQLite pentru feedback.

[Figura 5 - Diagrama internă a modulului AI din `diagrame/diagrama-arhitectura.md`, secțiunea „Modul AI”.]

## 3.6. Modelul de date

Entitățile principale sunt:

- `Utilizator` - cont de aplicație, rol, e-mail, parolă hash-uită și departament;
- `Departament` - unitate organizațională;
- `Post` - poziție deschisă, departament, nivel, descriere, prioritate, număr de poziții și atribuiri;
- `CerereAngajare` - solicitare internă de deschidere post;
- `Aplicatie` - aplicarea candidatului la un post, cu CV, video, scoruri, pipeline și rezultate AI;
- `Candidat` - entitate existentă minimal în proiect.

Relațiile importante sunt:

- un `Utilizator` poate aparține unui `Departament`;
- un `Post` aparține unui `Departament`;
- un `Post` poate avea mai mulți recrutori și intervievatori tehnici;
- o `CerereAngajare` poate genera un `Post`;
- o `Aplicatie` aparține unui `Post`.

[Figura 6 - Diagrama de clase din `diagrame/diagrama-clase.md`.]

Un aspect important de implementare este faptul că starea pipeline-ului este păstrată în `Aplicatie.pipelineState` ca JSON text. Această alegere permite modificarea structurii pipeline-ului în frontend fără a introduce migrații frecvente de schemă.

## 3.7. Arhitectura soluției

Arhitectura este multi-strat:

1. **Prezentare** - React, componente UI, rutare și formulare.
2. **Integrare frontend** - module `src/api/*.js`, cu funcția comună `apiFetch`.
3. **API backend** - controllere REST Spring Boot.
4. **Business logic** - servicii Java.
5. **Persistență** - Spring Data JPA și PostgreSQL.
6. **Stocare fișiere** - servicii dedicate pentru upload-uri.
7. **AI auxiliar** - FastAPI, apelat server-to-server.

Frontend-ul transmite tokenul JWT în header-ul `Authorization`. Funcția comună `apiFetch` decide dacă trimite JSON sau `FormData`:

```js
if (body != null && !(body instanceof FormData)) {
  h['Content-Type'] = 'application/json'
}
if (token) {
  h['Authorization'] = `Bearer ${token}`
}
```

[Listare 2 - Fragment din `hrsimulator/src/api/client.js`.]

## 3.8. Securitate

Securitatea este implementată cu Spring Security. Aplicația folosește sesiuni stateless, iar tokenul JWT este trimis la fiecare cerere protejată. Standardul JWT definește o metodă compactă pentru transmiterea unor claims între părți [1].

În `SecurityConfig`, sunt permise public doar rutele necesare pentru login, register, listarea posturilor disponibile și depunerea aplicațiilor:

```java
.authorizeHttpRequests(a -> a
    .requestMatchers(HttpMethod.POST, "/api/aplicatii", "/api/aplicatii/json").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/posturi/disponibile", "/api/posturi/disponibile/meta").permitAll()
    .requestMatchers("/auth/login", "/auth/register").permitAll()
    .anyRequest().authenticated())
```

[Listare 3 - Configurare rute publice/protejate în `SecurityConfig.java`.]

În plus, controlul pe roluri este realizat prin `@PreAuthorize` în controllere. De exemplu, cererile de angajare pot fi create de `MANAGER_DEPARTAMENT` sau `ADMIN`, iar cererile pending pot fi consultate de `MANAGER_RECRUTARE` sau `ADMIN`.

[Figura 7 - Diagramă secvență autentificare JWT din `diagrame/diagrama-arhitectura.md`.]

## 3.9. Fluxuri funcționale

### 3.9.1. Fluxul candidatului

Candidatul accesează pagina principală, vizualizează posturile disponibile și completează formularul de aplicare. Formularul trimite datele candidatului, CV-ul și opțional videoclipul către `POST /api/aplicatii`.

Backend-ul verifică existența postului, validează că postul este activ, previne aplicările duplicate pentru același e-mail și același post, salvează CV-ul pe disc, extrage textul din document și creează entitatea `Aplicatie`.

[Figura 8 - Captură cu lista de posturi.]
[Figura 9 - Captură cu formularul de aplicare și upload CV/video.]

### 3.9.2. Fluxul cerere de angajare - post

Managerul de departament creează o cerere de angajare. Cererea poate conține descriere manuală sau fișier de descriere. Managerul de recrutare vede cererile pending și poate deschide un post dintr-o cerere. În acel moment, sistemul creează o entitate `Post`, păstrând legătura cu cererea inițială.

[Figura 10 - Captură cu formularul de cerere angajare.]
[Figura 11 - Captură cu lista cererilor pending și acțiunea de deschidere post.]

### 3.9.3. Fluxul dashboard

Dashboard-ul afișează aplicațiile vizibile pentru utilizatorul curent. Accesul este filtrat în backend prin `PostAccessService`, nu doar în interfață. În dashboard pot fi actualizate:

- starea pipeline-ului;
- vizibilitatea pentru intervievatori tehnici;
- review-ul AI pentru CV;
- review-ul automat de engleză din videoclip;
- observațiile și detaliile asociate candidatului.

[Figura 12 - Captură dashboard cu aplicații și filtre.]
[Figura 13 - Captură pipeline candidat.]

## 3.10. Scor local de potrivire CV-job

Scorul local este implementat în `CvJobMatchService`. Algoritmul este intenționat simplu și explicabil:

1. extrage din descrierea jobului doar liniile care încep cu `=keywords=`;
2. normalizează textul: litere mici, eliminare diacritice, filtrare caractere;
3. elimină stopwords;
4. caută fiecare keyword în textul CV-ului;
5. calculează procentul de keywords găsite.

Fragment reprezentativ:

```java
double ratio = (double) common / (double) jobTokens.size();
int pct = (int) Math.round(ratio * 100.0);
if (pct < 0) pct = 0;
if (pct > 100) pct = 100;
return pct;
```

[Listare 4 - Calculul scorului local în `CvJobMatchService.java`.]

Avantajul acestui mecanism este că funcționează fără servicii externe și oferă un scor ușor de explicat. Limitarea este că nu înțelege semantic sinonimele sau experiența implicită, motiv pentru care proiectul integrează și un scor AI.

## 3.11. Integrarea AI pentru analiza CV-job

Analiza AI este realizată în două etape:

1. backend-ul Java pregătește textul CV și textul jobului;
2. `AiCvReviewClientService` trimite datele către `POST /analyze` din modulul FastAPI.

Fragment din clientul Java:

```java
MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
form.add("cv_text", cv);
form.add("job_text", job);

AiCvAnalyzeResponse body = aiCvReviewRestClient
    .post()
    .uri("/analyze")
    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
    .body(form)
    .retrieve()
    .body(AiCvAnalyzeResponse.class);
```

[Listare 5 - Apelul către modulul AI în `AiCvReviewClientService.java`.]

Modulul Python caută cazuri similare din feedback-ul stocat, apoi construiește un prompt pentru evaluarea CV-ului raportat la descrierea jobului. Răspunsul așteptat este JSON strict, cu scor, competențe potrivite, competențe lipsă și recomandare. Dacă nu există cheie OpenAI sau apare o eroare, modulul folosește fallback pe similaritate de keywords.

[Figura 14 - Diagramă secvență „aplicare job + review CV AI” din `diagrame/diagrama-arhitectura.md`.]

## 3.12. Analiza competențelor de engleză din video

Pentru candidații care încarcă un videoclip, dashboard-ul permite activarea review-ului automat de engleză. Backend-ul citește fișierul video salvat și îl trimite multipart către `POST /analyze-video`.

În modulul FastAPI, fluxul este:

1. validare fișier video;
2. verificarea duratei maxime;
3. extragere audio WAV cu ffmpeg;
4. transcriere cu API-ul OpenAI speech-to-text;
5. evaluare LLM a transcriptului;
6. returnarea unui JSON cu scor, nivel CEFR, verdict și feedback.

OpenAI documentează endpoint-urile de speech-to-text și modelele de transcriere disponibile [9]. În proiect, codul folosește `whisper-1` pentru transcriere, conform implementării din `AIService.transcribe_audio_wav`.

[Figura 15 - Captură cu rezultatul analizei englezei: scor, verdict, tooltip.]

## 3.13. Gestiunea fișierelor

Fișierele sunt stocate sub directorul configurat prin:

```properties
app.upload.dir=${user.home}/.licenta_devm/uploads
```

Există servicii dedicate pentru tipuri de fișiere:

- `AplicatieCvFileStorageService` - CV-uri și videoclipuri;
- `PostDescriereFileStorageService` - fișiere descriere post;
- `CerereDescriereFileStorageService` - fișiere atașate cererilor.

Separarea logicii de stocare reduce duplicarea codului și face mai simplă migrarea ulterioară către un storage extern.

## 3.14. Validare și tratarea erorilor

Backend-ul folosește DTO-uri de request și validări prin Spring Validation. Erorile sunt centralizate prin `GlobalExceptionHandler`, care transformă excepțiile într-un răspuns API coerent. În frontend, funcția `parseError` din `client.js` încearcă să citească mesajul JSON al backend-ului și îl propagă către componente.

Pentru AI, clientul Java întoarce `Optional.empty()` când modulul este indisponibil, iar aplicația păstrează funcționalitățile de bază. Astfel, AI este o capabilitate opțională pentru CV, dar necesară pentru analiza video completă.

## 3.15. Mediu de rulare

Pentru rularea completă locală sunt necesare:

1. PostgreSQL cu baza `HR`;
2. backend Spring Boot pe portul 8080;
3. frontend Vite pe portul 5173;
4. modul FastAPI pe portul 8000;
5. opțional, `OPENAI_API_KEY` pentru funcții AI complete.

Comenzi orientative:

```bash
# modul AI
cd module_ai/modul_ai_cv_review
pip install -r requirements.txt
uvicorn main:app --reload

# backend
cd backend/hrdatabase
./gradlew bootRun

# frontend
cd hrsimulator
npm install
npm run dev
```

[Figura 16 - Captură cu aplicația rulând în browser.]
[Figura 17 - Opțional: captură cu cele trei terminale: FastAPI, Spring Boot, Vite.]

## 3.16. Testare și validare

Validarea aplicației poate fi prezentată prin scenarii end-to-end:

| Scenariu | Pași | Rezultat așteptat |
|---|---|---|
| Înregistrare și login | utilizatorul creează cont, se autentifică | primește token și este redirecționat conform rolului |
| Aplicare candidat | candidat selectează post și încarcă CV | aplicația se salvează, CV-ul poate fi consultat |
| Cerere de angajare | manager departament creează cerere | cererea apare pentru manager recrutare |
| Deschidere post | manager recrutare deschide post din cerere | postul devine disponibil |
| Dashboard | recrutorul vede aplicațiile atribuite | poate modifica pipeline-ul |
| Review AI CV | se activează review-ul AI | se salvează scor și recomandare |
| Review video | se activează review engleză | se salvează scor, verdict și tooltip |

În lucrare este recomandat să incluzi capturi pentru fiecare scenariu important, nu doar cod. Capturile demonstrează că fluxurile sunt implementate complet.

---

# 4. Concluzii și planuri de viitor

## 4.1. Concluzii

Proiectul demonstrează construirea unei aplicații web integrate pentru simularea procesului de recrutare. Soluția combină o interfață React, un backend Spring Boot, o bază PostgreSQL și un modul AI FastAPI. Fluxul implementat acoperă posturi, cereri de angajare, aplicații ale candidaților, dashboard, pipeline, scor local CV-job și evaluări AI.

Contribuțiile principale sunt:

- modelarea unui proces complet de recrutare internă;
- implementarea accesului diferențiat pe roluri;
- stocarea și extragerea textului din documente;
- combinarea unui scor local explicabil cu un scor AI semantic;
- izolarea modulului AI într-un serviciu separat;
- documentarea arhitecturii prin diagrame Mermaid.

## 4.2. Limitări

Limitările versiunii actuale sunt:

- aplicația este orientată către rulare locală/dezvoltare;
- nu există încă deployment de producție cu HTTPS și reverse proxy;
- testele automate sunt reduse;
- conformitatea GDPR este tratată parțial, fără politici automate de retenție/ștergere;
- entitatea `Candidat` este minimală și poate fi extinsă;
- analiza AI depinde de disponibilitatea cheii OpenAI și de serviciul extern.

## 4.3. Planuri de viitor

Direcții de extindere:

1. containerizare cu Docker Compose;
2. introducerea testelor automate JUnit și React Testing Library;
3. notificări e-mail pentru schimbări de status;
4. rapoarte statistice pentru recrutare;
5. audit trail pentru operații sensibile;
6. politici GDPR: consimțământ, retenție și ștergere date;
7. integrare calendar pentru interviuri;
8. dashboard analytics pentru timpi de parcurgere a etapelor.

---

# 5. Bibliografie

[1] M. Jones, J. Bradley, N. Sakimura, *JSON Web Token (JWT)*, RFC 7519, IETF, 2015. Disponibil: https://www.rfc-editor.org/rfc/rfc7519

[2] Spring Team, *Spring Boot Reference Documentation*, versiunea curentă. Disponibil: https://docs.spring.io/spring-boot/reference/

[3] Spring Team, *Spring Security Reference Documentation*. Disponibil: https://docs.spring.io/spring-security/reference/

[4] Spring Team, *Spring Data JPA Reference Documentation*. Disponibil: https://docs.spring.io/spring-data/jpa/reference/

[5] React Team, *React Documentation*. Disponibil: https://react.dev/

[6] Vite Team, *Vite Guide*. Disponibil: https://vite.dev/guide/

[7] PostgreSQL Global Development Group, *PostgreSQL Documentation*. Disponibil: https://www.postgresql.org/docs/

[8] Sebastián Ramírez, *FastAPI Documentation*. Disponibil: https://fastapi.tiangolo.com/

[9] OpenAI, *Speech to text - OpenAI API documentation*. Disponibil: https://platform.openai.com/docs/guides/speech-to-text

[10] Apache Software Foundation, *Apache PDFBox*. Disponibil: https://pdfbox.apache.org/

[11] Apache Software Foundation, *Apache POI - Component Overview*. Disponibil: https://poi.apache.org/components/

[12] SAP, *What is an Applicant Tracking System (ATS)?*. Disponibil: https://www.sap.com/uk/products/hcm/recruiting-software/what-is-an-applicant-tracking-system.html

[13] Greenhouse, *Applicant tracking software & hiring platform*. Disponibil: https://www.greenhouse.com/

[14] Workday, *Talent Acquisition and Recruiting Software*. Disponibil: https://www.workday.com/en-us/products/talent-management/talent-acquisition.html

[15] SHRM, *The Role of AI in HR Continues to Expand*. Disponibil: https://www.shrm.org/topics-tools/research/2025-talent-trends/ai-in-hr

[16] SHRM, *Skills-First Hiring To Transform Talent Acquisition*. Disponibil: https://www.shrm.org/topics-tools/tools/toolkits/skills-first-hiring-transform-talent-acquisition

[17] Uniunea Europeană, *Regulation (EU) 2016/679 - General Data Protection Regulation*, EUR-Lex. Disponibil: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679

[18] Proiect software propriu, *licenta_devm*, folderele `hrsimulator`, `backend/hrdatabase`, `module_ai/modul_ai_cv_review`, 2026.

---

# 6. Anexe

## Anexa A - Endpoint-uri API principale

| Metodă | Endpoint | Descriere | Acces |
|---|---|---|---|
| `POST` | `/auth/login` | autentificare | public |
| `POST` | `/auth/register` | înregistrare | public |
| `GET` | `/auth/me` | profil utilizator curent | autentificat |
| `GET` | `/api/posturi/disponibile` | posturi vizibile candidaților | public |
| `POST` | `/api/aplicatii` | aplicare candidat multipart | public |
| `GET` | `/api/aplicatii/dashboard` | dashboard aplicații | autentificat |
| `PATCH` | `/api/aplicatii/{id}/pipeline` | actualizare pipeline | autentificat |
| `PATCH` | `/api/aplicatii/{id}/ai-cv-review` | activare/dezactivare review CV AI | autentificat |
| `PATCH` | `/api/aplicatii/{id}/review-engleza-automat` | analiză engleză din video | autentificat |
| `POST` | `/api/cereri-angajare` | creare cerere angajare | manager departament/admin |
| `POST` | `/api/cereri-angajare/{id}/deschide-post` | deschidere post din cerere | manager recrutare/admin |
| `GET/POST/PUT/DELETE` | `/api/departamente` | administrare departamente | admin |
| `GET/PATCH/DELETE` | `/api/utilizatori` | administrare utilizatori | admin |
| `POST` | `/analyze` | analiză CV-job în modul AI | intern, apelat de backend |
| `POST` | `/analyze-video` | analiză video engleză în modul AI | intern, apelat de backend |

## Anexa B - Diagrame recomandate

Include în lucrare următoarele diagrame deja existente în proiect:

- `diagrame/diagrama-bloc-high-level.md` - pentru o vedere generală ușor de explicat;
- `diagrame/diagrama-arhitectura.md` - pentru arhitectura runtime și fluxurile principale;
- `diagrame/diagrama-componente.md` - pentru împărțirea pe componente software;
- `diagrame/diagrama-clase.md` - pentru modelul de date;
- `diagrame/diagrama-desfasurare.md` - pentru mediul de rulare/deployment.

## Anexa C - Capturi de ecran recomandate

1. Pagina principală cu posturile disponibile.
2. Formular aplicare job cu CV și video.
3. Login și register.
4. Cont în așteptare pentru `GUEST`.
5. AdminPanel pentru utilizatori/departamente.
6. Cerere angajare.
7. Listă cereri pending.
8. Administrare posturi.
9. Dashboard candidați.
10. Pipeline candidat.
11. Rezultat review CV AI.
12. Rezultat review engleză video.
13. Terminale sau Swagger/FastAPI docs pentru modulul AI.

## Anexa D - Listinguri de cod recomandate

1. `SecurityConfig.java` - configurare securitate și rute publice.
2. `JwtService.java` - generare/validare JWT.
3. `AplicatieService.java` - salvare aplicare și orchestrare AI.
4. `CvJobMatchService.java` - scor local CV-job.
5. `AiCvReviewClientService.java` - apel server-to-server către FastAPI.
6. `AiEnglishVideoReviewClientService.java` - upload multipart video către FastAPI.
7. `module_ai/modul_ai_cv_review/main.py` - endpoint-urile FastAPI.
8. `services/ai_service.py` - prompturi, fallback și transcriere.
9. `hrsimulator/src/App.jsx` - rutare pe roluri.
10. `hrsimulator/src/api/client.js` - client HTTP comun.
