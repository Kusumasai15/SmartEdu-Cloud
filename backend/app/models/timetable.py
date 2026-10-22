"""Class Schedule & Timetable models for SmartEdu Cloud."""

import enum
from sqlalchemy import (
    Column,
    String,
    Enum as SQLEnum,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class DayOfWeek(str, enum.Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class ScheduleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class ClassSchedule(Base, TimestampMixin):
    __tablename__ = "class_schedules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    section_name = Column(String(50), nullable=True, default="A")
    day_of_week = Column(SQLEnum(DayOfWeek, name="day_of_week_enum"), nullable=False)
    start_time = Column(String(10), nullable=False)  # HH:MM format e.g. "09:00"
    end_time = Column(String(10), nullable=False)    # HH:MM format e.g. "10:00"
    room = Column(String(50), nullable=False)
    building = Column(String(100), nullable=True)
    academic_period = Column(String(50), nullable=False, default="Fall 2026")
    week_number = Column(String(3), nullable=False, default="1")
    lecture_title = Column(String(200), nullable=True)
    session_type = Column(String(30), nullable=False, default="LECTURE")
    status = Column(SQLEnum(ScheduleStatus, name="schedule_status_enum"), default=ScheduleStatus.ACTIVE, nullable=False)

    # Relationships
    course = relationship("Course", back_populates="schedules", lazy="select")
    faculty = relationship("User", foreign_keys=[faculty_id], lazy="select")
    attendance_sessions = relationship("AttendanceSession", back_populates="schedule", cascade="all, delete-orphan", lazy="select")

    __table_args__ = (
        Index("ix_schedule_faculty_day_time", "faculty_id", "day_of_week", "start_time", "end_time"),
        Index("ix_schedule_room_day_time", "room", "day_of_week", "start_time", "end_time"),
        Index("ix_schedule_course_section_day", "course_id", "section_name", "day_of_week", "start_time", "end_time"),
    )
