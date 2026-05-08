"""Validare videoclip, probă durată și extragere audio (ffmpeg via imageio-ffmpeg)."""

from __future__ import annotations

import logging
import os
import re
import subprocess
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

MAX_VIDEO_DURATION_SECONDS = 5 * 60

ALLOWED_VIDEO_EXTENSIONS = frozenset(
    {".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v", ".mpeg", ".mpg"}
)

def _ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg as iio_ffmpeg

        return iio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:  # pragma: no cover - env specific
        raise HTTPException(
            status_code=503,
            detail=(
                "FFmpeg nu este disponibil (lipsește pachetul imageio-ffmpeg sau binarul). "
                "Reinstalează dependențele: pip install -r requirements.txt"
            ),
        ) from exc


def _extension_ok(filename: str) -> bool:
    lower = (filename or "").lower()
    return any(lower.endswith(ext) for ext in ALLOWED_VIDEO_EXTENSIONS)


def validate_video_upload(upload: UploadFile) -> None:
    """Respinge fișierele care nu par videoclipuri."""
    filename = upload.filename or ""
    content_type = (upload.content_type or "").lower().strip()
    mime_video = content_type.startswith("video/")

    if _extension_ok(filename) or mime_video:
        return

    raise HTTPException(
        status_code=400,
        detail=(
            "Fișier neacceptat: încarcă doar un videoclip "
            f"(extensii acceptate: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))} "
            "sau tip MIME video/*)."
        ),
    )


def probe_video_duration_seconds(video_path: Path) -> float:
    """Citește durata din ieșirea ffmpeg -i (secunde, float)."""
    exe = _ffmpeg_exe()
    try:
        proc = subprocess.run(
            [exe, "-hide_banner", "-i", str(video_path)],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=400,
            detail="Nu s-a putut citi metadatele videoclipului (timeout). Încearcă un alt fișier.",
        ) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Executabilul FFmpeg nu a fost găsit pe sistem.",
        ) from exc

    stderr = (proc.stderr or "") + (proc.stdout or "")
    match = re.search(
        r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)",
        stderr,
        re.IGNORECASE,
    )
    if not match:
        logger.warning("ffmpeg fără Duration în output: %s", stderr[:500])
        raise HTTPException(
            status_code=400,
            detail="Nu s-a putut determina durata videoclipului. Verifică că fișierul este un video valid.",
        )

    h, m, s = int(match.group(1)), int(match.group(2)), float(match.group(3))
    return h * 3600 + m * 60 + s


def assert_duration_within_limit(seconds: float) -> None:
    if seconds > MAX_VIDEO_DURATION_SECONDS + 0.5:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Videoclipul depășește limita de {MAX_VIDEO_DURATION_SECONDS // 60} minute "
                f"(durată detectată: {int(seconds // 60)}m {int(seconds % 60)}s). "
                "Încarcă un clip mai scurt."
            ),
        )


def extract_audio_wav(
    video_path: Path,
    out_wav: Path,
    *,
    max_seconds: float = MAX_VIDEO_DURATION_SECONDS,
) -> None:
    """Extrage mono 16 kHz PCM WAV, trunchiat la max_seconds."""
    exe = _ffmpeg_exe()
    cmd = [
        exe,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(video_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-t",
        str(int(max_seconds)),
        str(out_wav),
    ]
    try:
        subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        err = (exc.stderr or exc.stdout or str(exc))[:800]
        logger.warning("ffmpeg extract audio failed: %s", err)
        raise HTTPException(
            status_code=400,
            detail=(
                "Nu s-a putut extrage audio din videoclip. "
                "Verifică că fișierul conține un flux audio sau încearcă alt format (ex. MP4)."
            ),
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail="Extragerea audio a durat prea mult. Încearcă un fișier mai mic sau mai scurt.",
        ) from exc

    if not out_wav.is_file() or out_wav.stat().st_size < 100:
        raise HTTPException(
            status_code=400,
            detail="Audio extras este gol sau prea scurt. Videoclipul poate să nu conțină voce.",
        )


async def save_upload_to_temp_video(upload: UploadFile) -> Path:
    """Salvează upload-ul într-un fișier temporar cu sufix din extensie."""
    suffix = Path(upload.filename or "video.bin").suffix.lower()
    if suffix not in ALLOWED_VIDEO_EXTENSIONS:
        ct = (upload.content_type or "").lower()
        if "webm" in ct:
            suffix = ".webm"
        elif "quicktime" in ct or ct.endswith("mov"):
            suffix = ".mov"
        else:
            suffix = ".mp4"
    fd, path_str = tempfile.mkstemp(suffix=suffix, prefix="cv_review_video_")
    path = Path(path_str)
    try:
        os.close(fd)
    except OSError:
        path.unlink(missing_ok=True)
        raise

    data = await upload.read()
    if not data:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Fișierul video este gol.")

    path.write_bytes(data)
    return path
