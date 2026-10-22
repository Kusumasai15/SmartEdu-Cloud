"""Pydantic v2 Schemas for Question Bank, Exams, Timed Attempts, and Proctoring."""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.question import QuestionType, DifficultyLevel
from app.models.exam import ExamType, ProctoringMode
from app.models.exam_attempt import AttemptStatus, ReviewStatus
from app.models.proctoring_event import EventSeverity, ProctoringEventType


# -------------------------------------------------------------
# QUESTION BANK SCHEMAS
# -------------------------------------------------------------

class QuestionOptionCreate(BaseModel):
    """Payload to create a question option."""
    option_text: str = Field(..., min_length=1, description="Text for choice")
    is_correct: bool = Field(False, description="Whether this option is a correct answer")
    display_order: int = Field(1, ge=1)


class QuestionOptionResponse(BaseModel):
    """Question option representation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_id: str
    option_text: str
    is_correct: bool
    display_order: int


class QuestionOptionStudentView(BaseModel):
    """Sanitized option view for taking exams (correct flag omitted)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    option_text: str
    display_order: int


class QuestionCreate(BaseModel):
    """Payload to author a new Question Bank item."""
    question_type: QuestionType = Field(QuestionType.MCQ_SINGLE)
    difficulty: DifficultyLevel = Field(DifficultyLevel.MEDIUM)
    question_text: str = Field(..., min_length=3, description="Problem statement")
    points: float = Field(1.0, gt=0, description="Marks awarded on correct")
    negative_points: float = Field(0.0, ge=0, description="Marks deducted on incorrect")
    explanation: Optional[str] = Field(None, description="Pedagogical rationale / solution")
    module_id: Optional[str] = None
    topic_id: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionUpdate(BaseModel):
    """Payload to update Question Bank item."""
    question_type: Optional[QuestionType] = None
    difficulty: Optional[DifficultyLevel] = None
    question_text: Optional[str] = None
    points: Optional[float] = Field(None, gt=0)
    negative_points: Optional[float] = Field(None, ge=0)
    explanation: Optional[str] = None
    module_id: Optional[str] = None
    topic_id: Optional[str] = None
    is_active: Optional[bool] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionResponse(BaseModel):
    """Full question detail (Faculty view)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    module_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_type: str
    difficulty: str
    question_text: str
    points: float
    negative_points: float
    explanation: Optional[str] = None
    is_active: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    options: List[QuestionOptionResponse] = []


class QuestionStudentView(BaseModel):
    """Sanitized question view for active examination."""
    id: str
    question_type: str
    difficulty: str
    question_text: str
    points: float
    display_order: int
    options: List[QuestionOptionStudentView] = []


# -------------------------------------------------------------
# EXAM & PROCTORING POLICY SCHEMAS
# -------------------------------------------------------------

class ProctoringPolicyConfig(BaseModel):
    """Proctoring configuration settings."""
    proctoring_mode: ProctoringMode = Field(ProctoringMode.BASIC_PROCTORED)
    fullscreen_required: bool = Field(True)
    camera_required: bool = Field(False)
    microphone_required: bool = Field(False)
    screen_share_required: bool = Field(False)
    tab_switch_detection: bool = Field(True)
    window_blur_detection: bool = Field(True)
    copy_paste_prevention: bool = Field(True)
    context_menu_disabled: bool = Field(True)
    keyboard_shortcut_detection: bool = Field(True)
    auto_submit_on_expiry: bool = Field(True)
    max_violations_warning: int = Field(5, ge=1)


class ProctoringPolicyResponse(BaseModel):
    """Proctoring policy representation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    exam_id: str
    proctoring_mode: str
    fullscreen_required: bool
    camera_required: bool
    microphone_required: bool
    screen_share_required: bool
    tab_switch_detection: bool
    window_blur_detection: bool
    copy_paste_prevention: bool
    context_menu_disabled: bool
    keyboard_shortcut_detection: bool
    auto_submit_on_expiry: bool
    max_violations_warning: int


