# Documentație licență — Simulator HR (Aplicație HR Database)

**Notă pentru autor:** Acest text este redactat formal, gata de integrat în lucrarea de licență. Înlocuiește marcajele `[Figura X]` cu capturile tale reale; inserează diagramele exportate din folderul `diagrame/`. Adaptează antetul (nume, facultate, coordonator, an) conform șablonului instituției. Citările numerice `[n]` corespund Bibliografiei de la final.

---

## CUPRINS (propus)

1. Introducere  
2. Stadiul cunoașterii  
3. Modelarea soluției  
4. Concluzii și planuri de viitor  
5. Bibliografie  
Anexa A — Listă endpoint-uri API principale  
Anexa B — Glosar roluri utilizator  

---

# 1. INTRODUCERE

## 1.1. Contextul și motivația temei

Procesul de recrutare reprezintă una dintre activitățile critice ale resurselor umane într-o organizație modernă. Echipele implicate — manageri de departament, manageri de recrutare, recrutori, intervievatori tehnici și administratori de sistem — trebuie să coordoneze informații despre posturi vacante, cereri interne de angajare, candidați, documente (curriculum vitae, descrieri de job, materiale video) și stadiul fiecărei aplicații în pipeline-ul de selecție. În absența unui instrument software dedicat, datele rămân dispersate (e-mail, fișiere locale, foi de calcul), ceea ce îngreunează trasabilitatea deciziilor, crește timpul de răspuns și favorizează inconsistența evaluărilor.

Platformele de tip *Applicant Tracking System* (ATS) au fost concepute tocmai pentru centralizarea candidaților și a etapelor de selecție într-un flux coerent [12]. Soluțiile comerciale mature (de exemplu Workday Recruiting sau Greenhouse) oferă funcționalități extinse, însă implică costuri, dependență de furnizor și configurări complexe, neadecvate întotdeauna mediului academic sau al unui prototip orientat pe învățare și experimentare [15], [16].

În cadrul prezentei lucrări se propune proiectarea și implementarea unei aplicații web denumite **Simulator HR** (proiect software *HR Database*, repository `licenta_devm`), care modelează un flux realist de recrutare internă: de la cererea de angajare inițiată de managerul de departament, la deschiderea postului de către managerul de recrutare, publicarea poziției către candidați, primirea aplicațiilor și gestionarea acestora într-un tablou de bord central, cu suport opțional pentru analiză automată a potrivirii CV–job și evaluarea competențelor de engleză pe baza unui videoclip încărcat de candidat.

## 1.2. Formularea problemei

Problema abordată poate fi rezumată astfel: **cum se poate realiza un sistem informatic integrat, accesibil prin browser, care să sprijine rolurile implicate în recrutare, să asigure securitatea accesului la date, să persiste informațiile într-o bază de date relațională și să ofere funcții de asistență inteligentă în analiza candidaților, fără a înlocui decizia umană finală?**

Subprobleme identificate:

- modelarea entităților de domeniu (departamente, utilizatori, posturi, cereri, aplicații) și a relațiilor dintre ele;
- expunerea unui API REST securizat, cu autentificare pe token și autorizare diferențiată pe roluri;
- oferirea unei interfețe intuitive pentru candidați (vizualizare posturi, depunere aplicație) și pentru personalul HR (administrare, dashboard, pipeline);
- gestionarea fișierelor (CV, descrieri, video) într-o manieră consistentă pe disc;
- integrarea unui modul extern de analiză AI, invocat de serverul de aplicație, nu direct din browser.

## 1.3. Obiectivele lucrării

**Obiectivul general** este realizarea unei aplicații web complete pentru simularea și sprijinirea procesului de recrutare descris mai sus.

**Obiectivele specifice** sunt:

1. Definirea modelului de date și implementarea persistenței relaționale (PostgreSQL, JPA/Hibernate).
2. Implementarea mecanismului de autentificare și autorizare bazat pe JWT și roluri Spring Security [1], [3].
3. Dezvoltarea interfeței utilizator în React, cu rutare condiționată de rol.
4. Implementarea fluxurilor business: cerere angajare, deschidere post, aplicare candidat, administrare posturi, dashboard aplicații.
5. Integrarea extragerii de text din documente (PDF/DOCX) și calcularea unui scor local de potrivire CV–job.
6. Integrarea modulului FastAPI pentru analiză AI (CV–job și engleză din video) prin apeluri HTTP server-to-server [8], [9].
7. Documentarea arhitecturii (diagrame de arhitectură, componente, clase, desfășurare) și validarea funcțională prin scenarii de utilizare.

