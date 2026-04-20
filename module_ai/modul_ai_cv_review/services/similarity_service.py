import json
import math
import re
from typing import Any


def combine_case_text(cv_text: str, job_text: str) -> str:
    return f"CV:\n{cv_text}\n\nJOB DESCRIPTION:\n{job_text}"


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z0-9+#.]{2,}", text.lower()))


def keyword_similarity(a: str, b: str) -> float:
    a_tokens = _tokenize(a)
    b_tokens = _tokenize(b)
    if not a_tokens or not b_tokens:
        return 0.0

    overlap = len(a_tokens.intersection(b_tokens))
    union = len(a_tokens.union(b_tokens))
    return overlap / max(union, 1)


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def _parse_embedding(raw_embedding: Any) -> list[float] | None:
    if not raw_embedding:
        return None

    if isinstance(raw_embedding, list):
        return [float(v) for v in raw_embedding]

    if isinstance(raw_embedding, str):
        try:
            decoded = json.loads(raw_embedding)
            if isinstance(decoded, list):
                return [float(v) for v in decoded]
        except json.JSONDecodeError:
            return None
    return None


async def find_similar_cases(
    cv_text: str,
    job_text: str,
    all_cases: list[dict[str, Any]],
    ai_service: Any,
    top_k: int = 3,
) -> list[dict[str, Any]]:
    if not all_cases:
        return []

    current_text = combine_case_text(cv_text, job_text)
    query_embedding = await ai_service.get_embedding(current_text)

    scored_cases: list[dict[str, Any]] = []
    for case in all_cases:
        case_embedding = _parse_embedding(case.get("embedding"))
        case_text = case.get("combined_text") or combine_case_text(
            case.get("cv_text", ""), case.get("job_text", "")
        )

        if query_embedding and case_embedding:
            similarity = _cosine_similarity(query_embedding, case_embedding)
        else:
            similarity = keyword_similarity(current_text, case_text)

        case_copy = dict(case)
        case_copy["similarity"] = similarity
        scored_cases.append(case_copy)

    scored_cases.sort(key=lambda item: item["similarity"], reverse=True)
    return scored_cases[:top_k]
