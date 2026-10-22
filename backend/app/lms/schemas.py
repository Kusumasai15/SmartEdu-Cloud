"""Pydantic Schemas for LMS and Course Content System."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.learning_content import ContentType, ContentStatus
from app.models.content_progress import ProgressStatus


# Base & CRUD Schemas
class LearningContentBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    content_type: ContentType = ContentType.TEXT_CONTENT
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    thumbnail_url: Optional[str] = None
    display_order: int = Field(default=1, ge=1)
    is_required: bool = True


class LearningContentCreate(LearningContentBase):
    status: ContentStatus = ContentStatus.DRAFT


class LearningContentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    content_type: Optional[ContentType] = None
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    thumbnail_url: Optional[str] = None
    display_order: Optional[int] = Field(None, ge=1)
    is_required: Optional[bool] = None
    status: Optional[ContentStatus] = None


class LearningContentResponse(LearningContentBase):
    id: str
    topic_id: str
    status: ContentStatus
    created_by: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Student View with Progress
class LearningContentViewWithProgress(LearningContentResponse):
    student_progress_status: ProgressStatus = ProgressStatus.NOT_STARTED
    is_completed: bool = False
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ProgressUpdatePayload(BaseModel):
    status: ProgressStatus = ProgressStatus.COMPLETED


class ProgressResponse(BaseModel):
    id: str
    student_id: str
    content_id: str
    status: ProgressStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Topic & Course Learning Structures
class TopicLearningView(BaseModel):
    id: str
    module_id: str
    title: str
    description: Optional[str] = None
    display_order: int
    contents: List[LearningContentViewWithProgress] = []
    total_contents: int = 0
    completed_contents: int = 0
    is_topic_completed: bool = False
    progress_percentage: float = 0.0


class ModuleLearningView(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    display_order: int
    topics: List[TopicLearningView] = []
    total_topics: int = 0
    completed_topics: int = 0
    module_progress_percentage: float = 0.0


class CourseLearningView(BaseModel):
    course_id: str
    course_code: str
    title: str
    description: Optional[str] = None
    department_name: Optional[str] = None
    semester_name: Optional[str] = None
    instructor_name: Optional[str] = None
    instructor_designation: Optional[str] = None
    total_published_contents: int = 0
    total_completed_contents: int = 0
    course_progress_percentage: float = 0.0
    modules: List[ModuleLearningView] = []


# Faculty Progress Analytics Schemas
class StudentProgressRow(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    completed_contents_count: int
    total_contents_count: int
    progress_percentage: float
    enrollment_date: datetime


class FacultyCourseAnalytics(BaseModel):
    course_id: str
    course_code: str
    course_title: str
    total_enrolled_students: int
    total_published_contents: int
    average_course_progress: float
    students_completed_all: int
    students_not_started: int
    student_roster_progress: List[StudentProgressRow] = []
