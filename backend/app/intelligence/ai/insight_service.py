"""Backend-isolated academic content generation without fabricated fallbacks."""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.intelligence.ai.safety import AISafetyManager

logger = logging.getLogger("smartedu.intelligence.ai")


class AcademicAIInsightService:
    """Generate optional academic assistance while keeping failure states explicit."""

    @staticmethod
    def _client():
        if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
            return None
        from google import genai
        return genai.Client(api_key=settings.GEMINI_API_KEY)

    @staticmethod
    def _parse_array(raw: str) -> List[Dict[str, Any]]:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        parsed = json.loads(cleaned.strip())
        return parsed if isinstance(parsed, list) else []

    @classmethod
    def generate_student_study_insights(cls, metrics: Dict[str, Any], trend_desc: str) -> Tuple[str, bool]:
        safe = AISafetyManager.sanitize_student_context(metrics, trend_desc)
        client = cls._client()
        if client is None:
            return "", False
        try:
            prompt = (
                "Provide two concise study recommendations using only these verified metrics: "
                f"GPA {safe['gpa']:.2f}, attendance {safe['attendance_percentage']:.1f}%, "
                f"coursework completion {safe['assignment_completion_rate']:.1f}%, trend {safe['trend_summary']}. "
                "Do not infer personal facts or mention a provider."
            )
            response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
            text = (response.text or "").strip()
            return (text, True) if text and AISafetyManager.validate_ai_output(text) else ("", False)
        except Exception as exc:
            logger.warning("Student insight generation failed: %s", exc)
            return "", False

    @classmethod
    def generate_course_summary_insights(cls, course_data: Dict[str, Any]) -> Tuple[str, bool]:
        safe = AISafetyManager.sanitize_course_context(course_data)
        client = cls._client()
        if client is None:
            return "", False
        try:
            prompt = (
                "Summarize these verified course metrics and provide one teaching action: "
                f"course {safe['course_title']}, average {safe['class_average']:.1f}%, "
                f"pass rate {safe['pass_rate']:.1f}%, attendance {safe['average_attendance']:.1f}%, "
                f"students needing support {safe['at_risk_count']}. Do not invent explanations."
            )
            response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
            text = (response.text or "").strip()
            return (text, True) if text and AISafetyManager.validate_ai_output(text) else ("", False)
        except Exception as exc:
            logger.warning("Course insight generation failed: %s", exc)
            return "", False

    @classmethod
    def generate_topic_flashcards(cls, course_code: str, course_title: str, unit_title: str,
                                  topic_title: str, syllabus_context: Optional[str] = None) -> Tuple[List[Dict[str, Any]], bool]:
        client = cls._client()
        if client is None:
            return [], False
        try:
            prompt = (
                f"Using only the supplied syllabus context, create four accurate flashcards for {course_title} "
                f"({course_code}), unit {unit_title}, topic {topic_title}. Return a JSON array with card_index, "
                "total_cards, title, definition, construction, olap_or_key_concepts, and example. "
                f"Do not infer absent facts. Context: {syllabus_context or 'No additional context supplied.'}"
            )
            response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
            cards = cls._parse_array(response.text or "")
            return (cards, True) if cards else ([], False)
        except Exception as exc:
            logger.warning("Flashcard generation failed: %s", exc)
            return [], False

    @classmethod
    def generate_topic_practice_mcqs(cls, course_code: str, course_title: str,
                                     topic_title: str, count: int = 5) -> Tuple[List[Dict[str, Any]], bool]:
        client = cls._client()
        if client is None:
            return [], False
        try:
            prompt = (
                f"Create {count} curriculum-grounded multiple-choice questions for {course_title} ({course_code}), "
                f"topic {topic_title}. Return a JSON array with id, prompt, four options, correct_index, "
                "explanation, concept_tested, and difficulty. Do not invent course context."
            )
            response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
            questions = cls._parse_array(response.text or "")[:count]
            return (questions, True) if questions else ([], False)
        except Exception as exc:
            logger.warning("Practice generation failed: %s", exc)
            return [], False

    @classmethod
    def generate_tutor_response(cls, course_code: str, course_title: str, current_topic: Optional[str],
                                unit_title: Optional[str], message: str,
                                history: Optional[List[Dict[str, str]]] = None) -> Tuple[str, List[str], bool]:
        client = cls._client()
        if client is None:
            return "The course learning service is not configured. Please contact your administrator.", [], False
        try:
            recent = "\n".join(f"{item.get('role', 'user')}: {item.get('content', '')}" for item in (history or [])[-4:])
            prompt = (
                f"Answer using only the published context for {course_title} ({course_code}), unit "
                f"{unit_title or 'not specified'}, topic {current_topic or 'not specified'}. State when context is "
                f"insufficient and do not mention providers.\nRecent conversation:\n{recent}\nStudent question: {message}"
            )
            response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
            text = (response.text or "").strip()
            return (text, [], True) if text else ("The learning service returned no answer.", [], False)
        except Exception as exc:
            logger.warning("Tutor response generation failed: %s", exc)
            return "The course learning service is temporarily unavailable. Please try again later.", [], False
