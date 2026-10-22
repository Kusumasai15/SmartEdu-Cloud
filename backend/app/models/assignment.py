"""Assignment Model."""
from enum import Enum
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class AssignmentStatus(str, Enum):
    """Lifecycle states for academic coursework assignments."""
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class Assignment(Base, TimestampMixin):
    """Coursework Assignment created by faculty for an assigned course."""
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(
        String(36),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_id = Column(
        String(36),
        ForeignKey("course_modules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    attachment_url = Column(String(1000), nullable=True)
    max_points = Column(Integer, default=100, nullable=False)
    passing_points = Column(Integer, default=40, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    allow_late_submission = Column(Boolean, default=False, nullable=False)
    status = Column(
        String(20),
        default=AssignmentStatus.DRAFT.value,
        nullable=False,
        index=True,
    )
    results_published = Column(Boolean, default=False, nullable=False)
    created_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')",
            name="check_assignment_status",
        ),
        CheckConstraint("max_points > 0", name="check_assignment_max_points_positive"),
        CheckConstraint("passing_points >= 0 AND passing_points <= max_points", name="check_assignment_passing_points"),
    )

    # Relationships
    course = relationship("Course", back_populates="assignments")
    module = relationship("CourseModule")
    creator = relationship("User", foreign_keys=[created_by])
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        if isinstance(value, AssignmentStatus):
            return value.value
        if value not in [s.value for s in AssignmentStatus]:
            raise ValueError(f"Invalid assignment status '{value}'. Allowed: {[s.value for s in AssignmentStatus]}")
        return value

    def __repr__(self) -> str:
        return f"<Assignment(id='{self.id}', title='{self.title}', course_id='{self.course_id}', status='{self.status}')>"
