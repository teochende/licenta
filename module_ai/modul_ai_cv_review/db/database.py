import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any


DB_PATH = Path("cv_matcher.db")


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback_cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cv_text TEXT NOT NULL,
                job_text TEXT NOT NULL,
                ai_score REAL NOT NULL,
                human_score REAL NOT NULL,
                difference REAL NOT NULL,
                notes TEXT,
                combined_text TEXT NOT NULL,
                embedding TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def insert_feedback(
    cv_text: str,
    job_text: str,
    ai_score: float,
    human_score: float,
    notes: str | None,
    combined_text: str,
    embedding: list[float] | None,
) -> int:
    difference = human_score - ai_score
    serialized_embedding = json.dumps(embedding) if embedding else None

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO feedback_cases (
                cv_text, job_text, ai_score, human_score, difference,
                notes, combined_text, embedding
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cv_text,
                job_text,
                ai_score,
                human_score,
                difference,
                notes,
                combined_text,
                serialized_embedding,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)


def get_all_feedback_cases(limit: int = 500) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, cv_text, job_text, ai_score, human_score, difference,
                   notes, combined_text, embedding, created_at
            FROM feedback_cases
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]
