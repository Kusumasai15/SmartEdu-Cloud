"""Pydantic v2 Schemas for Academic Intelligence, Risk Engine & Early-Warning System."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.academic_intelligence import (
    AcademicRiskLevel,
    PerformanceTrendDirection,
    CourseHealthStatus,
)


# -------------------------------------------------------------
# STUDENT ACADEMIC INTELLIGENCE SCHEMAS
# -------------------------------------------------------------
class RiskFactorItem(BaseModel):
    factor_name: str
    severity: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    reason: str
    metric_value: str


class StudentPerformanceProfile(BaseModel):
    student_id: str
    student_name: str
    student_identifier: Optional[str] = None
    department_name: Optional[str] = None
    current_gpa: float
    cumulative_gpa: float
    attendance_percentage: float
    assignment_completion_rate: float
    exam_average_percentage: float
    total_courses_registered: int
    total_courses_passed: int
    failed_courses_count: int
    performance_trend: PerformanceTrendDirection
    trend_description: str
    risk_score: float  # 0.0 - 100.0
    risk_level: AcademicRiskLevel
    primary_risk_factors: List[RiskFactorItem] = []
    academic_standing: str
    snapshot_date: str


class ActionableRecommendation(BaseModel):
    priority: int  # 1 (highest), 2, 3
    title: str
    recommendation: str
    category: str  # "ATTENDANCE", "ASSIGNMENT", "EXAM", "COURSEWORK"
    course_code: Optional[str] = None
    target_metric: Optional[str] = None


class StudentIntelligenceResponse(BaseModel):
    profile: StudentPerformanceProfile
    recommendations: List[ActionableRecommendation] = []
    ai_study_insights: Optional[str] = None
    is_ai_generated: bool = False
    generated_at: str


# -------------------------------------------------------------
# FACULTY COURSE INTELLIGENCE SCHEMAS
# -------------------------------------------------------------
class DifficultTopicInsight(BaseModel):
    topic_or_module: str
    assessment_type: str
    average_score_percentage: float
    failure_rate_percentage: float
    difficulty_level: str  # "EASY", "MODERATE", "DIFFICULT"
    recommendation: str


class CourseHealthIntelligence(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    semester_name: str
    total_enrolled: int
    health_status: CourseHealthStatus
    health_score: float  # 0.0 - 100.0 (Higher = healthier)
    health_reasons: List[str] = []
    class_average_percentage: float
    average_gpa: float
    pass_rate: float
    average_attendance: float
    assignment_completion_rate: float
    at_risk_students_count: int
    difficult_topics: List[DifficultTopicInsight] = []
    ai_course_summary: Optional[str] = None
    is_ai_generated: bool = False


# -------------------------------------------------------------
# HOD DEPARTMENT INTELLIGENCE SCHEMAS
# -------------------------------------------------------------
class AtRiskStudentRosterItem(BaseModel):
    student_id: str
    student_name: str
    student_identifier: Optional[str] = None
    risk_level: AcademicRiskLevel
    risk_score: float
    current_gpa: float
    attendance_percentage: float
    primary_reasons: List[str] = []


class DepartmentIntelligenceResponse(BaseModel):
    department_id: str
    department_name: str
    total_students: int
    total_courses: int
    department_average_gpa: float
    department_pass_rate: float
    department_average_attendance: float
    at_risk_students_count: int
    critical_risk_count: int
    high_risk_count: int
    at_risk_roster: List[AtRiskStudentRosterItem] = []
    courses_health: List[CourseHealthIntelligence] = []


# -------------------------------------------------------------
# VC INSTITUTIONAL INTELLIGENCE SCHEMAS
# -------------------------------------------------------------
class VCInstitutionalIntelligenceResponse(BaseModel):
    institution_average_gpa: float
    institution_pass_rate: float
    institution_average_attendance: float
    total_students: int
    total_at_risk_students: int
    risk_distribution: Dict[str, int] = {}
    department_health_rankings: List[Dict[str, Any]] = []
    institutional_trends: Dict[str, Any] = {}


# -------------------------------------------------------------
# AI REQUEST / PROMPT SCHEMAS
# -------------------------------------------------------------
class AIInsightGenerateRequest(BaseModel):
    focus_area: Optional[str] = None  # "STUDY_PLAN", "COURSE_SUMMARY"
    force_refresh: bool = False


# -------------------------------------------------------------
# AI STUDY FLASHCARDS & CURRICULUM DECKS
# -------------------------------------------------------------
class StudyFlashcard(BaseModel):
    card_index: int
    total_cards: int
    title: str
    definition: str
    construction: str
    olap_or_key_concepts: str
    example: str


class FlashcardDeckRequest(BaseModel):
    course_code: str
    course_title: Optional[str] = "Course Curriculum"
    unit_title: Optional[str] = "Unit I"
    topic_title: str
    syllabus_context: Optional[str] = None


class FlashcardDeckResponse(BaseModel):
    topic_title: str
    deck_title: str
    cards: List[StudyFlashcard]
    is_ai_generated: bool = False


# -------------------------------------------------------------
# ADAPTIVE SYLLABUS PRACTICE MCQS
# -------------------------------------------------------------
class AdaptiveMcqQuestion(BaseModel):
    id: str
    prompt: str
    options: List[str]
    correct_index: int
    explanation: str
    concept_tested: str
    difficulty: str = "Medium"


class GenerateMcqRequest(BaseModel):
    course_code: str
    course_title: Optional[str] = "Course Curriculum"
    topic_title: str
    count: int = Field(default=5, ge=1, le=15)


class GenerateMcqResponse(BaseModel):
    course_code: str
    topic_title: str
    questions: List[AdaptiveMcqQuestion]
    is_ai_generated: bool = False


# -------------------------------------------------------------
# IN-PLAYER AI ACADEMIC TUTOR
# -------------------------------------------------------------
class TutorChatMessage(BaseModel):
    role: str  # "user" | "model" | "assistant"
    content: str


class TutorChatRequest(BaseModel):
    course_code: str
    course_title: Optional[str] = "Course Curriculum"
    current_topic: Optional[str] = None
    unit_title: Optional[str] = None
    message: str
    history: Optional[List[TutorChatMessage]] = []


class TutorChatResponse(BaseModel):
    reply: str
    suggested_followups: List[str] = []
    is_ai_generated: bool = False

