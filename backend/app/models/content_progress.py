"""Student Content Progress Model."""
from enum import Enum
from sqlalchemy import Column, String, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ProgressStatus(str, Enum):
    """Completion states for student learning content items."""
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class StudentContentProgress(Base, TimestampMixin):
    """Tracks individual student progress for a specific learning content item."""
    __tablename__ = "student_content_progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content_id = Column(
        String(36),
        ForeignKey("learning_contents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(20),
        default=ProgressStatus.NOT_STARTED.value,
        nullable=False,
        index=True,
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "content_id", name="uq_student_content_progress"),
        CheckConstraint(
            "status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')",
            name="check_content_progress_status",
        ),
    )

    # Relationships
    student = relationship("User", back_populates="content_progress")
    content = relationship("LearningContent", back_populates="progress_records")

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        """Validate progress status."""
        if isinstance(value, ProgressStatus):
            return value.value
        if value not in [s.value for s in ProgressStatus]:
            raise ValueError(f"Invalid progress status '{value}'. Allowed: {[s.value for s in ProgressStatus]}")
        return value

    def __repr__(self) -> str:
        return f"<StudentContentProgress(student='{self.student_id}', content='{self.content_id}', status='{self.status}')>"
