"""Pydantic Schemas for Attendance, Timetable & Engagement."""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.timetable import DayOfWeek, ScheduleStatus
from app.models.attendance import (
    AttendanceSessionStatus,
    AttendanceStatus,
    CorrectionStatus,
)


# -------------------------------------------------------------
# TIMETABLE SCHEMAS
# -------------------------------------------------------------
class ClassScheduleCreate(BaseModel):
    course_id: str
    faculty_id: str
    section_name: Optional[str] = "A"
    day_of_week: DayOfWeek
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM e.g. 09:00")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM e.g. 10:00")
    room: str = Field(..., min_length=1, max_length=50)
    building: Optional[str] = None
    academic_period: str = Field("Current term", min_length=2, max_length=50)
    week_number: int = Field(1, ge=1, le=60)
    lecture_title: Optional[str] = Field(None, max_length=200)
    session_type: str = Field("LECTURE", max_length=30)


class ClassScheduleUpdate(BaseModel):
    course_id: Optional[str] = None
    faculty_id: Optional[str] = None
    section_name: Optional[str] = None
    day_of_week: Optional[DayOfWeek] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    building: Optional[str] = None
    status: Optional[ScheduleStatus] = None
    academic_period: Optional[str] = Field(None, min_length=2, max_length=50)
    week_number: Optional[int] = Field(None, ge=1, le=60)
    lecture_title: Optional[str] = Field(None, max_length=200)
    session_type: Optional[str] = Field(None, max_length=30)


class ClassScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    faculty_id: str
    faculty_name: Optional[str] = None
    section_name: Optional[str] = "A"
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    room: str
    building: Optional[str] = None
    academic_period: str
    week_number: int = 1
    lecture_title: Optional[str] = None
    session_type: str = "LECTURE"
    status: ScheduleStatus
    created_at: datetime


# -------------------------------------------------------------
# ATTENDANCE SESSION & RECORD SCHEMAS
# -------------------------------------------------------------
class AttendanceSessionCreate(BaseModel):
    course_id: str
    session_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    topic_covered: Optional[str] = None
    schedule_id: Optional[str] = None


class SingleStudentAttendanceInput(BaseModel):
    student_id: str
    status: AttendanceStatus = AttendanceStatus.PRESENT
    minutes_late: int = Field(default=0, ge=0)
    remarks: Optional[str] = None


class BulkAttendanceMarkRequest(BaseModel):
    records: List[SingleStudentAttendanceInput]


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    student_id: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_identifier: Optional[str] = None
    status: AttendanceStatus
    minutes_late: int
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AttendanceSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    faculty_id: str
    faculty_name: Optional[str] = None
    schedule_id: Optional[str] = None
    session_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    topic_covered: Optional[str] = None
    status: AttendanceSessionStatus
    total_records: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    excused_count: int = 0
    created_at: datetime
    updated_at: datetime


class AttendanceSessionDetailResponse(AttendanceSessionResponse):
    records: List[AttendanceRecordResponse] = []


# -------------------------------------------------------------
# ATTENDANCE CORRECTION SCHEMAS
# -------------------------------------------------------------
class AttendanceCorrectionCreate(BaseModel):
    record_id: str
    requested_status: AttendanceStatus
    reason: str = Field(..., min_length=5)


class AttendanceCorrectionReviewRequest(BaseModel):
    approval_status: CorrectionStatus
    review_notes: Optional[str] = None


class AttendanceCorrectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    record_id: str
    session_id: Optional[str] = None
    session_date: Optional[date] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    original_status: AttendanceStatus
    requested_status: AttendanceStatus
    reason: str
    requested_by: str
    requester_name: Optional[str] = None
    requested_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    approval_status: CorrectionStatus
    created_at: datetime


# -------------------------------------------------------------
# STUDENT ATTENDANCE & SUMMARY SCHEMAS
# -------------------------------------------------------------
class CourseAttendanceSummary(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_percentage: float
    threshold_status: str  # GOOD, WARNING, CRITICAL
    alert_message: Optional[str] = None


class StudentAttendanceDashboard(BaseModel):
    student_id: str
    student_name: str
    overall_percentage: float
    overall_status: str  # GOOD, WARNING, CRITICAL
    total_sessions: int
    total_present: int
    total_absent: int
    total_late: int
    total_excused: int
    courses: List[CourseAttendanceSummary]
    trend: List[Dict[str, Any]] = []


# -------------------------------------------------------------
# FACULTY, HOD & VC ANALYTICS SCHEMAS
# -------------------------------------------------------------
class FacultyAttendanceAnalytics(BaseModel):
    course_id: str
    course_name: str
    course_code: str
    total_sessions_conducted: int
    total_enrolled_students: int
    average_attendance_percentage: float
    students_below_warning: int  # < 75%
    students_below_critical: int # < 65%


class HODDepartmentAttendanceAnalytics(BaseModel):
    department_id: str
    department_name: str
    total_courses: int
    total_students: int
    average_attendance_percentage: float
    total_below_warning: int
    total_below_critical: int
    pending_corrections_count: int
    courses_summary: List[FacultyAttendanceAnalytics]


class VCInstitutionAttendanceAnalytics(BaseModel):
    institution_average_percentage: float
    total_departments: int
    total_students: int
    total_below_threshold: int
    total_sessions_conducted: int
    department_breakdown: List[Dict[str, Any]]


# -------------------------------------------------------------
# ACADEMIC ENGAGEMENT SCORE SCHEMA
# -------------------------------------------------------------
class AcademicEngagementScore(BaseModel):
    student_id: str
    student_name: str
    engagement_percentage: float
    attendance_rate: float
    assignment_rate: float
    exam_participation_rate: float
    rating: str  # HIGH, MODERATE, NEEDS_ATTENTION
