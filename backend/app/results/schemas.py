"""Pydantic v2 Schemas for Academic Results, Gradebook, GPA, and Transcripts."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.result import (
    ResultStatus,
    AcademicStatus,
    CorrectionRequestStatus,
    AssessmentComponentType,
)


# -------------------------------------------------------------
# GRADE SCALE SCHEMAS
# -------------------------------------------------------------
class GradeScaleItemCreate(BaseModel):
    grade: str = Field(..., min_length=1, max_length=10, description="e.g. A+, A, B+, B, C, D, F")
    minimum_percentage: float = Field(..., ge=0.0, le=100.0)
    maximum_percentage: float = Field(..., ge=0.0, le=100.0)
    grade_point: float = Field(..., ge=0.0, le=10.0)
    is_passing: bool = True
    description: Optional[str] = None


class GradeScaleItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    grade_scale_id: str
    grade: str
    minimum_percentage: float
    maximum_percentage: float
    grade_point: float
    is_passing: bool
    description: Optional[str] = None


class GradeScaleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_default: bool = False
    items: List[GradeScaleItemCreate] = []


class GradeScaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    is_default: bool
    items: List[GradeScaleItemResponse] = []
    created_at: datetime


# -------------------------------------------------------------
# COURSE ASSESSMENT WEIGHT SCHEMAS
# -------------------------------------------------------------
class ComponentWeightItem(BaseModel):
    component_type: AssessmentComponentType
    weight_percentage: float = Field(..., gt=0.0, le=100.0)
    minimum_passing_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    is_mandatory: bool = True


class CourseAssessmentWeightSetRequest(BaseModel):
    course_id: str
    semester_id: str
    weights: List[ComponentWeightItem] = Field(..., min_length=1, description="List of component weights that must sum to 100%")


class CourseAssessmentWeightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    semester_id: str
    component_type: AssessmentComponentType
    weight_percentage: float
    minimum_passing_percentage: float
    is_mandatory: bool


# -------------------------------------------------------------
# GRADEBOOK & COMPONENT MARKS SCHEMAS
# -------------------------------------------------------------
class ResultComponentScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    component_type: AssessmentComponentType
    raw_score: float
    max_score: float
    percentage: float
    weight_percentage: float
    weighted_score: float
    is_missing: bool
    assessment_ref_id: Optional[str] = None
    notes: Optional[str] = None


class StudentGradebookRow(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    student_identifier: Optional[str] = None
    components: List[ResultComponentScoreResponse] = []
    final_percentage: float = 0.0
    letter_grade: str = "F"
    grade_point: float = 0.0
    credits_earned: int = 0
    status: ResultStatus = ResultStatus.DRAFT
    academic_status: AcademicStatus = AcademicStatus.FAIL
    missing_components_count: int = 0
    result_id: Optional[str] = None


class CourseGradebookResponse(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    semester_id: str
    semester_name: str
    total_enrolled: int
    configured_weights: List[CourseAssessmentWeightResponse] = []
    roster: List[StudentGradebookRow] = []
    overall_status: ResultStatus = ResultStatus.DRAFT
    total_missing_marks: int = 0


# -------------------------------------------------------------
# COURSE RESULT & SUBMISSION SCHEMAS
# -------------------------------------------------------------
class CourseResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    course_id: str
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    semester_id: str
    semester_name: Optional[str] = None
    final_percentage: float
    letter_grade: str
    grade_point: float
    credits_earned: int
    status: ResultStatus
    academic_status: AcademicStatus
    submitted_by: Optional[str] = None
    submitted_at: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    review_notes: Optional[str] = None
    component_scores: List[ResultComponentScoreResponse] = []
    created_at: datetime


class ResultReviewRequest(BaseModel):
    approval_status: CorrectionRequestStatus = CorrectionRequestStatus.APPROVED  # APPROVED or REJECTED
    review_notes: Optional[str] = None


# -------------------------------------------------------------
# RESULT CORRECTION SCHEMAS
# -------------------------------------------------------------
class ResultCorrectionCreate(BaseModel):
    result_id: str
    requested_grade: str = Field(..., min_length=1, max_length=10)
    requested_percentage: float = Field(..., ge=0.0, le=100.0)
    reason: str = Field(..., min_length=10, description="Justification for modifying a published academic result")


class ResultCorrectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    result_id: str
    student_id: str
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    course_id: str
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    original_grade: str
    original_percentage: float
    requested_grade: str
    requested_percentage: float
    reason: str
    requested_by: str
    requester_name: Optional[str] = None
    requested_at: str
    reviewed_by: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    status: CorrectionRequestStatus
    review_notes: Optional[str] = None
    created_at: datetime


# -------------------------------------------------------------
# STUDENT ACADEMIC TRANSCRIPT & GPA SCHEMAS
# -------------------------------------------------------------
class SemesterTranscriptSection(BaseModel):
    semester_id: str
    semester_name: str
    academic_year: str
    total_credits_registered: int
    total_credits_earned: int
    semester_gpa: float
    courses: List[CourseResultResponse] = []


class OfficialStudentTranscriptResponse(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    student_identifier: Optional[str] = None
    department_name: Optional[str] = None
    program: str = "Bachelor of Technology (B.Tech)"
    cumulative_gpa: float
    total_credits_registered: int
    total_credits_earned: int
    total_courses_passed: int
    total_courses_failed: int
    academic_standing: str  # "GOOD_STANDING", "PROBATION", "DEAN_LIST"
    semesters: List[SemesterTranscriptSection] = []
    issued_at: str


# -------------------------------------------------------------
# ANALYTICS & STATS SCHEMAS
# -------------------------------------------------------------
class CourseResultAnalytics(BaseModel):
    course_id: str
    course_name: str
    course_code: str
    total_students: int
    pass_percentage: float
    fail_percentage: float
    average_percentage: float
    average_gpa: float
    grade_distribution: Dict[str, int] = {}
    at_risk_students_count: int = 0


class DepartmentResultAnalytics(BaseModel):
    department_id: str
    department_name: str
    total_students: int
    total_courses: int
    department_average_gpa: float
    department_pass_rate: float
    pending_approvals_count: int
    courses_analytics: List[CourseResultAnalytics] = []


class VCInstitutionResultAnalytics(BaseModel):
    institution_average_gpa: float
    institution_pass_rate: float
    total_students_evaluated: int
    total_courses_completed: int
    total_at_risk_students: int
    department_rankings: List[Dict[str, Any]] = []
    grade_distribution_overall: Dict[str, int] = {}
