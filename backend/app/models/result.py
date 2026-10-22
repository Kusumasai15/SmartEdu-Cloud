"""SQLAlchemy Database Models for Academic Results, Gradebook, GPA & Transcripts."""

import enum
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    Enum,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ResultStatus(str, enum.Enum):
    """Lifecycle status of an academic result."""
    DRAFT = "DRAFT"
    CALCULATED = "CALCULATED"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    LOCKED = "LOCKED"


class AcademicStatus(str, enum.Enum):
    """Academic evaluation outcome."""
    PASS = "PASS"
    FAIL = "FAIL"
    INCOMPLETE = "INCOMPLETE"
    WITHHELD = "WITHHELD"
    ABSENT = "ABSENT"


class CorrectionRequestStatus(str, enum.Enum):
    """Status of a result correction review."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AssessmentComponentType(str, enum.Enum):
    """Assessment component categories."""
    ASSIGNMENT = "ASSIGNMENT"
    QUIZ = "QUIZ"
    MIDTERM = "MIDTERM"
    FINAL_EXAM = "FINAL_EXAM"
    PROJECT = "PROJECT"
    PRESENTATION = "PRESENTATION"
    LAB = "LAB"
    ATTENDANCE = "ATTENDANCE"
    OTHER = "OTHER"


class GradeScale(Base, TimestampMixin):
    """Institutional grade scale configuration."""
    __tablename__ = "grade_scales"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)

    # Relationships
    items = relationship("GradeScaleItem", back_populates="grade_scale", cascade="all, delete-orphan", order_by="desc(GradeScaleItem.grade_point)")


class GradeScaleItem(Base, TimestampMixin):
    """Individual letter grade and grade point threshold within a grade scale."""
    __tablename__ = "grade_scale_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    grade_scale_id = Column(String(36), ForeignKey("grade_scales.id", ondelete="CASCADE"), nullable=False)
    grade = Column(String(10), nullable=False)  # e.g., "A+", "A", "B+", "B", "C", "D", "F"
    minimum_percentage = Column(Float, nullable=False)  # e.g., 90.0
    maximum_percentage = Column(Float, nullable=False)  # e.g., 100.0
    grade_point = Column(Float, nullable=False)  # e.g., 10.0, 9.0, 8.0, 0.0
    is_passing = Column(Boolean, default=True, nullable=False)
    description = Column(String(100), nullable=True)  # e.g., "Outstanding", "Excellent", "Fail"

    # Relationships
    grade_scale = relationship("GradeScale", back_populates="items")

    __table_args__ = (
        UniqueConstraint("grade_scale_id", "grade", name="uq_grade_scale_item_grade"),
        Index("ix_grade_scale_items_scale_pct", "grade_scale_id", "minimum_percentage", "maximum_percentage"),
    )


class CourseAssessmentWeight(Base, TimestampMixin):
    """Configurable component weight distribution for a course offering."""
    __tablename__ = "course_assessment_weights"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    component_type = Column(Enum(AssessmentComponentType), nullable=False)
    weight_percentage = Column(Float, nullable=False)  # e.g., 20.0 (must sum to 100% per course/semester)
    minimum_passing_percentage = Column(Float, default=0.0, nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)

    # Relationships
    course = relationship("Course")
    semester = relationship("Semester")

    __table_args__ = (
        UniqueConstraint("course_id", "semester_id", "component_type", name="uq_course_semester_component_weight"),
        Index("ix_course_assessment_weights_course_sem", "course_id", "semester_id"),
    )


class CourseResult(Base, TimestampMixin):
    """Authoritative student result for a completed course."""
    __tablename__ = "course_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    
    final_percentage = Column(Float, default=0.0, nullable=False)
    letter_grade = Column(String(10), default="F", nullable=False)
    grade_point = Column(Float, default=0.0, nullable=False)
    credits_earned = Column(Integer, default=0, nullable=False)
    
    status = Column(Enum(ResultStatus), default=ResultStatus.DRAFT, nullable=False)
    academic_status = Column(Enum(AcademicStatus), default=AcademicStatus.FAIL, nullable=False)
    
    submitted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = Column(String(50), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(String(50), nullable=True)
    review_notes = Column(Text, nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course")
    semester = relationship("Semester")
    submitter = relationship("User", foreign_keys=[submitted_by])
    approver = relationship("User", foreign_keys=[approved_by])
    component_scores = relationship("ResultComponentScore", back_populates="course_result", cascade="all, delete-orphan")
    corrections = relationship("ResultCorrectionRequest", back_populates="course_result", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "semester_id", name="uq_student_course_semester_result"),
        Index("ix_course_results_student_sem", "student_id", "semester_id"),
        Index("ix_course_results_course_status", "course_id", "status"),
    )


class ResultComponentScore(Base, TimestampMixin):
    """Breakdown of individual assessment component contribution to a course result."""
    __tablename__ = "result_component_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    result_id = Column(String(36), ForeignKey("course_results.id", ondelete="CASCADE"), nullable=False)
    component_type = Column(Enum(AssessmentComponentType), nullable=False)
    
    raw_score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, default=100.0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=False)
    weight_percentage = Column(Float, default=0.0, nullable=False)
    weighted_score = Column(Float, default=0.0, nullable=False)
    
    is_missing = Column(Boolean, default=False, nullable=False)
    assessment_ref_id = Column(String(36), nullable=True)
    notes = Column(String(255), nullable=True)

    # Relationships
    course_result = relationship("CourseResult", back_populates="component_scores")

    __table_args__ = (
        Index("ix_result_components_result_type", "result_id", "component_type"),
    )


class ResultCorrectionRequest(Base, TimestampMixin):
    """Formal audit trail for modifying published or locked student results."""
    __tablename__ = "result_correction_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    result_id = Column(String(36), ForeignKey("course_results.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    
    original_grade = Column(String(10), nullable=False)
    original_percentage = Column(Float, nullable=False)
    requested_grade = Column(String(10), nullable=False)
    requested_percentage = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    
    requested_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    requested_at = Column(String(50), nullable=False)
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(String(50), nullable=True)
    
    status = Column(Enum(CorrectionRequestStatus), default=CorrectionRequestStatus.PENDING, nullable=False)
    review_notes = Column(Text, nullable=True)

    # Relationships
    course_result = relationship("CourseResult", back_populates="corrections")
    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course")
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        Index("ix_result_corrections_status_course", "status", "course_id"),
    )


class SemesterResult(Base, TimestampMixin):
    """Semester-level summary of academic performance, credits earned, and GPA."""
    __tablename__ = "semester_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    
    total_credits_registered = Column(Integer, default=0, nullable=False)
    total_credits_earned = Column(Integer, default=0, nullable=False)
    gpa = Column(Float, default=0.0, nullable=False)
    status = Column(String(30), default="FINALIZED", nullable=False)  # PROVISIONAL, FINALIZED, WITHHELD

    # Relationships
    student = relationship("User")
    semester = relationship("Semester")

    __table_args__ = (
        UniqueConstraint("student_id", "semester_id", name="uq_student_semester_result"),
        Index("ix_semester_results_student_sem", "student_id", "semester_id"),
    )
