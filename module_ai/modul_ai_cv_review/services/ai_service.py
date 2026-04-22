import json
import logging
import os
import re
from typing import Any

from openai import AsyncOpenAI

from services.similarity_service import keyword_similarity

logger = logging.getLogger(__name__)


def _normalize_api_key(raw: str | None) -> str | None:
    """Elimină spații / ghilimele accidentale din .env sau din variabila de mediu."""
    if raw is None:
        return None
    s = raw.strip()
    if len(s) >= 2 and ((s[0] == s[-1] == '"') or (s[0] == s[-1] == "'")):
        s = s[1:-1].strip()
    return s or None


def _parse_json_object_from_llm(content: str) -> dict[str, Any]:
    """Parse strict JSON; accepte uneori ```json ... ``` din model."""
    raw = (content or "").strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.IGNORECASE)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass
    raise json.JSONDecodeError("Nu s-a putut parsa JSON din răspunsul modelului", raw, 0)


class AIService:
    def __init__(self) -> None:
        self.api_key = _normalize_api_key(os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.embedding_model = os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        )
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    def _ensure_client(self) -> bool:
        # Allow key to be loaded after process start (common in local dev).
        if self.client:
            return True

        runtime_key = _normalize_api_key(os.getenv("OPENAI_API_KEY"))
        if not runtime_key:
            return False

        self.api_key = runtime_key
        self.model = os.getenv("OPENAI_MODEL", self.model)
        self.embedding_model = os.getenv(
            "OPENAI_EMBEDDING_MODEL", self.embedding_model
        )
        self.client = AsyncOpenAI(api_key=self.api_key)
        return True

    async def get_embedding(self, text: str) -> list[float] | None:
        if not self._ensure_client():
            return None

        try:
            result = await self.client.embeddings.create(
                model=self.embedding_model,
                input=text[:12000],  # Keep payload bounded for MVP cost/perf.
            )
            return result.data[0].embedding
        except Exception:
            return None

    def _build_feedback_examples(self, similar_cases: list[dict[str, Any]]) -> str:
        if not similar_cases:
            return "No past feedback examples available."

        lines = []
        for idx, case in enumerate(similar_cases[:3], start=1):
            lines.append(
                (
                    f"Past case {idx}:\n"
                    f"- AI score: {case.get('ai_score')}\n"
                    f"- Human score: {case.get('human_score')}\n"
                    f"- Difference: {case.get('difference')}\n"
                    f"- Similarity: {round(float(case.get('similarity', 0.0)), 3)}\n"
                    f"- Notes: {case.get('notes') or 'N/A'}\n"
                )
            )
        return "\n".join(lines)

    def _fallback_analysis(
        self,
        cv_text: str,
        job_text: str,
        reason: str = "missing_api_key",
        error_detail: str | None = None,
    ) -> dict[str, Any]:
        similarity = keyword_similarity(cv_text, job_text)
        score = max(0, min(100, int(round(similarity * 100))))

        cv_words = {w.lower() for w in cv_text.split() if len(w) > 2}
        job_words = {w.lower() for w in job_text.split() if len(w) > 2}

        matching = sorted(list(cv_words.intersection(job_words)))[:12]
        missing = sorted(list(job_words - cv_words))[:12]

        if reason == "api_error":
            recommendation = (
                "Analiza LLM (OpenAI) nu a reușit; mai jos este scorul fallback (similaritate pe cuvinte). "
                "Verifică în .env: OPENAI_API_KEY corect, credit/billing OpenAI, OPENAI_MODEL (ex. gpt-4o-mini), "
                "rețea/firewall."
            )
            if error_detail:
                recommendation += f"\nDetaliu tehnic: {error_detail}"
        elif reason == "json_error":
            recommendation = (
                "Răspunsul modelului nu a fost JSON valid; s-a folosit scorul fallback pe cuvinte."
            )
            if error_detail:
                recommendation += f"\nDetaliu: {error_detail}"
        else:
            recommendation = (
                "Lipsește OPENAI_API_KEY; s-a folosit analiza fallback pe cuvinte. "
                "Adaugă cheia în .env pentru rezultate LLM."
            )

        return {
            "score": score,
            "matching_skills": matching,
            "missing_skills": missing,
            "recommendation": recommendation,
        }

    async def analyze_match(
        self,
        cv_text: str,
        job_text: str,
        similar_cases: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if not self._ensure_client():
            return self._fallback_analysis(cv_text, job_text, reason="missing_api_key")

        feedback_examples = self._build_feedback_examples(similar_cases)

        system_prompt = (
            "You are an expert technical recruiter.\n"
            "Analyze a candidate CV against a job description.\n"
            "Use past human feedback examples to calibrate score when relevant.\n"
            "Return strict JSON only with keys:\n"
            "score (integer 0-100), matching_skills (string array), "
            "missing_skills (string array), recommendation (string).\n"
            "Do not include markdown."
        )

        user_prompt = (
            f"Past feedback examples:\n{feedback_examples}\n\n"
            f"CV:\n{cv_text}\n\n"
            f"Job Description:\n{job_text}\n"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.choices[0].message.content or "{}"
            try:
                parsed = _parse_json_object_from_llm(content)
            except json.JSONDecodeError as je:
                logger.warning("JSON invalid de la model: %s", je, exc_info=True)
                return self._fallback_analysis(
                    cv_text,
                    job_text,
                    reason="json_error",
                    error_detail=str(je)[:400],
                )
        except Exception as e:
            detail = f"{type(e).__name__}: {e!s}"[:500]
            logger.warning("Eșec OpenAI chat.completions în analyze_match: %s", detail, exc_info=True)
            return self._fallback_analysis(
                cv_text, job_text, reason="api_error", error_detail=detail
            )

        score = int(parsed.get("score", 0))
        parsed["score"] = max(0, min(100, score))
        parsed["matching_skills"] = [
            str(item) for item in parsed.get("matching_skills", [])
        ]
        parsed["missing_skills"] = [
            str(item) for item in parsed.get("missing_skills", [])
        ]
        parsed["recommendation"] = str(parsed.get("recommendation", "")).strip()

        return parsed
