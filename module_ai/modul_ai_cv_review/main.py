from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from db.database import get_all_feedback_cases, init_db, insert_feedback
from db.models import AnalyzeResponse, FeedbackRequest, FeedbackResponse
from services.ai_service import AIService
from services.parsing_service import extract_text_from_upload
from services.similarity_service import combine_case_text, find_similar_cases


load_dotenv()

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
