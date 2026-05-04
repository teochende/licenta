# CV Matcher MVP

Simple FastAPI app that compares a CV and a Job Description using AI, then learns from interviewer feedback over time.

## Features

- Paste CV text or upload CV (`PDF` or `DOCX`)
- Paste Job Description text or upload (`PDF`, `DOCX`, `TXT`)
- Extract text from files
- AI analysis with structured JSON output:
  - `score` (0-100)
  - `matching_skills`
  - `missing_skills`
  - `recommendation`
- Human score override and feedback storage in SQLite
- Similar case retrieval (embeddings when available, keyword overlap fallback)
- Prompt memory injection from top similar past cases

## Setup

1. Create and activate a virtual environment
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set OpenAI key:

```bash
set OPENAI_API_KEY=your_key_here
```

Or copy `.env.example` to your own env handling approach.

## Run

```bash
uvicorn main:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Analiză video (engleză vorbită)

- În UI există o secțiune separată: încarcă un videoclip (max. **5 minute**), apoi **„Analizează videoclip”**.
- Backend: `POST /analyze-video` cu câmp multipart `video_file`.
- Flux: validare video → durată (ffmpeg) → extragere audio WAV → **Whisper** (`whisper-1`) → evaluare structurată (chat JSON).
- Necesită **`OPENAI_API_KEY`** (transcriere + evaluare; nu există fallback fără cheie pentru acest flux).
- FFmpeg vine prin pachetul **`imageio-ffmpeg`** (prima rulare poate descărca binarul).

## API Endpoints

- `POST /analyze` (multipart form)
  - `cv_text` (optional, preferred when provided)
  - `cv_file` (optional)
  - `job_file` (optional)
  - `job_text` (optional)
  - At least one CV input (`cv_text` or `cv_file`) and one Job input (`job_text` or `job_file`) are required.
- `POST /feedback` (JSON body)
- `POST /analyze-video` (multipart form)
  - `video_file` (required): fișier video; durată maximă 5 minute.

## Notes

- If `OPENAI_API_KEY` is missing, the app falls back to keyword-based scoring so the MVP still runs.
- SQLite database file is `cv_matcher.db` in the project root.