## 1.4. Structura lucrării

Capitolul 2 prezintă stadiul cunoașterii în domeniul recrutării electronice și al soluțiilor software similare. Capitolul 3 descrie modelarea și implementarea soluției propuse: tehnologii, arhitectură, principii de funcționare, capturi de ecran, detalii de implementare și etapele de realizare. Capitolul 4 sintetizează concluziile și direcțiile viitoare. Bibliografia reuneste sursele de referință utilizate.

---

# 2. STADIUL CUNOAȘTERII

## 2.1. Evoluția recrutării și a sistemelor informatice de suport

Recrutarea a evoluat de la procese predominant pe hârtie și recomandări informale către platforme digitale de *e-recrutare*, care permit publicarea posturilor, colectarea aplicațiilor online și colaborarea între mai mulți actori organizaționali. Sistemele ATS au devenit componenta centrală a infrastructurii HR în multe companii, oferind un depozit unic pentru candidați, istoricul interacțiunilor și stadiile pipeline-ului [12].

În ultimii ani, tendința include automatizarea parțială a screening-ului (parsare CV, scoruri de potrivire, chatbot-uri), analiza sentimentelor și, tot mai des, utilizarea modelelor de limbaj pentru extragerea de competențe și generarea de recomandări [14]. Aceste capabilități ridică și probleme de etică și conformitate (bias algoritmic, protecția datelor personale), reglementate în Uniunea Europeană de Regulamentul GDPR [17].

## 2.2. Stadiul actual al practicii

În practica curentă, recrutarea implică de obicei:

- **definirea nevoii** (cerere internă, buget, număr de poziții);
- **descrierea postului** și publicarea către candidați;
- **colectarea aplicațiilor** și trierea inițială;
- **evaluări** (HR, tehnice, manageriale);
- **ofertare** sau respingere, cu păstrarea unui istoric.

Rolurile sunt clar separate: managerul de departament formulează nevoia, managerul de recrutare coordonează deschiderea postului și resursele, recrutorii și intervievatorii tehnici evaluează candidații, iar administratorul gestionează conturile și structura organizațională (departamente). Un sistem modern trebuie să reflecte această separare prin **controlul accesului bazat pe roluri** (RBAC) [3].

Datele procesate includ informații personale (nume, e-mail, conținut CV, înregistrări video), ceea ce impune măsuri de securitate la transport (HTTPS în producție), autentificare și limitarea expunerii datelor în funcție de rol [17].

## 2.3. Soluții software similare

Piața oferă numeroase produse; în lucrare sunt considerate reprezentative următoarele, ca referință comparativă (fără a pretinde exhaustivitatea):

| Soluție | Caracteristici relevante | Raportare față de proiectul de față |
|---------|--------------------------|-------------------------------------|
| **Workday Recruiting** [15] | Suite enterprise, workflow complex, integrare HR largă | Scală și costuri ridicate; proiectul academic este focalizat și auto-găzduit |
| **Greenhouse** [16] | ATS modern, pipeline colaborativ, evaluări structurate | SaaS comercial; lipsa controlului asupra codului sursă |
| **SmartRecruiters** | Recrutare multi-canal, analytics | Orientat marketing talent; depășește scopul licenței |
| **Oracle Recruiting (Taleo)** | Răspândit în corporații mari, procese standardizate | Arhitectură grea, orientată enterprise |
| **BambooHR** | HR pentru IMM, modul recrutare simplificat | Mai puțin detaliu pe pipeline tehnic și AI custom |

**Simulator HR** nu concurează direct cu aceste platforme; el **reproduce logic un subset de fluxuri** într-un stack open-source (Java, React, Python), potrivit demonstrării competențelor de analiză, proiectare și implementare. Avantajul lucrării constă în transparența arhitecturii, posibilitatea modificării algoritmilor (scor local, prompt-uri AI) și integrarea învățării din feedback în modulul de analiză CV.

## 2.4. Tehnologii și abordări relevante

Dezvoltarea aplicațiilor web moderne favorizează arhitectura **client–server**, în care interfața (SPA — *Single Page Application*) comunică cu un API REST [5], [2]. Autentificarea **stateless** cu **JSON Web Token** (JWT) este larg adoptată pentru API-uri, tokenul fiind transmis la fiecare cerere în antetul `Authorization` [1].

