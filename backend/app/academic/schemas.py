"""Pydantic Schemas for Academic Management (Phase 04)."""
from app.schemas.validation import TrimmedString
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# DEPARTMENT SCHEMAS
# ==============================================================================

class SchoolCreate(BaseModel):
    name: TrimmedString = Field(..., min_length=2, max_length=150)
    code: TrimmedString = Field(..., min_length=2, max_length=20)
    dean: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    is_active: bool = True


class SchoolUpdate(BaseModel):
    name: Optional[TrimmedString] = Field(None, min_length=2, max_length=150)
    code: Optional[TrimmedString] = Field(None, min_length=2, max_length=20)
    dean: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentCreate(BaseModel):
    model_config = {"extra": "ignore"}
    name: TrimmedString = Field(..., min_length=2, max_length=150, description="Department name")
    code: TrimmedString = Field(..., min_length=2, max_length=20, description="Unique department code, e.g. CSE")
    school: Optional[TrimmedString] = Field(None, min_length=2, max_length=150, description="Existing academic school name")
    head_of_department: Optional[str] = Field(None, max_length=150, description="Head of Department (HOD) name")
    dean: Optional[str] = Field(None, max_length=150, description="Alias for HOD")
    program_coordinator: Optional[str] = Field(None, max_length=150, description="Program Coordinator name")
    programCoordinator: Optional[str] = Field(None, max_length=150, description="Alias for Program Coordinator")
    description: Optional[str] = Field(None, description="Department description")
    cohorts: Optional[List[dict]] = Field(default_factory=list, description="Class cohorts belonging to this department")
    is_active: bool = Field(True, description="Active status")


class DepartmentUpdate(BaseModel):
    model_config = {"extra": "ignore"}
    name: Optional[TrimmedString] = Field(None, min_length=2, max_length=150)
    code: Optional[TrimmedString] = Field(None, min_length=2, max_length=20)
    school: Optional[TrimmedString] = Field(None, min_length=2, max_length=150)
    head_of_department: Optional[str] = Field(None, max_length=150)
    dean: Optional[str] = Field(None, max_length=150)
    program_coordinator: Optional[str] = Field(None, max_length=150)
    programCoordinator: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    cohorts: Optional[List[dict]] = None
    is_active: Optional[bool] = None


class DepartmentRead(BaseModel):
    id: str
    name: str
    code: str
    school: Optional[str] = None
    description: Optional[str] = None
    cohorts: Optional[List[dict]] = None
    is_active: bool
    created_at: Optional[datetime] = None
    course_count: int = 0


# ==============================================================================
# SEMESTER SCHEMAS
# ==============================================================================

class SemesterCreate(BaseModel):
    name: TrimmedString = Field(..., min_length=2, max_length=100, description="Semester term name, e.g. Fall 2026")
    academic_year: TrimmedString = Field(..., min_length=4, max_length=20, description="Academic year, e.g. 2026-27")
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    is_current: bool = Field(False, description="Is active/current term")


class SemesterUpdate(BaseModel):
    name: Optional[TrimmedString] = Field(None, min_length=2, max_length=100)
    academic_year: Optional[TrimmedString] = Field(None, min_length=4, max_length=20)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


class SemesterRead(BaseModel):
    id: str
    name: str
    academic_year: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: Optional[datetime] = None


# ==============================================================================
# TOPIC SCHEMAS
# ==============================================================================

class TopicCreate(BaseModel):
    title: TrimmedString = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    display_order: int = Field(1, ge=1)


class TopicUpdate(BaseModel):
    title: Optional[TrimmedString] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    display_order: Optional[int] = Field(None, ge=1)


class TopicRead(BaseModel):
    id: str
    module_id: str
    title: str
    description: Optional[str] = None
    display_order: int


# ==============================================================================
# COURSE MODULE SCHEMAS
# ==============================================================================

class CourseModuleCreate(BaseModel):
    title: TrimmedString = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    display_order: int = Field(1, ge=1)


class CourseModuleUpdate(BaseModel):
    title: Optional[TrimmedString] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    display_order: Optional[int] = Field(None, ge=1)


class CourseModuleRead(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    display_order: int
    topics: List[TopicRead] = Field(default_factory=list)


# ==============================================================================
# COURSE & INSTRUCTOR SCHEMAS
# ==============================================================================

class CourseInstructorAssign(BaseModel):
    faculty_id: str = Field(..., description="Faculty user UUID")
    is_primary: bool = Field(True, description="Primary instructor flag")


class CourseInstructorRead(BaseModel):
    id: str
    course_id: str
    faculty_id: str
    faculty_name: str
    faculty_email: str
    faculty_identifier: Optional[str] = None
    is_primary: bool


class CourseCreate(BaseModel):
    course_code: TrimmedString = Field(..., min_length=2, max_length=30, description="Course code, e.g. CS101")
    name: TrimmedString = Field(..., min_length=2, max_length=200, description="Course name")
    description: Optional[str] = None
    credits: int = Field(3, ge=1, le=12, description="Academic credits")
    department_id: Optional[str] = Field(None, description="Department UUID")
    semester_id: Optional[str] = Field(None, description="Semester UUID")
    is_active: bool = Field(True, description="Active status")


class CourseUpdate(BaseModel):
    course_code: Optional[TrimmedString] = Field(None, min_length=2, max_length=30)
    name: Optional[TrimmedString] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    credits: Optional[int] = Field(None, ge=1, le=12)
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    is_active: Optional[bool] = None


class CourseRead(BaseModel):
    id: str
    course_code: str
    name: str
    description: Optional[str] = None
    credits: int
    department_id: str
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    semester_id: str
    semester_name: Optional[str] = None
    is_active: bool
    instructors: List[CourseInstructorRead] = Field(default_factory=list)
    module_count: int = 0
    enrolled_count: int = 0


class CourseStructureRead(BaseModel):
    course: CourseRead
    modules: List[CourseModuleRead] = Field(default_factory=list)


# ==============================================================================
# ENROLLMENT SCHEMAS
# ==============================================================================

class EnrollmentRead(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    student_identifier: Optional[str] = None
    course_id: str
    course_code: str
    course_name: str
    semester_id: str
    semester_name: str
    status: str
    enrolled_at: datetime


# ==============================================================================
# ACADEMIC CATALOG SCHEMAS
# ==============================================================================

class CatalogCourseRead(BaseModel):
    id: str
    course_code: str
    name: str
    description: Optional[str] = None
    credits: int
    department_id: str
    department_code: str
    department_name: str
    semester_id: str
    semester_name: str
    instructors: List[str] = Field(default_factory=list)
    is_enrolled: bool = False
    is_active: bool = True
