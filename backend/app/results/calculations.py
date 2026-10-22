"""Authoritative Academic Result & GPA/CGPA Calculation Service."""

from typing import List, Dict, Any, Optional, Tuple
from app.models.result import (
    GradeScale,
    GradeScaleItem,
    AcademicStatus,
    AssessmentComponentType,
)


class ResultCalculationEngine:
    """Deterministic mathematical engine for normalizing marks, weighting components, and computing GPA/CGPA."""

    DEFAULT_GRADE_SCALE = [
        {"grade": "A+", "minimum_percentage": 90.0, "maximum_percentage": 100.0, "grade_point": 10.0, "is_passing": True, "description": "Outstanding"},
        {"grade": "A", "minimum_percentage": 80.0, "maximum_percentage": 89.99, "grade_point": 9.0, "is_passing": True, "description": "Excellent"},
        {"grade": "B+", "minimum_percentage": 70.0, "maximum_percentage": 79.99, "grade_point": 8.0, "is_passing": True, "description": "Very Good"},
        {"grade": "B", "minimum_percentage": 60.0, "maximum_percentage": 69.99, "grade_point": 7.0, "is_passing": True, "description": "Good"},
        {"grade": "C", "minimum_percentage": 50.0, "maximum_percentage": 59.99, "grade_point": 6.0, "is_passing": True, "description": "Satisfactory"},
        {"grade": "D", "minimum_percentage": 40.0, "maximum_percentage": 49.99, "grade_point": 5.0, "is_passing": True, "description": "Pass"},
        {"grade": "F", "minimum_percentage": 0.0, "maximum_percentage": 39.99, "grade_point": 0.0, "is_passing": False, "description": "Fail"},
    ]

    @staticmethod
    def normalize_score(raw_score: float, max_score: float) -> float:
        """Normalize raw marks to a standard 100-base percentage."""
        if max_score <= 0:
            return 0.0
        pct = (raw_score / max_score) * 100.0
        return round(min(100.0, max(0.0, pct)), 2)

    @staticmethod
    def calculate_weighted_score(percentage: float, weight_percentage: float) -> float:
        """Calculate component's weighted contribution to final 100% total."""
        weighted = percentage * (weight_percentage / 100.0)
        return round(weighted, 2)

    @classmethod
    def resolve_grade_and_point(
        cls,
        final_percentage: float,
        scale_items: Optional[List[GradeScaleItem]] = None,
    ) -> Tuple[str, float, bool]:
        """Determine letter grade, grade point, and is_passing from percentage.
        
        Returns: (letter_grade, grade_point, is_passing)
        """
        pct = round(final_percentage, 2)
        
        if scale_items and len(scale_items) > 0:
            for item in scale_items:
                if item.minimum_percentage <= pct <= (item.maximum_percentage + 0.001):
                    return item.grade, item.grade_point, item.is_passing
            # Fallback to the lowest scale item
            lowest = min(scale_items, key=lambda x: x.minimum_percentage)
            return lowest.grade, lowest.grade_point, lowest.is_passing

        # Use default institutional scale
        for s in cls.DEFAULT_GRADE_SCALE:
            if s["minimum_percentage"] <= pct <= (s["maximum_percentage"] + 0.001):
                return s["grade"], s["grade_point"], s["is_passing"]

        return "F", 0.0, False

    @staticmethod
    def calculate_gpa(course_entries: List[Dict[str, Any]]) -> Tuple[float, int, int]:
        """Compute Credit-Weighted Semester GPA: Sum(Credits * GradePoint) / Sum(Credits).
        
        Args:
            course_entries: List of dicts with keys: 'credits' (int), 'grade_point' (float), 'is_passing' (bool)
            
        Returns:
            Tuple: (gpa, total_credits_registered, total_credits_earned)
        """
        total_registered_credits = 0
        total_earned_credits = 0
        total_credit_points = 0.0

        for entry in course_entries:
            cr = entry.get("credits", 0)
            gp = entry.get("grade_point", 0.0)
            is_pass = entry.get("is_passing", False)

            total_registered_credits += cr
            total_credit_points += (cr * gp)
            if is_pass:
                total_earned_credits += cr

        if total_registered_credits == 0:
            return 0.0, 0, 0

        gpa = round(total_credit_points / total_registered_credits, 2)
        return gpa, total_registered_credits, total_earned_credits

    @classmethod
    def calculate_cgpa(cls, all_completed_courses: List[Dict[str, Any]]) -> Tuple[float, int, int]:
        """Compute Cumulative GPA across all eligible academic semesters."""
        return cls.calculate_gpa(all_completed_courses)

    @staticmethod
    def determine_academic_standing(cgpa: float, failed_courses_count: int = 0) -> str:
        """Categorize academic standing based on CGPA and backlogs."""
        if failed_courses_count > 2 or cgpa < 5.0:
            return "PROBATION"
        elif cgpa >= 8.5 and failed_courses_count == 0:
            return "DEAN_LIST"
        else:
            return "GOOD_STANDING"