Pe stratul de date, maparea obiect–relațională prin **JPA/Hibernate** reduce codul boilerplate și aliniază schema la entități [4], [7]. Pentru analiza documentelor, biblioteci precum **Apache PDFBox** și **Apache POI** permit extragerea textului din PDF și DOCX [10], [11].

Serviciile de **inteligență artificială** expuse prin API (de exemplu OpenAI) permit analiza semantică a textelor și transcrierea audio din video (model Whisper), urmată de evaluare structurată [9]. Separarea modulului AI într-un proces distinct (FastAPI) menține granița de responsabilitate și permite înlocuirea furnizorului [8], [19].

---

# 3. MODELAREA SOLUȚIEI

## 3.1. Prezentarea generală a soluției

**Simulator HR** este o aplicație web destinată simulării procesului de recrutare internă. Utilizatorii accesează sistemul prin browser; în mediul de dezvoltare, punctul de intrare este interfața servită de Vite (`http://localhost:5173`), care comunică cu API-ul Spring Boot prin proxy pentru rutele `/api` și `/auth`.

Funcționalitățile principale sunt:

- **pentru candidați / vizitatori:** vizualizarea posturilor disponibile, consultarea descrierii, depunerea aplicației cu CV obligatoriu și videoclip opțional;
- **pentru managerul de departament:** crearea și urmărirea cererilor de angajare, vizualizarea posturilor departamentului;
- **pentru managerul de recrutare:** aprobarea cererilor, deschiderea posturilor, administrarea posturilor și recrutărilor finalizate;
- **pentru recrutori și intervievatori tehnici:** tabloul de bord cu aplicați pe posturile atribuite, actualizarea pipeline-ului, vizibilitate controlată către IT, activarea review-ului AI;
- **pentru administrator:** gestiunea utilizatorilor, departamentelor, catalogelor și operațiilor administrative.

Modulul **modul_ai_cv_review** (FastAPI) oferă analiza potrivirii CV–descriere job și evaluarea englezei din video; este apelat exclusiv de backend-ul Java, conform configurării `ai.cv.review.base-url`.

[Figura 1 — Diagramă vedere de ansamblu a sistemului; sursă: `diagrame/diagrama-arhitectura.md`, secțiunea 1]

## 3.2. Cerințe funcționale și nefuncționale

### 3.2.1. Cerințe funcționale

**Autentificare și conturi**

- Înregistrare utilizator cu rol dorit; cont nou poate primi rol `GUEST` până la validarea de către administrator.
- Autentificare cu e-mail și parolă; primire token JWT; reîmprospătare profil la `/auth/me`.

**Gestiune organizațională (administrator)**

- CRUD departamente; atribuire manager departament.
- CRUD utilizatori; schimbare rol; listări filtrate.

**Cereri și posturi**

- Creare cerere angajare (descriere manuală sau fișier) de către manager departament.
- Listare cereri în așteptare pentru manager recrutare; deschidere post din cerere cu atribuire recrutori/intervievatori.
- Administrare posturi: creare, editare, dezactivare, ordine dashboard, încărcare descriere fișier.
- Validare structură descriere job (secțiuni obligatorii: Job title, Location, Company overview, Responsibilities, Requirements, Nice to have, Education, Experience, What we offer).

**Aplicații candidați**

- Aplicare la post fără autentificare (rute publice API).
- Stocare CV și opțional video; extragere text CV pentru analize.
- Dashboard aplicații: filtrare pe post, pipeline, scoruri, observații.

**Analiză și asistență decizie**

- Scor local potrivire CV–job (`CvJobMatchService`), bazat pe cuvinte cheie din secțiunea `=keywords=` a descrierii.
- Review CV AI opțional: la activare, apel modul FastAPI `/analyze`; salvare scor, observații, concluzii pe entitatea `Aplicatie`.
- Review engleză automat din video: apel `/analyze-video`; persistare scor, verdict, feedback pe câmpurile dedicate.

### 3.2.2. Cerințe nefuncționale

