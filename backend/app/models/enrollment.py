"""Enrollment Model."""
from enum import Enum
from sqlalchemy import Column, String, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class EnrollmentStatus(str, Enum):
    """Lifecycle states for student course enrollments."""
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"
    SUSPENDED = "SUSPENDED"


class Enrollment(Base, TimestampMixin):
    """Student Course Enrollment entity binding a student to a course for a semester."""
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    course_id = Column(
        String(36),
        ForeignKey("courses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    semester_id = Column(
        String(36),
        ForeignKey("semesters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(20),
        default=EnrollmentStatus.ACTIVE.value,
        nullable=False,
        index=True,
    )
    enrolled_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "semester_id", name="uq_student_course_semester"),
        CheckConstraint(
            "status IN ('ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED')",
            name="check_enrollment_status",
        ),
    )

    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    semester = relationship("Semester", back_populates="enrollments")

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        """Ensure status string is a valid EnrollmentStatus enum member."""
        if isinstance(value, EnrollmentStatus):
            return value.value
        if value not in [s.value for s in EnrollmentStatus]:
            raise ValueError(f"Invalid enrollment status '{value}'. Allowed: {[s.value for s in EnrollmentStatus]}")
        return value

    def __repr__(self) -> str:
        return f"<Enrollment(student='{self.student_id}', course='{self.course_id}', status='{self.status}')>"