class ExamCreate(BaseModel):
    """Payload to create an Exam."""
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    exam_type: ExamType = Field(ExamType.QUIZ)
    duration_minutes: int = Field(60, gt=0)
    total_marks: float = Field(100.0, gt=0)
    passing_marks: float = Field(40.0, ge=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: int = Field(1, ge=1)
    is_published: bool = Field(False)
    allow_review: bool = Field(True)
    randomize_questions: bool = Field(True)
    randomize_options: bool = Field(True)
    question_ids: List[str] = Field(default_factory=list, description="IDs of questions to attach")
    proctoring_policy: Optional[ProctoringPolicyConfig] = None


class ExamUpdate(BaseModel):
    """Payload to update an Exam."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    exam_type: Optional[ExamType] = None
    duration_minutes: Optional[int] = Field(None, gt=0)
    total_marks: Optional[float] = Field(None, gt=0)
    passing_marks: Optional[float] = Field(None, ge=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: Optional[int] = Field(None, ge=1)
    is_published: Optional[bool] = None
    results_published: Optional[bool] = None
    allow_review: Optional[bool] = None
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    question_ids: Optional[List[str]] = None
    proctoring_policy: Optional[ProctoringPolicyConfig] = None


class TransactionalQuestionOption(BaseModel):
    """Option payload for transactional quiz creation."""
    option_text: str = Field(..., min_length=1)
    is_correct: bool = Field(False)
    display_order: int = Field(1, ge=1)


class TransactionalQuestion(BaseModel):
    """Question item payload for transactional quiz creation."""
    question_type: QuestionType = Field(QuestionType.MCQ_SINGLE)
    difficulty: DifficultyLevel = Field(DifficultyLevel.MEDIUM)
    question_text: str = Field(..., min_length=3)
    points: float = Field(1.0, gt=0)
    negative_points: float = Field(0.0, ge=0)
    explanation: Optional[str] = None
    module_id: Optional[str] = None
    topic_id: Optional[str] = None
    options: List[TransactionalQuestionOption] = Field(default_factory=list)


class TransactionalQuizCreate(BaseModel):
    """Atomic payload to create an exam together with all its questions and options in one transaction."""
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    exam_type: ExamType = Field(ExamType.QUIZ)
    duration_minutes: int = Field(30, gt=0)
    total_marks: Optional[float] = Field(None, gt=0)
    passing_marks: Optional[float] = Field(None, ge=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: int = Field(1, ge=1)
    is_published: bool = Field(True)
    allow_review: bool = Field(True)
    randomize_questions: bool = Field(True)
    randomize_options: bool = Field(True)
    questions: List[TransactionalQuestion] = Field(..., min_length=1)
    proctoring_policy: Optional[ProctoringPolicyConfig] = None



class ExamResponse(BaseModel):
    """Exam details view."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    exam_type: str
    duration_minutes: int
    total_marks: float
    passing_marks: float
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: int
    is_published: bool
    results_published: bool
    allow_review: bool
    randomize_questions: bool
    randomize_options: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    questions_count: int = 0
    proctoring_policy: Optional[ProctoringPolicyResponse] = None


# -------------------------------------------------------------
# ATTEMPT & ANSWERS SCHEMAS
# -------------------------------------------------------------

class AnswerSavePayload(BaseModel):
    """Student answer autosave payload."""
    question_id: str
    selected_option_ids: Optional[List[str]] = None
    text_answer: Optional[str] = None


class AnswerResponse(BaseModel):
    """Saved answer representation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    attempt_id: str
    question_id: str
    selected_option_ids_json: Optional[str] = None
    text_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    marks_awarded: Optional[float] = None
    saved_at: datetime


class ExamAttemptStartResponse(BaseModel):
    """Active exam attempt workspace data."""
    attempt_id: str
    exam_id: str
    title: str
    instructions: Optional[str] = None
    duration_minutes: int
    started_at: datetime
    expires_at: datetime
    server_time: datetime
    questions: List[QuestionStudentView]
    saved_answers: Dict[str, Any]
    proctoring_policy: Optional[ProctoringPolicyResponse] = None


class ExamAttemptSummaryResponse(BaseModel):
    """Attempt evaluation result."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    exam_id: str
    student_id: str
    attempt_number: int
    started_at: datetime
    submitted_at: Optional[datetime] = None
    status: str
    score: Optional[float] = None
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    integrity_score: float
    review_status: str
    total_marks: float
    passing_marks: float
    results_published: bool


# -------------------------------------------------------------
# PROCTORING EVENTS & REVIEW SCHEMAS
# -------------------------------------------------------------

class ProctoringEventCreate(BaseModel):
    """Single proctoring event signal from client."""
    event_type: str = Field(..., description="Signal code (e.g. TAB_SWITCH, FULLSCREEN_EXIT)")
    severity: EventSeverity = Field(EventSeverity.INFO)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_seconds: Optional[float] = None
    metadata_json: Optional[str] = None


class ProctoringEventBatchCreate(BaseModel):
    """Batched proctoring events payload."""
    events: List[ProctoringEventCreate]


class ProctoringEventResponse(BaseModel):
    """Proctoring event record."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    attempt_id: str
    event_type: str
    severity: str
    timestamp: datetime
    duration_seconds: Optional[float] = None
    metadata_json: Optional[str] = None


class ReviewAttemptPayload(BaseModel):
    """Faculty proctoring review outcome."""
    review_status: ReviewStatus = Field(..., description="CLEARED, REVIEW_REQUIRED, or VIOLATION_CONFIRMED")
    review_notes: Optional[str] = Field(None, max_length=5000)


class StudentAttemptRosterRow(BaseModel):
    """Row in faculty proctoring & assessment dashboard."""
    attempt_id: Optional[str] = None
    student_id: str
    student_name: str
    student_email: str
    student_identifier: Optional[str] = None
    attempt_number: int
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    status: str  # NOT_STARTED, IN_PROGRESS, SUBMITTED, EVALUATED
    score: Optional[float] = None
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    integrity_score: float = 100.0
    review_status: str
    total_violations_count: int = 0
    high_violations_count: int = 0


class FacultyProctoringDashboard(BaseModel):
    """Complete faculty exam monitoring & review dashboard."""
    exam: ExamResponse
    total_enrolled: int
    total_started: int
    total_submitted: int
    total_flagged_for_review: int
    average_integrity_score: float
    average_score: Optional[float] = None
    roster: List[StudentAttemptRosterRow]