- **Securitate:** sesiuni stateless JWT; parole hash-uite; CORS configurat pentru originile frontend [3].
- **Performanță:** timeout configurabil pentru apeluri AI (ex. 2 minute citire); limită upload 200 MB per cerere multipart.
- **Fiabilitate:** cale stabilă pentru upload (`app.upload.dir`); migrare opțională din directoare vechi.
- **Mentenabilitate:** separare controller–service–repository; DTO-uri pentru API; modul AI izolat.
- **Portabilitate:** rulare locală pe Windows/Linux cu PostgreSQL și Python 3.

## 3.3. Modelul de date

Entitățile JPA principale sunt: `Departament`, `Utilizator` (implementează `UserDetails`), `Post`, `CerereAngajare`, `Aplicatie`, `Candidat` (entitate simplă, nelegată încă în profunzime de fluxul principal), enum-urile `Rol` și `DescriereCerereMod`.

Relații esențiale:

- un utilizator aparține opțional unui departament;
- un post aparține unui departament și poate avea mulți recrutori și intervievatori tehnici (tabele de asociere);
- o cerere de angajare este creată de un utilizator, referă departamentul și poate genera un post deschis;
- o aplicație este legată obligatoriu de un post și conține metadate fișiere, text CV, scoruri, pipeline JSON și câmpuri AI.

[Figura 2 — Diagramă de clase (entități JPA); sursă: `diagrame/diagrama-clase.md`]

Starea pipeline-ului candidatului este persistată ca **JSON** în câmpul `pipelineState` al aplicației, permițând extinderea etapelor în interfață fără migrări frecvente de schemă.

## 3.4. Tehnologii utilizate

### 3.4.1. Backend — Java 21 și Spring Boot 4

Backend-ul (`backend/hrdatabase`) este o aplicație Gradle care folosește Spring Boot 4.0.5 [2]. Componentele principale:

- **Spring Web MVC** — expunere REST;
- **Spring Data JPA** — persistență [4];
- **Spring Security** — filtru JWT, `SecurityFilterChain`, expresii `@PreAuthorize` [3];
- **PostgreSQL** — driver JDBC, dialect Hibernate, `ddl-auto=update` [7];
- **JJWT** — generare și validare token [1];
- **PDFBox / Apache POI** — extragere text documente [10], [11].

### 3.4.2. Frontend — React 19 și Vite 7

Frontend-ul (`hrsimulator`) este o SPA React 19 [5], construită cu Vite 7 [6]. React Router gestionează rutele; contextul `LoginContext` distribuie starea autentificării. Modulele `src/api/*.js` encapsulează apelurile HTTP prin funcția `apiFetch` din `client.js`. În dezvoltare, proxy-ul Vite redirecționează `/api` și `/auth` către portul 8080.

### 3.4.3. Modul AI — Python, FastAPI

Modulul `module_ai/modul_ai_cv_review` expune API REST cu FastAPI [8]. Serviciile `parsing_service`, `ai_service`, `similarity_service` și `video_service` implementează extragerea textului, apelul LLM, reutilizarea feedback-ului din SQLite (`cv_matcher.db`) și analiza video (ffmpeg, Whisper) [9]. Răspunsurile sunt validate cu modele Pydantic (`db/models.py`).

### 3.4.4. Justificarea alegerilor

| Tehnologie | Motivație |
|------------|-----------|
| Spring Boot | Ecosistem matur, securitate integrată, productivitate JPA |
| PostgreSQL | Model relațional clar, suport ACID, potrivit relațiilor many-to-many |
| React | Interfață reactivă, componentizare, ecosistem larg |
| FastAPI | Integrare rapidă Python–OpenAI, validare Pydantic, async |
| JWT | Potrivit API stateless SPA–backend [1] |

## 3.5. Arhitectura soluției

Arhitectura este **multi-strat**, cu separarea prezentării (React), logicii de business și accesului la date (Spring), plus un **serviciu auxiliar** pentru AI:

1. **Strat prezentare** — componente React, rutare, formulare, dashboard.
2. **Strat API** — controllere REST (`AuthController`, `PostController`, `AplicatieController`, etc.).
3. **Strat servicii** — reguli business, autorizare la nivel de serviciu, orchestrare AI.
4. **Strat persistență** — repository-uri JPA, PostgreSQL.
5. **Strat fișiere** — servicii `*FileStorageService` pe disc local.
6. **Strat AI** — FastAPI, invocat prin `AiCvReviewClientService` și `AiEnglishVideoReviewClientService`.

[Figura 3 — Diagramă componente; sursă: `diagrame/diagrama-componente.md`]

