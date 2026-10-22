"""AI Safety, PII Sanitization, and Deterministic Fallback Service."""

import re
from typing import Dict, Any, Optional


class AISafetyManager:
    """Guards against PII leakage, validates AI responses, and provides deterministic fallbacks."""

    @staticmethod
    def sanitize_student_context(metrics: Dict[str, Any], trend_desc: str) -> Dict[str, Any]:
        """Strip all PII (names, emails, student IDs), retaining purely numerical aggregates."""
        return {
            "gpa": metrics.get("current_gpa", 0.0),
            "cgpa": metrics.get("cumulative_gpa", 0.0),
            "attendance_percentage": metrics.get("attendance_percentage", 100.0),
            "assignment_completion_rate": metrics.get("assignment_completion_rate", 100.0),
            "exam_average_percentage": metrics.get("exam_average_percentage", 100.0),
            "failed_courses_count": metrics.get("failed_courses_count", 0),
            "trend_summary": trend_desc,
        }

    @staticmethod
    def sanitize_course_context(course_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize course context for aggregate AI summary."""
        return {
            "course_title": course_data.get("course_name", "Academic Course"),
            "class_average": course_data.get("class_average_percentage", 0.0),
            "pass_rate": course_data.get("pass_rate", 0.0),
            "average_attendance": course_data.get("average_attendance", 0.0),
            "total_enrolled": course_data.get("total_enrolled", 0),
            "at_risk_count": course_data.get("at_risk_students_count", 0),
        }

    @staticmethod
    def validate_ai_output(text: Optional[str]) -> bool:
        """Validate that the AI response is non-empty, safe, and of reasonable length."""
        if not text or not isinstance(text, str):
            return False
        clean = text.strip()
        if len(clean) < 20 or len(clean) > 2000:
            return False
        # Prevent prompt leakage or unauthorized command strings
        suspicious = ["<script>", "SYSTEM_PROMPT", "API_KEY", "DROP TABLE", "PASSWORD"]
        if any(s.lower() in clean.lower() for s in suspicious):
            return False
        return True

    @staticmethod
    def get_deterministic_student_fallback(metrics: Dict[str, Any]) -> str:
        """Generate high-quality rule-based study advice when Gemini is unavailable."""
        gpa = metrics.get("current_gpa", 8.0)
        att = metrics.get("attendance_percentage", 90.0)
        assign = metrics.get("assignment_completion_rate", 90.0)

        lines = []
        if att < 75.0:
            lines.append(f"Attendance is currently at {att:.1f}%. Prioritize attending all upcoming lectures and practical labs to satisfy university criteria.")
        else:
            lines.append(f"Attendance is strong at {att:.1f}%. Continue maintaining this level of regular lecture engagement.")

        if assign < 80.0:
            lines.append(f"Assignment completion is at {assign:.1f}%. Allocate dedicated study blocks to complete pending LMS coursework assignments before deadlines.")
        else:
            lines.append(f"Coursework submissions are consistent ({assign:.1f}% completion rate). Keep up this steady pace.")

        if gpa >= 8.5:
            lines.append(f"Outstanding academic trajectory with a GPA of {gpa:.2f}. You are currently on track for Dean's List distinction.")
        elif gpa < 6.0:
            lines.append(f"Current GPA is {gpa:.2f}. We recommend reaching out to assigned course instructors during office hours for revision guidance.")
        else:
            lines.append(f"Maintaining solid academic health with a GPA of {gpa:.2f}. Focus on key exam components to elevate your semester standing.")

        return " ".join(lines)

    @staticmethod
    def get_deterministic_course_fallback(course_data: Dict[str, Any]) -> str:
        """Generate rule-based course summary when Gemini is unavailable."""
        pass_rate = course_data.get("pass_rate", 85.0)
        avg_att = course_data.get("average_attendance", 85.0)
        at_risk = course_data.get("at_risk_students_count", 0)

        return (
            f"Course cohort exhibits an overall pass rate of {pass_rate:.1f}% with average attendance of {avg_att:.1f}%. "
            f"{at_risk} students have been flagged for targeted academic support. "
            f"Recommended faculty action: continue scheduled revision sessions and monitor upcoming assessment submissions."
        )
