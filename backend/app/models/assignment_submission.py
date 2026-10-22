"""Assignment Submission Model."""
from enum import Enum
from sqlalchemy import Column, String, Text, Float, Boolean, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class SubmissionStatus(str, Enum):
    """Lifecycle states for student assignment submissions."""
    SUBMITTED = "SUBMITTED"
    GRADED = "GRADED"
    RESUBMITTED = "RESUBMITTED"
    RETURNED = "RETURNED"


class AssignmentSubmission(Base, TimestampMixin):
    """Student submission for a specific coursework assignment."""
    __tablename__ = "assignment_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assignment_id = Column(
        String(36),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submission_text = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)
    submitted_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    is_late = Column(Boolean, default=False, nullable=False)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    graded_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        String(20),
        default=SubmissionStatus.SUBMITTED.value,
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student_submission"),
        CheckConstraint(
            "status IN ('SUBMITTED', 'GRADED', 'RESUBMITTED', 'RETURNED')",
            name="check_submission_status",
        ),
    )

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_id], back_populates="submissions")
    evaluator = relationship("User", foreign_keys=[graded_by])

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        if isinstance(value, SubmissionStatus):
            return value.value
        if value not in [s.value for s in SubmissionStatus]:
            raise ValueError(f"Invalid submission status '{value}'. Allowed: {[s.value for s in SubmissionStatus]}")
        return value

    def __repr__(self) -> str:
        return f"<AssignmentSubmission(id='{self.id}', assignment_id='{self.assignment_id}', student_id='{self.student_id}', status='{self.status}')>"
