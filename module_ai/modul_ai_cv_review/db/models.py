from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AnalyzeResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    matching_skills: list[str]
    missing_skills: list[str]
    recommendation: str
    cv_text: str
    job_text: str


class FeedbackRequest(BaseModel):
    cv_text: str
    job_text: str
    ai_score: float = Field(ge=0, le=100)
    human_score: float = Field(ge=0, le=100)
    notes: Optional[str] = None


class FeedbackResponse(BaseModel):
    message: str
    feedback_id: int
    difference: float


_CEFR_ALLOWED = frozenset({"A1", "A2", "B1", "B2", "C1", "C2"})


class VideoEnglishAnalysisResponse(BaseModel):
    """Răspuns analiză competențe lingvistice engleză din videoclip (transcriere + LLM)."""

    english_score: int = Field(ge=0, le=100)
    cefr_level: str
    pronunciation_feedback: str
    fluency_feedback: str
    grammar_feedback: str
    vocabulary_feedback: str
    clarity_feedback: str
    strengths: list[str]
    improvements: list[str]
    recommendations: list[str]
    performance_status: str = Field(
        default="Average",
        description="Good, Average sau Poor — nivel general de performanță.",
    )
    hiring_verdict: str = Field(
        default="PARTIAL",
        description="YES, PARTIAL sau NO — dacă e potrivit pentru comunicare eficientă în engleză la job.",
    )
    tooltip_summary: str = Field(
        default="",
        description="Text scurt (max ~500 caractere), linii separate prin \\n, pentru tooltip în UI.",
    )

    @field_validator("performance_status")
    @classmethod
    def normalize_performance(cls, v: str) -> str:
        u = (v or "").strip().lower()
        if u in ("good", "average", "poor"):
            return u[:1].upper() + u[1:]
        return "Average"

    @field_validator("hiring_verdict")
    @classmethod
    def normalize_verdict(cls, v: str) -> str:
        u = (v or "").strip().upper()
        if u in ("YES", "PARTIAL", "NO"):
            return u
        return "PARTIAL"

    @field_validator("tooltip_summary")
    @classmethod
    def trim_tooltip(cls, v: str) -> str:
        s = (v or "").strip()
        return s[:800]

    @field_validator("cefr_level")
    @classmethod
    def normalize_cefr(cls, v: str) -> str:
        u = (v or "").strip().upper()
        if u in _CEFR_ALLOWED:
            return u
        return "B1"

    @field_validator(
        "strengths",
        "improvements",
        "recommendations",
        mode="before",
    )
    @classmethod
    def coerce_str_lists(cls, v: object) -> list[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
        return []