[Figura 4 — Diagramă de desfășurare (aplicație ca tot unitar); sursă: `diagrame/diagrama-desfasurare.md`]

Utilizatorul final interacționează cu **o singură aplicație** percepută; procesele Vite, Spring Boot și uvicorn sunt detalii de mediu de rulare, nu puncte de intrare separate pentru candidat.

## 3.6. Principiul de funcționare

### 3.6.1. Autentificare și autorizare

La login, clientul trimite credențialele la `POST /auth/login`. Serverul validează utilizatorul prin `DaoAuthenticationProvider`, generează un JWT cu `JwtService` și îl returnează clientului. Cererile ulterioare includ antetul `Authorization: Bearer <token>`. `JwtAuthenticationFilter` construiește `SecurityContext`-ul înainte de dispatch-ul către controller.

Rutele publice sunt definite explicit în `SecurityConfig`: login, register, listare posturi disponibile, creare aplicație. Toate celelalte cereri `/api/**` necesită autentificare [3].

[Figura 5 — Captură ecran pagină login (`/login`)]
[Figura 6 — Captură ecran înregistrare (`/register`)]

### 3.6.2. Flux cerere angajare → post

Managerul de departament completează formularul de cerere (`/cerere-angajare`), cu validare secțiuni descriere. Cererea este salvată cu status corespunzător. Managerul de recrutare vizualizează cererile în așteptare (`/cereri`), poate edita atribuirile și **deschide post** din cerere — operație care creează entitatea `Post` și leagă cererea de postul deschis.

[Figura 7 — Captură ecran formular cerere angajare]
[Figura 8 — Captură ecran listă cereri pending și deschidere post]

### 3.6.3. Flux aplicare candidat

Candidatul accesează pagina principală (`/`), alege un post disponibil și navighează la aplicare (`/aplicare-job`). Trimite `POST /api/aplicatii` (multipart) cu date personale, CV și opțional video. Serverul salvează fișierele, extrage textul CV, persistă aplicația; dacă este bifat review AI CV, declanșează analiza asincronă imediat după salvare.

[Figura 9 — Captură ecran listă posturi disponibile (pagina Acasă)]
[Figura 10 — Captură ecran formular aplicare job cu upload CV/video]

### 3.6.4. Dashboard recrutare

Utilizatorii autorizați accesează `/dashboard`. Posturile afișate sunt filtrate pe server în funcție de rol și atribuiri (`PostAccessService`). Pentru fiecare aplicație se pot actualiza: stadiul pipeline (PATCH), vizibilitatea pentru intervievatori tehnici, review CV AI, review engleză automat. Scorul local de potrivire este calculat în backend; scorul AI și observațiile provin din modulul FastAPI.

[Figura 11 — Captură ecran dashboard — vedere post și listă aplicații]
[Figura 12 — Captură ecran pipeline / observații candidat]
[Figura 13 — Captură ecran panou review CV AI (scor, recomandare)]

### 3.6.5. Flux analiză AI CV

Când `aiCvReview` este activ, `AplicatieService` obține textul CV și descrierea job (din câmp text sau extragere din fișierul postului), apelează `AiCvReviewClientService.analyze`, care trimite un formular `application/x-www-form-urlencoded` la `POST /analyze` pe modulul Python. Răspunsul (scor 0–100, competențe, recomandare) este mapat pe entitate și returnat în DTO-ul de dashboard.

Dacă modulul AI este oprit sau `ai.cv.review.enabled=false`, aplicația continuă să funcționeze; câmpurile AI rămân necompletate sau se afișează mesaj de indisponibilitate.

[Figura 14 — Diagramă secvență analiză CV; sursă: `diagrame/diagrama-arhitectura.md`, secțiunea 5]

### 3.6.6. Flux analiză engleză din video

La activarea review-ului automat, backend-ul citește fișierul video de pe disc și îl trimite multipart la `POST /analyze-video`. Modulul extrage audio, transcrie cu Whisper, evaluează cu LLM și returnează scor, nivel CEFR estimat, verdict și feedback. Valorile sunt salvate în câmpurile `englezaAi*` ale aplicației.

[Figura 15 — Captură ecran rezultat review engleză (tooltip / verdict)]

### 3.6.7. Administrare

Administratorul accesează `/admin` pentru gestiunea utilizatorilor și departamentelor. Conturile `GUEST` sunt redirecționate către `/cont-in-asteptare` până la acordarea unui rol operațional.

