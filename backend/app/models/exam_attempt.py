"""ExamAttempt and ExamAnswer Models."""
from enum import Enum
from sqlalchemy import Column, String, Text, Float, Boolean, Integer, ForeignKey, DateTime, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class AttemptStatus(str, Enum):
    """Status lifecycle of student exam attempt."""
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    AUTO_SUBMITTED = "AUTO_SUBMITTED"
    EXPIRED = "EXPIRED"
    EVALUATED = "EVALUATED"


class ReviewStatus(str, Enum):
    """Faculty proctoring integrity assessment outcome."""
    NOT_REVIEWED = "NOT_REVIEWED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    CLEARED = "CLEARED"
    VIOLATION_CONFIRMED = "VIOLATION_CONFIRMED"


class ExamAttempt(Base, TimestampMixin):
    """Student examination session with server-authoritative timer and integrity tracking."""
    __tablename__ = "exam_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    exam_id = Column(
        String(36),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_number = Column(Integer, default=1, nullable=False)
    started_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        String(20),
        default=AttemptStatus.IN_PROGRESS.value,
        nullable=False,
        index=True,
    )
    score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)
    integrity_score = Column(Float, default=100.0, nullable=False)
    review_status = Column(
        String(30),
        default=ReviewStatus.NOT_REVIEWED.value,
        nullable=False,
        index=True,
    )
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    question_order_json = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "attempt_number", name="uq_exam_student_attempt"),
        CheckConstraint(
            "status IN ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'EVALUATED')",
            name="check_attempt_status",
        ),
        CheckConstraint(
            "review_status IN ('NOT_REVIEWED', 'REVIEW_REQUIRED', 'CLEARED', 'VIOLATION_CONFIRMED')",
            name="check_review_status",
        ),
        CheckConstraint("integrity_score >= 0 AND integrity_score <= 100", name="check_integrity_score_bounds"),
    )

    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    student = relationship("User", foreign_keys=[student_id], back_populates="exam_attempts")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    answers = relationship(
        "ExamAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
    proctoring_events = relationship(
        "ProctoringEvent",
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="ProctoringEvent.timestamp",
    )

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        if isinstance(value, AttemptStatus):
            return value.value
        if value not in [s.value for s in AttemptStatus]:
            raise ValueError(f"Invalid attempt status '{value}'")
        return value

    @validates("review_status")
    def validate_review(self, key: str, value: str) -> str:
        if isinstance(value, ReviewStatus):
            return value.value
        if value not in [r.value for r in ReviewStatus]:
            raise ValueError(f"Invalid review status '{value}'")
        return value

    def __repr__(self) -> str:
        return f"<ExamAttempt(id='{self.id}', exam_id='{self.exam_id}', student_id='{self.student_id}', status='{self.status}')>"


class ExamAnswer(Base):
    """Individual recorded answer during an exam attempt."""
    __tablename__ = "exam_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(
        String(36),
        ForeignKey("exam_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id = Column(
        String(36),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    selected_option_ids_json = Column(Text, nullable=True)  # JSON array of UUID strings
    text_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)
    saved_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_answer"),
    )

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("Question")

    def __repr__(self) -> str:
        return f"<ExamAnswer(attempt_id='{self.attempt_id}', question_id='{self.question_id}', is_correct={self.is_correct})>"
