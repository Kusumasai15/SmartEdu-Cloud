"""Pydantic v2 Schemas for Academic Calendar, Rooms, Leave, and Scheduling Intelligence."""
from app.schemas.validation import TrimmedString

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.scheduling import (
    CalendarEventType,
    RoomType,
    LeaveType,
    LeaveStatus,
    SessionType,
    SubstitutionStatus,
)
from app.models.timetable import DayOfWeek, ScheduleStatus


# -------------------------------------------------------------
# ACADEMIC CALENDAR & HOLIDAYS
# -------------------------------------------------------------
class CalendarEventCreate(BaseModel):
    event_type: CalendarEventType
    title: TrimmedString = Field(..., max_length=200, min_length=1)
    description: Optional[str] = None
    start_date: date
    end_date: date
    semester_id: Optional[str] = None
    department_id: Optional[str] = None
    is_instructional_day: bool = False


class CalendarEventResponse(BaseModel):
    id: str
    event_type: CalendarEventType
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    semester_id: Optional[str] = None
    semester_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    is_instructional_day: bool
    created_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# ROOM / RESOURCE INVENTORY
# -------------------------------------------------------------
class AcademicRoomCreate(BaseModel):
    building: TrimmedString = Field(..., max_length=100, min_length=1)
    floor: Optional[str] = Field(None, max_length=80)
    room_number: TrimmedString = Field(..., max_length=50, min_length=1)
    display_name: Optional[str] = Field(None, max_length=150)
    room_category: Optional[str] = Field(None, max_length=30)
    facilities: List[str] = Field(default_factory=list)
    operational_status: str = Field("AVAILABLE", max_length=20)
    capacity: int = Field(60, ge=1, le=1000)
    room_type: RoomType = RoomType.CLASSROOM
    has_projector: bool = True
    has_recording: bool = False


class AcademicRoomResponse(BaseModel):
    id: str
    building: str
    floor: Optional[str] = None
    room_number: str
    display_name: Optional[str] = None
    room_category: Optional[str] = None
    facilities: List[str] = Field(default_factory=list)
    operational_status: str = "AVAILABLE"
    capacity: int
    room_type: RoomType
    has_projector: bool
    has_recording: bool
    is_active: bool

    @field_validator("facilities", mode="before")
    @classmethod
    def normalize_facilities(cls, value: Optional[List[str]]) -> List[str]:
        return value or []

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# STUDENT LEAVE MANAGEMENT
# -------------------------------------------------------------
class StudentLeaveCreate(BaseModel):
    leave_type: LeaveType = LeaveType.PERSONAL
    start_date: date
    end_date: date
    reason: TrimmedString = Field(..., min_length=5, max_length=2000)


class StudentLeaveReviewRequest(BaseModel):
    status: LeaveStatus  # APPROVED or REJECTED
    review_notes: Optional[str] = None


class StudentLeaveResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    department_name: Optional[str] = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# TIMETABLE CONFLICTS & WORKLOAD
# -------------------------------------------------------------
class TimetableConflictCheckRequest(BaseModel):
    course_id: str
    faculty_id: str
    day_of_week: DayOfWeek
    start_time: str  # "09:00"
    end_time: str    # "10:00"
    room: str
    building: Optional[str] = None
    exclude_schedule_id: Optional[str] = None


class ConflictItem(BaseModel):
    conflict_type: str  # "FACULTY_OVERLAP", "ROOM_DOUBLE_BOOKED", "SECTION_OVERLAP", "HOLIDAY_COLLISION", "EXAM_COLLISION"
    severity: str       # "BLOCKING", "WARNING"
    description: str
    conflicting_entity: Optional[str] = None


class ConflictCheckReport(BaseModel):
    has_conflicts: bool
    is_blocked: bool
    conflicts: List[ConflictItem] = []


class ScheduleRescheduleRequest(BaseModel):
    new_day_of_week: DayOfWeek
    new_start_time: str
    new_end_time: str
    new_room: str
    reason: str


class SubstituteFacultyRequest(BaseModel):
    substitute_faculty_id: str
    assigned_date: date
    reason: TrimmedString = Field(..., min_length=1)


class SubstituteFacultyResponse(BaseModel):
    id: str
    schedule_id: str
    course_code: str
    course_name: str
    original_faculty_name: str
    substitute_faculty_name: str
    assigned_date: date
    status: SubstitutionStatus
    reason: Optional[str] = None
    created_at: datetime


class FacultyWorkloadMetric(BaseModel):
    faculty_id: str
    faculty_name: str
    department_name: Optional[str] = None
    total_assigned_courses: int
    weekly_teaching_hours: float
    total_weekly_sessions: int
    lecture_hours: float
    lab_hours: float
    tutorial_hours: float
    status: str  # "NORMAL", "HIGH", "OVERLOADED"


# -------------------------------------------------------------
# ATTENDANCE SHORTAGE & RECOVERY PROJECTION
# -------------------------------------------------------------
class CourseAttendanceShortage(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    total_sessions_conducted: int
    sessions_attended: int
    current_attendance_pct: float
    is_shortage: bool
    required_threshold_pct: float = 75.0
    estimated_remaining_sessions: int = 10
    minimum_sessions_to_attend: int
    recovery_possible: bool
    recovery_guidance: str


class StudentAttendanceShortageReport(BaseModel):
    student_id: str
    student_name: str
    overall_attendance_pct: float
    has_any_shortage: bool
    shortage_courses: List[CourseAttendanceShortage] = []