[Figura 16 — Captură ecran panou administrare]
[Figura 17 — Captură ecran cont în așteptare (rol GUEST)]

## 3.7. Detalii de implementare

### 3.7.1. Securitate

Configurația CORS permite originile frontend (`localhost:5173`, `localhost:3000`) cu `allowCredentials=true`. CSRF este dezactivat, practică uzuală pentru API-uri JWT pure [3]. Rolurile din enum `Rol` sunt mapate la autorități `ROLE_*` pentru Spring Security.

### 3.7.2. Gestiune fișiere

Fișierele sunt stocate sub `app.upload.dir` (implicit `~/.licenta_devm/uploads`), cu subdirectoare pentru cereri, posturi și aplicații. Serviciile dedicate (`AplicatieCvFileStorageService`, `PostDescriereFileStorageService`, `CerereDescriereFileStorageService`) izolează logica de cale relativă și rezolvare la citire.

### 3.7.3. Scor local vs. scor AI

`CvJobMatchService` implementează un algoritm **lightweight**, fără ML: extrage tokeni din liniile `=keywords=` ale descrierii job și îi compară cu textul CV, eliminând stopwords [proiect propriu]. Scorul AI folosește modele de limbaj și poate încorpora cazuri similare din feedback-ul stocat în SQLite (modul Python).

Această dualitate permite funcționarea dashboard-ului chiar și fără cheie OpenAI, menținând totuși o analiză semantică superioară când modulul AI este disponibil.

### 3.7.4. Integrare modul AI

Proprietățile `ai.cv.review.*` din `application.properties` controlează URL-ul de bază, timeout-urile și activarea. Bean-urile `RestClient` / `RestTemplate` sunt configurate în `AiCvReviewConfig`. Apelurile nu expun cheia API către browser — aceasta rămâne în mediul Python (`OPENAI_API_KEY`).

### 3.7.5. Exemple de cod reprezentative

**Listare 1** — Configurare securitate (rute publice vs. autentificate), `SecurityConfig.java`:

```java
.authorizeHttpRequests(a -> a
    .requestMatchers(HttpMethod.POST, "/api/aplicatii", "/api/aplicatii/json").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/posturi/disponibile", "/api/posturi/disponibile/meta").permitAll()
    .requestMatchers("/auth/login", "/auth/register").permitAll()
    .anyRequest().authenticated())
```

**Listare 2** — Apel modul AI pentru analiză CV, `AiCvReviewClientService.java` (fragment):

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

**Listare 3** — Endpoint FastAPI analiză, `main.py` (fragment conceptual):

```python
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_cv_and_job(cv_text: str | None = Form(default=None), ...):
    # extragere text, apel AIService, returnare scor și recomandare
```

(Listările complete se pot prelua din repository; în document se recomandă formatare cu numere de linie și font monospaced.)

## 3.8. Mediu de rulare și instalare

Pentru rularea completă a aplicației în dezvoltare:

1. Pornire server **PostgreSQL**, creare bază de date `HR`.
2. Pornire modul AI: director `module_ai/modul_ai_cv_review`, mediu virtual Python, `pip install -r requirements.txt`, setare `OPENAI_API_KEY`, `uvicorn main:app --reload` (port 8000).
3. Pornire backend: `backend/hrdatabase`, `./gradlew bootRun` (port 8080).
4. Pornire frontend: `hrsimulator`, `npm install`, `npm run dev` (port 5173).
5. Acces browser la `http://localhost:5173`.

[Figura 18 — Captură ecran mediu de rulare: aplicație funcțională în browser (opțional: terminale pornite)]

Dependențele externe ale aplicației unitare sunt: PostgreSQL, spațiul pe disc pentru upload și API-ul OpenAI (pentru funcții AI complete).

## 3.9. Etapele de realizare a proiectului

Dezvoltarea s-a desfășurat incremental, conform următoarelor faze principale:

