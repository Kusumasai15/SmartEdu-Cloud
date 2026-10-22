"""SQLAlchemy Models for Advanced Academic Calendar, Rooms, Leave, and Scheduling Intelligence."""

import enum
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    JSON,
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


# -------------------------------------------------------------
# ENUMS
# -------------------------------------------------------------
class CalendarEventType(str, enum.Enum):
    SEMESTER_START = "SEMESTER_START"
    SEMESTER_END = "SEMESTER_END"
    HOLIDAY = "HOLIDAY"
    WORKING_DAY = "WORKING_DAY"
    EXAM_PERIOD = "EXAM_PERIOD"
    RESULT_PERIOD = "RESULT_PERIOD"
    REGISTRATION = "REGISTRATION"
    ACADEMIC_EVENT = "ACADEMIC_EVENT"


class RoomType(str, enum.Enum):
    CLASSROOM = "CLASSROOM"
    LAB = "LAB"
    SEMINAR_ROOM = "SEMINAR_ROOM"
    AUDITORIUM = "AUDITORIUM"
    OTHER = "OTHER"


class LeaveType(str, enum.Enum):
    MEDICAL = "MEDICAL"
    ON_DUTY = "ON_DUTY"
    PERSONAL = "PERSONAL"
    EMERGENCY = "EMERGENCY"


class LeaveStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class SessionType(str, enum.Enum):
    LECTURE = "LECTURE"
    LAB = "LAB"
    TUTORIAL = "TUTORIAL"
    PRACTICAL = "PRACTICAL"
    SEMINAR = "SEMINAR"


class SubstitutionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# -------------------------------------------------------------
# ACADEMIC CALENDAR & HOLIDAYS
# -------------------------------------------------------------
class AcademicCalendarEvent(Base, TimestampMixin):
    """Academic calendar milestone, official holiday, or department event."""
    __tablename__ = "academic_calendar_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)

    event_type = Column(SQLEnum(CalendarEventType, name="calendar_event_type_enum"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    is_instructional_day = Column(Boolean, default=False, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    semester = relationship("Semester", foreign_keys=[semester_id], lazy="select")
    department = relationship("Department", foreign_keys=[department_id], lazy="select")
    creator = relationship("User", foreign_keys=[created_by], lazy="select")


# -------------------------------------------------------------
# ROOM / PHYSICAL RESOURCE INVENTORY
# -------------------------------------------------------------
class AcademicRoom(Base, TimestampMixin):
    """Classroom, laboratory, or auditorium resource entity."""
    __tablename__ = "academic_rooms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    building = Column(String(100), nullable=False)
    floor = Column(String(80), nullable=True)
    room_number = Column(String(50), nullable=False)
    display_name = Column(String(150), nullable=True)
    room_category = Column(String(30), nullable=True)
    facilities = Column(JSON, nullable=True)
    operational_status = Column(String(20), nullable=False, default="AVAILABLE")
    capacity = Column(Integer, default=60, nullable=False)
    room_type = Column(SQLEnum(RoomType, name="room_type_enum"), default=RoomType.CLASSROOM, nullable=False)

    has_projector = Column(Boolean, default=True, nullable=False)
    has_recording = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("building", "room_number", name="uq_room_building_number"),
        Index("ix_rooms_building_type", "building", "room_type"),
    )


# -------------------------------------------------------------
# STUDENT LEAVE MANAGEMENT
# -------------------------------------------------------------
class StudentLeaveRequest(Base, TimestampMixin):
    """Formal student leave application with approval workflow."""
    __tablename__ = "student_leave_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    leave_type = Column(SQLEnum(LeaveType, name="leave_type_enum"), default=LeaveType.PERSONAL, nullable=False)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    reason = Column(Text, nullable=False)

    status = Column(SQLEnum(LeaveStatus, name="leave_status_enum"), default=LeaveStatus.SUBMITTED, nullable=False)
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id], lazy="select")
    reviewer = relationship("User", foreign_keys=[reviewer_id], lazy="select")

    __table_args__ = (
        Index("ix_leave_student_status", "student_id", "status"),
    )


# -------------------------------------------------------------
# TIMETABLE CHANGE LOGS & SUBSTITUTE FACULTY
# -------------------------------------------------------------
class ScheduleChangeLog(Base, TimestampMixin):
    """Audit log tracking timetable reallocations, time shifts, and room changes."""
    __tablename__ = "schedule_change_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    schedule_id = Column(String(36), ForeignKey("class_schedules.id", ondelete="CASCADE"), nullable=False, index=True)

    old_day = Column(String(20), nullable=True)
    old_start_time = Column(String(10), nullable=True)
    old_end_time = Column(String(10), nullable=True)
    old_room = Column(String(50), nullable=True)

    new_day = Column(String(20), nullable=False)
    new_start_time = Column(String(10), nullable=False)
    new_end_time = Column(String(10), nullable=False)
    new_room = Column(String(50), nullable=False)

    reason = Column(String(255), nullable=True)
    changed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    schedule = relationship("ClassSchedule", foreign_keys=[schedule_id], lazy="select")
    author = relationship("User", foreign_keys=[changed_by], lazy="select")


class SubstituteFacultyAssignment(Base, TimestampMixin):
    """Temporary substitute instructor assignment for a scheduled class session."""
    __tablename__ = "substitute_faculty_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    schedule_id = Column(String(36), ForeignKey("class_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    original_faculty_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    substitute_faculty_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    assigned_date = Column(Date, nullable=False, index=True)
    status = Column(SQLEnum(SubstitutionStatus, name="substitution_status_enum"), default=SubstitutionStatus.ACTIVE, nullable=False)
    reason = Column(String(255), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    schedule = relationship("ClassSchedule", foreign_keys=[schedule_id], lazy="select")
    original_faculty = relationship("User", foreign_keys=[original_faculty_id], lazy="select")
    substitute_faculty = relationship("User", foreign_keys=[substitute_faculty_id], lazy="select")
    approver = relationship("User", foreign_keys=[approved_by], lazy="select")
