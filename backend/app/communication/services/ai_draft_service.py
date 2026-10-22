"""Backend Gemini AI Drafting Assistant for Announcements & Messages."""

import re
import logging
from typing import Dict, Any, List
from fastapi import HTTPException, status
from app.core.config import settings
from app.communication.schemas import (
    AIDraftRequest,
    AIDraftResponse,
    AISummarizeRequest,
    AISummarizeResponse,
    AIToneImproveRequest,
    AIToneImproveResponse,
)

logger = logging.getLogger("smartedu.communication.ai")


def sanitize_input(text: str) -> str:
    """Strip out potential API keys, passwords, JWT tokens, and private credentials before sending to Gemini."""
    # Redact JWT tokens
    text = re.sub(r'eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+', '[REDACTED_TOKEN]', text)
    # Redact passwords/keys
    text = re.sub(r'(?i)(password|secret|api_key|token)\s*[:=]\s*\S+', r'\1: [REDACTED]', text)
    return text.strip()


class AIDraftService:
    """Provides backend-isolated AI assistance for drafting announcements with safety disclaimers."""

    @staticmethod
    def generate_announcement_draft(payload: AIDraftRequest) -> AIDraftResponse:
        """Draft a formal announcement text. Returns an editable draft."""
        topic = sanitize_input(payload.topic_or_purpose)
        audience = sanitize_input(payload.audience)
        points = ", ".join([sanitize_input(p) for p in payload.key_points]) if payload.key_points else "General update"
        tone = payload.tone or "Professional and Academic"

        default_title = f"Notice: {topic}"

        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.strip() == "":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Draft generation is not configured.")

        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = (
                f"You are a university communications assistant. Write a clear, concise, {tone.lower()} announcement for {audience}.\n"
                f"Topic: {topic}\n"
                f"Key Points: {points}\n"
                f"Format with a clear title line (starting with 'TITLE: ') followed by the body text."
            )
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            if response.text:
                raw = response.text.strip()
                title = default_title
                content = raw
                if "TITLE:" in raw:
                    parts = raw.split("TITLE:", 1)[1].strip().split("\n", 1)
                    title = parts[0].strip()
                    content = parts[1].strip() if len(parts) > 1 else raw

                return AIDraftResponse(
                    draft_title=title,
                    draft_content=content,
                    is_ai_generated=True,
                )
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Draft generation returned no content.")
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise
            logger.exception("Announcement draft generation failed")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Draft generation is temporarily unavailable.") from exc

    @staticmethod
    def summarize_announcement(payload: AISummarizeRequest) -> AISummarizeResponse:
        """Summarize a long announcement into concise bullet points."""
        content = sanitize_input(payload.content)
        max_words = payload.max_words or 100

        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.strip() == "":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Announcement summarization is not configured.")

        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = (
                f"You are a university communications assistant. Summarize the following announcement in at most {max_words} words:\n\n"
                f"{content}\n\n"
                f"Provide a brief 1-2 sentence overview followed by up to 3 bullet points of key takeaways."
            )
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            if response.text:
                raw = response.text.strip()
                return AISummarizeResponse(
                    summary=raw,
                    key_takeaways=[l.strip("-•* ") for l in raw.split("\n") if l.strip().startswith(("-", "•", "*", "1.", "2.", "3."))][:3],
                    is_ai_generated=True,
                )
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Summarization returned no content.")
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise
            logger.exception("Announcement summarization failed")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Summarization is temporarily unavailable.") from exc

    @staticmethod
    def improve_tone(payload: AIToneImproveRequest) -> AIToneImproveResponse:
        """Refine draft text into a polite, clear, and professional academic tone."""
        text = sanitize_input(payload.text)
        desired_tone = payload.desired_tone or "Polite, Clear, and Authoritative Academic"

        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.strip() == "":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Tone improvement is not configured.")

        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = (
                f"Revise the following text to have a {desired_tone} tone suitable for university communications. "
                f"Preserve all facts and dates exactly:\n\n{text}"
            )
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            if response.text:
                return AIToneImproveResponse(
                    improved_text=response.text.strip(),
                    is_ai_generated=True,
                )
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Tone improvement returned no content.")
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise
            logger.exception("Tone improvement failed")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Tone improvement is temporarily unavailable.") from exc
