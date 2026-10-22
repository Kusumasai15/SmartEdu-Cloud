"""Pydantic Schemas for Assignments & Submissions."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.assignment import AssignmentStatus
from app.models.assignment_submission import SubmissionStatus


# -------------------------------------------------------------
# ASSIGNMENT SCHEMAS
# -------------------------------------------------------------

class AssignmentCreate(BaseModel):
    """Payload to author a new coursework assignment."""
    title: str = Field(..., min_length=3, max_length=200, description="Assignment title")
    description: Optional[str] = Field(None, max_length=5000, description="Overview and summary")
    instructions: Optional[str] = Field(None, max_length=10000, description="Step-by-step submission instructions")
    module_id: Optional[str] = Field(None, description="Associated course module UUID")
    attachment_url: Optional[str] = Field(None, max_length=1000, description="Assignment prompt sheet / resource URL")
    max_points: int = Field(100, gt=0, description="Total maximum score")
    passing_points: int = Field(40, ge=0, description="Passing threshold score")
    due_date: datetime = Field(..., description="Assignment deadline timestamp")
    allow_late_submission: bool = Field(False, description="Whether late submissions are permitted")
    status: AssignmentStatus = Field(AssignmentStatus.DRAFT, description="Initial lifecycle status")


class AssignmentUpdate(BaseModel):
    """Payload to update assignment details."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    module_id: Optional[str] = None
    attachment_url: Optional[str] = None
    max_points: Optional[int] = Field(None, gt=0)
    passing_points: Optional[int] = Field(None, ge=0)
    due_date: Optional[datetime] = None
    allow_late_submission: Optional[bool] = None
    status: Optional[AssignmentStatus] = None


class AssignmentResponse(BaseModel):
    """Assignment detail response representation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    module_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    attachment_url: Optional[str] = None
    max_points: int
    passing_points: int
    due_date: datetime
    allow_late_submission: bool
    status: str
    results_published: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# -------------------------------------------------------------
# SUBMISSION SCHEMAS
# -------------------------------------------------------------

class SubmissionCreate(BaseModel):
    """Student payload to submit an assignment."""
    submission_text: Optional[str] = Field(None, description="Direct text response / answer")
    attachment_url: Optional[str] = Field(None, description="Submitted document, repository link, or asset URL")

    @field_validator("submission_text")
    def validate_content(cls, v: Optional[str], info) -> Optional[str]:
        return v


class SubmissionGradePayload(BaseModel):
    """Faculty payload to grade a student submission."""
    score: float = Field(..., ge=0, description="Assigned marks")
    feedback: Optional[str] = Field(None, max_length=5000, description="Evaluator feedback & rubric comments")


class SubmissionResponse(BaseModel):
    """Student submission representation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    assignment_id: str
    student_id: str
    submission_text: Optional[str] = None
    attachment_url: Optional[str] = None
    submitted_at: datetime
    is_late: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    graded_by: Optional[str] = None
    graded_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime


class StudentSubmissionView(BaseModel):
    """Composite student view including assignment metadata and own submission status."""
    assignment: AssignmentResponse
    submission: Optional[SubmissionResponse] = None
    is_submitted: bool
    is_graded: bool
    is_past_due: bool


class FacultySubmissionRosterRow(BaseModel):
    """Row in faculty submission grading dashboard."""
    submission_id: Optional[str] = None
    student_id: str
    student_name: str
    student_email: str
    student_identifier: Optional[str] = None
    submitted_at: Optional[datetime] = None
    is_submitted: bool
    is_late: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    status: str  # PENDING, SUBMITTED, GRADED


class AssignmentGradingDashboard(BaseModel):
    """Complete faculty assignment assessment view with real metrics."""
    assignment: AssignmentResponse
    total_enrolled: int
    total_submitted: int
    total_graded: int
    average_score: Optional[float] = None
    highest_score: Optional[float] = None
    lowest_score: Optional[float] = None
    submissions: List[FacultySubmissionRosterRow]
