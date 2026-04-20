from typing import Optional

from pydantic import BaseModel, Field


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