| Etapă | Descriere | Rezultat |
|-------|-----------|----------|
| 1 | Analiza cerințelor, identificarea actorilor și a fluxurilor HR | Specificație informală, diagrame inițiale |
| 2 | Model entități JPA, configurare PostgreSQL, repository-uri | Persistență funcțională |
| 3 | Autentificare JWT, roluri, CORS, rute publice | Securitate operațională |
| 4 | API posturi, cereri, utilizatori, departamente | Nucleu business |
| 5 | Frontend React: routing, LoginContext, pagini principale | Interfață utilizator |
| 6 | Upload fișiere, extragere text PDF/DOCX | Documente integrate |
| 7 | Dashboard, pipeline JSON, filtrare pe rol | Flux recrutare complet |
| 8 | Modul FastAPI, integrare `AiCvReviewClientService` | Analiză CV AI |
| 9 | Analiză video engleză, PATCH dashboard | Funcție AI extinsă |
| 10 | Testare manuală, diagrame finale, documentație | Versiune pentru licență |

Printre dificultățile întâmpinate s-au numărat: alinierea CORS cu credențiale, stabilizarea căii de upload la repornirea serverului din directoare diferite, gestionarea timeout-urilor la apeluri AI și validarea consistentă a secțiunilor din descrierea job în frontend și backend. Soluțiile au constat în configurare explicită (`cors.allowed-origins`, `app.upload.dir`), mesaje de eroare clare în UI și dezactivarea grațioasă a AI la indisponibilitate.

## 3.10. Testare și validare

Testarea a fost predominant **manuală**, pe scenarii end-to-end: aplicare candidat, aprobare cerere, deschidere post, parcurgere dashboard, activare review AI, verificare roluri (acces refuzat pentru rute neautorizate). Testele automate JUnit existente la nivel de proiect pot fi extinse în planurile viitoare.

---

# 4. CONCLUZII ȘI PLANURI DE VIITOR

## 4.1. Concluzii

Lucrarea a demonstrat fezabilitatea construirii unei aplicații web integrate pentru simularea procesului de recrutare, folosind un stack modern (Spring Boot, React, FastAPI, PostgreSQL). Obiectivele formulate în introducere au fost atinse: model de date coerent, API securizat, interfață diferențiată pe roluri, gestiune documente și integrare AI opțională.

**Contribuțiile principale** ale soluției propuse sunt:

- formalizarea unui flux complet cerere → post → aplicație → pipeline;
- separarea clară între scorul local de potrivire și analiza AI semantică;
- arhitectură în care modulul de inteligență artificială este un serviciu auxiliar, înlocuibil și invocat securizat de backend;
- set de diagrame și documentație aliniate codului sursă.

**Limitări:** aplicația este orientată spre mediul de dezvoltare/local; nu include încă deploy de producție cu HTTPS și clustering; conformitatea GDPR este discutată conceptual, fără implementarea tuturor procedurilor (consimțământ explicit, ștergere automată); testarea automatizată este redusă; entitatea `Candidat` nu este încă pe deplin exploatată în fluxul principal.

## 4.2. Planuri de viitor

Direcții posibile de extindere:

1. **Containerizare și deploy** (Docker Compose sau Kubernetes) cu un singur punct de acces public.
2. **Teste automate** — JUnit pentru servicii, teste integrare API, React Testing Library pentru componente critice.
3. **Notificări** — e-mail la aplicare nouă sau schimbare pipeline.
4. **Rapoarte** — export statistici pe post, timp mediu în etapă, rate de conversie.
5. **Îmbunătățire AI** — fine-tuning pe feedback, explicabilitate scor, detectare bias.
6. **Conformitate** — politici de retenție date, dreptul la ștergere, jurnal audit.
7. **Integrări** — calendar interviuri, import joburi din alte sisteme.

---

# 5. BIBLIOGRAFIE

[1] M. Jones, J. Bradley, N. Sakimura, *JSON Web Token (JWT)*, RFC 7519, IETF, 2015. Disponibil: https://datatracker.ietf.org/doc/html/rfc7519  

[2] Spring Team, *Spring Boot Reference Documentation*, vers. 4.x, 2025–2026. Disponibil: https://docs.spring.io/spring-boot/  

[3] Spring Team, *Spring Security Reference Documentation*, 2025–2026. Disponibil: https://docs.spring.io/spring-security/reference/  

[4] Spring Team, *Spring Data JPA Reference Documentation*, 2025–2026. Disponibil: https://docs.spring.io/spring-data/jpa/reference/  

[5] React Team, *React Documentation*, 2025–2026. Disponibil: https://react.dev/  

[6] Vite Team, *Vite Guide*, 2025–2026. Disponibil: https://vite.dev/guide/  

