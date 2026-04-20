import io
import re

import pdfplumber
from docx import Document
from fastapi import HTTPException, UploadFile


def _normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_pdf_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        chunks = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(chunks)


def _extract_docx_text(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    chunks = [paragraph.text for paragraph in doc.paragraphs if paragraph.text]
    return "\n".join(chunks)


def _extract_plain_text(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


async def extract_text_from_upload(upload: UploadFile, label: str) -> str:
    file_bytes = await upload.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail=f"{label} file is empty")

    filename = (upload.filename or "").lower()
    content_type = (upload.content_type or "").lower()

    try:
        if filename.endswith(".pdf") or "pdf" in content_type:
            text = _extract_pdf_text(file_bytes)
        elif filename.endswith(".docx") or "wordprocessingml" in content_type:
            text = _extract_docx_text(file_bytes)
        elif (
            filename.endswith(".txt")
            or "text/plain" in content_type
            or "application/octet-stream" in content_type
        ):
            text = _extract_plain_text(file_bytes)
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported {label} file format. Use PDF, DOCX, or TXT."
                ),
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse {label} file: {exc}",
        ) from exc

    text = _normalize_text(text)
    if not text:
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract text from {label} file",
        )
    return text
