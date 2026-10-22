"""Attendance Session, Record & Correction models for SmartEdu Cloud."""

import enum
from sqlalchemy import (
    Column,
    String,
    Enum as SQLEnum,
    ForeignKey,
    Date,
    Integer,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class AttendanceSessionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class CorrectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AttendanceSession(Base, TimestampMixin):
    __tablename__ = "attendance_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    schedule_id = Column(String(36), ForeignKey("class_schedules.id", ondelete="SET NULL"), nullable=True, index=True)
    session_date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10), nullable=True)
    end_time = Column(String(10), nullable=True)
    topic_covered = Column(String(255), nullable=True)
    status = Column(
        SQLEnum(AttendanceSessionStatus, name="attendance_session_status_enum"),
        default=AttendanceSessionStatus.OPEN,
        nullable=False,
    )

    # Relationships
    course = relationship("Course", back_populates="attendance_sessions", lazy="select")
    faculty = relationship("User", foreign_keys=[faculty_id], lazy="select")
    schedule = relationship("ClassSchedule", back_populates="attendance_sessions", lazy="select")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan", lazy="select")


class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(
        SQLEnum(AttendanceStatus, name="attendance_status_enum"),
        default=AttendanceStatus.PRESENT,
        nullable=False,
    )
    minutes_late = Column(Integer, default=0, nullable=False)
    remarks = Column(String(255), nullable=True)

    # Relationships
    session = relationship("AttendanceSession", back_populates="records", lazy="select")
    student = relationship("User", foreign_keys=[student_id], lazy="select")
    corrections = relationship("AttendanceCorrection", back_populates="record", cascade="all, delete-orphan", lazy="select")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
        Index("ix_record_student_status", "student_id", "status"),
    )


class AttendanceCorrection(Base, TimestampMixin):
    __tablename__ = "attendance_corrections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    record_id = Column(String(36), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True)
    original_status = Column(SQLEnum(AttendanceStatus, name="attendance_status_enum"), nullable=False)
    requested_status = Column(SQLEnum(AttendanceStatus, name="attendance_status_enum"), nullable=False)
    reason = Column(Text, nullable=False)
    requested_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    requested_at = Column(String(30), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(String(30), nullable=True)
    review_notes = Column(Text, nullable=True)
    approval_status = Column(
        SQLEnum(CorrectionStatus, name="correction_status_enum"),
        default=CorrectionStatus.PENDING,
        nullable=False,
    )

    # Relationships
    record = relationship("AttendanceRecord", back_populates="corrections", lazy="select")
    requester = relationship("User", foreign_keys=[requested_by], lazy="select")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="select")