[7] PostgreSQL Global Development Group, *PostgreSQL 16 Documentation*, 2024–2025. Disponibil: https://www.postgresql.org/docs/  

[8] S. Ramírez, *FastAPI Documentation*, 2024–2026. Disponibil: https://fastapi.tiangolo.com/  

[9] OpenAI, *OpenAI API Reference* (Whisper, Chat Completions), 2025–2026. Disponibil: https://platform.openai.com/docs/  

[10] Apache Software Foundation, *Apache PDFBox – Documentation*, 2024. Disponibil: https://pdfbox.apache.org/  

[11] Apache Software Foundation, *Apache POI – the Java API for Microsoft Documents*, 2024. Disponibil: https://poi.apache.org/  

[12] SAP, *What is an Applicant Tracking System (ATS)?*, resursă online, accesat 2026. Disponibil: https://www.sap.com/products/hcm/recruiting-software/what-is-an-applicant-tracking-system.html  

[13] Society for Human Resource Management (SHRM), *Using AI in Recruiting*, articol online, accesat 2026. Disponibil: https://www.shrm.org/topics-tools/tools/toolkits/using-ai-in-recruiting  

[14] LinkedIn Talent Solutions, *Global Talent Trends*, raport, ediții recente, accesat 2026. Disponibil: https://business.linkedin.com/talent-solutions/resources  

[15] Workday, Inc., *Workday Recruiting*, documentație produs, accesat 2026. Disponibil: https://www.workday.com/en-us/products/talent-management/recruiting.html  

[16] Greenhouse Software, Inc., *Greenhouse Recruiting*, prezentare produs, accesat 2026. Disponibil: https://www.greenhouse.com/  

[17] Uniunea Europeană, *Regulamentul (UE) 2016/679 privind protecția datelor (GDPR)*, Jurnalul Oficial al Uniunii Europene, 2016. Disponibil: https://gdpr-info.eu/  

[18] M. Fowler, *Patterns of Enterprise Application Architecture*, Addison-Wesley, 2002.  

[19] S. Newman, *Building Microservices*, 2nd ed., O’Reilly Media, 2021.  

[20] Proiect software propriu: *licenta_devm* — pachete `hrsimulator`, `backend/hrdatabase`, `module_ai/modul_ai_cv_review`, 2025–2026.

---

# ANEXA A — Endpoint-uri API principale

| Metodă | Cale | Descriere | Autentificare |
|--------|------|-----------|---------------|
| POST | `/auth/login` | Autentificare | Nu |
| POST | `/auth/register` | Înregistrare | Nu |
| GET | `/auth/me` | Profil curent | Da |
| GET | `/api/posturi/disponibile` | Posturi pentru candidați | Nu |
| POST | `/api/aplicatii` | Creare aplicație | Nu |
| GET | `/api/aplicatii/dashboard` | Listă dashboard | Da |
| PATCH | `/api/aplicatii/{id}/pipeline` | Actualizare pipeline | Da |
| PATCH | `/api/aplicatii/{id}/ai-cv-review` | Activare review CV AI | Da |
| PATCH | `/api/aplicatii/{id}/review-engleza-automat` | Review engleză video | Da |
| GET/POST/PUT/DELETE | `/api/posturi`, `/api/cereri-angajare`, `/api/departamente`, `/api/utilizatori` | Gestiune resurse | Da (pe rol) |
| POST | `/analyze`, `/analyze-video` | Modul AI (apel intern de la Java) | N/A (serviciu local) |

---

# ANEXA B — Glosar roluri

| Rol | Denumire în UI (aprox.) | Responsabilitate principală |
|-----|-------------------------|------------------------------|
| `ADMIN` | Administrator | Gestiune utilizatori, departamente, configurări |
| `MANAGER_RECRUTARE` | Manager recrutare | Cereri, posturi, recrutări finalizate |
| `MANAGER_DEPARTAMENT` | Manager departament | Cereri angajare, posturi departament |
| `RECRUTOR` | Recrutor | Dashboard pe posturi atribuite |
| `INTERVIEVATOR_TEHNIC` | Intervievator tehnic | Evaluare tehnică, vizibilitate aplicații |
| `GUEST` | Cont în așteptare | Fără acces operațional până la aprobare |

---

*Sfârșitul documentului. Total estimat în format Word (Times New Roman 12, 1.5): aproximativ 25–35 pagini după inserarea figurilor și a listărilor de cod extinse.*
