import logging
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from db.database import get_all_feedback_cases, init_db, insert_feedback
from db.models import (
    AnalyzeResponse,
    FeedbackRequest,
    FeedbackResponse,
    VideoEnglishAnalysisResponse,
)
from services.ai_service import AIService
from services.parsing_service import extract_text_from_upload
from services.similarity_service import combine_case_text, find_similar_cases
from services.video_service import (
    assert_duration_within_limit,
    extract_audio_wav,
    probe_video_duration_seconds,
    save_upload_to_temp_video,
    validate_video_upload,
)


load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="CV Matcher MVP", version="0.1.0")
ai_service = AIService()
init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()


@app.get("/")
async def root() -> FileResponse:
    page = Path("static/index.html")
    if not page.exists():
        raise HTTPException(status_code=404, detail="UI file missing")
    return FileResponse(page)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_cv_and_job(
    cv_file: UploadFile | None = File(default=None),
    cv_text: str | None = Form(default=None),
    job_file: UploadFile | None = File(default=None),
    job_text: str | None = Form(default=None),
) -> AnalyzeResponse:
    if cv_text and cv_text.strip():
        parsed_cv_text = cv_text.strip()
    elif cv_file is not None:
        parsed_cv_text = await extract_text_from_upload(cv_file, label="CV")
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either a CV file or cv_text.",
        )

    if job_file is not None:
        parsed_job_text = await extract_text_from_upload(job_file, label="job")
    elif job_text and job_text.strip():
        parsed_job_text = job_text.strip()
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either a job description file or job_text.",
        )

    feedback_cases = get_all_feedback_cases(limit=500)
    similar_cases = await find_similar_cases(
        cv_text=parsed_cv_text,
        job_text=parsed_job_text,
        all_cases=feedback_cases,
        ai_service=ai_service,
        top_k=3,
    )

    analysis = await ai_service.analyze_match(
        cv_text=parsed_cv_text,
        job_text=parsed_job_text,
        similar_cases=similar_cases,
    )

    return AnalyzeResponse(
        score=analysis["score"],
        matching_skills=analysis["matching_skills"],
        missing_skills=analysis["missing_skills"],
        recommendation=analysis["recommendation"],
        cv_text=parsed_cv_text,
        job_text=parsed_job_text,
    )


@app.post("/feedback", response_model=FeedbackResponse)
async def save_feedback(payload: FeedbackRequest) -> FeedbackResponse:
    combined_text = combine_case_text(payload.cv_text, payload.job_text)
    embedding = await ai_service.get_embedding(combined_text)

    feedback_id = insert_feedback(
        cv_text=payload.cv_text,
        job_text=payload.job_text,
        ai_score=float(payload.ai_score),
        human_score=float(payload.human_score),
        notes=payload.notes,
        combined_text=combined_text,
        embedding=embedding,
    )

    return FeedbackResponse(
        message="Feedback saved successfully",
        feedback_id=feedback_id,
        difference=float(payload.human_score - payload.ai_score),
    )


@app.post("/analyze-video", response_model=VideoEnglishAnalysisResponse)
async def analyze_video_english(
    video_file: UploadFile = File(..., description="Videoclip scurt cu vorbire în engleză"),
) -> VideoEnglishAnalysisResponse:
    """
    Extrage audio, transcrie (Whisper) și evaluează competențele lingvistice în engleză.
    Durata maximă: 5 minute.
    """
    validate_video_upload(video_file)
    if not ai_service._ensure_client():
        raise HTTPException(
            status_code=400,
            detail=(
                "Pentru analiza video este necesar OPENAI_API_KEY "
                "(transcriere Whisper și evaluare AI)."
            ),
        )

    video_path: Path | None = None
    wav_path: Path | None = None
    try:
        video_path = await save_upload_to_temp_video(video_file)
        duration_sec = probe_video_duration_seconds(video_path)
        assert_duration_within_limit(duration_sec)

        wav_fd, wav_str = tempfile.mkstemp(suffix=".wav", prefix="cv_review_audio_")
        os.close(wav_fd)
        wav_path = Path(wav_str)
        extract_audio_wav(video_path, wav_path)

        try:
            transcript = await ai_service.transcribe_audio_wav(str(wav_path))
        except Exception as exc:
            logger.warning("Transcriere Whisper eșuată: %s", exc, exc_info=True)
            raise HTTPException(
                status_code=502,
                detail=(
                    "Transcrierea videoclipului a eșuat. Verifică formatul audio, "
                    "dimensiunea fișierului și disponibilitatea API OpenAI."
                ),
            ) from exc

        if not transcript.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Nu s-a detectat vorbire în engleză în videoclip "
                    "(transcript gol). Verifică microfonul, volumul și limba folosită."
                ),
            )

        analysis = await ai_service.analyze_spoken_english_from_transcript(transcript)
        return VideoEnglishAnalysisResponse(**analysis)
    finally:
        if video_path is not None:
            video_path.unlink(missing_ok=True)
        if wav_path is not None:
            wav_path.unlink(missing_ok=True)
