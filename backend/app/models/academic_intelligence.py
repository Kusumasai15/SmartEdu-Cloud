"""SQLAlchemy Models for Academic Intelligence, Risk Engine & Early-Warning System."""

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


class AcademicRiskLevel(str, enum.Enum):
    """Categorical risk severity level."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PerformanceTrendDirection(str, enum.Enum):
    """Academic trajectory over time."""
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"


class CourseHealthStatus(str, enum.Enum):
    """Overall health indicator for an active course offering."""
    HEALTHY = "HEALTHY"
    WATCH = "WATCH"
    AT_RISK = "AT_RISK"


class AcademicRiskSnapshot(Base, TimestampMixin):
    """Persisted snapshot of a student's derived academic performance profile and risk score."""
    __tablename__ = "academic_risk_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)

    risk_score = Column(Float, default=0.0, nullable=False)  # 0.0 - 100.0 (Higher = more risk)
    risk_level = Column(Enum(AcademicRiskLevel), default=AcademicRiskLevel.LOW, nullable=False)
    performance_trend = Column(Enum(PerformanceTrendDirection), default=PerformanceTrendDirection.STABLE, nullable=False)

    current_gpa = Column(Float, default=0.0, nullable=False)
    cumulative_gpa = Column(Float, default=0.0, nullable=False)
    attendance_percentage = Column(Float, default=100.0, nullable=False)
    assignment_completion_rate = Column(Float, default=100.0, nullable=False)
    exam_average_percentage = Column(Float, default=100.0, nullable=False)
    failed_courses_count = Column(Integer, default=0, nullable=False)

    primary_risk_factors = Column(Text, nullable=True)  # JSON or newline-delimited reason strings
    snapshot_date = Column(String(50), nullable=False)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    semester = relationship("Semester")

    __table_args__ = (
        Index("ix_risk_snapshots_student_date", "student_id", "snapshot_date"),
        Index("ix_risk_snapshots_level", "risk_level"),
    )


class RiskConfiguration(Base, TimestampMixin):
    """Configurable parameters and weights for the deterministic AcademicRiskEngine."""
    __tablename__ = "risk_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)

    # Component weights (must sum to 100%)
    attendance_weight = Column(Float, default=25.0, nullable=False)
    assignment_weight = Column(Float, default=20.0, nullable=False)
    exam_weight = Column(Float, default=30.0, nullable=False)
    trend_weight = Column(Float, default=25.0, nullable=False)

    # Thresholds
    attendance_critical_threshold = Column(Float, default=65.0, nullable=False)
    attendance_warning_threshold = Column(Float, default=75.0, nullable=False)
    gpa_critical_threshold = Column(Float, default=5.0, nullable=False)
    gpa_warning_threshold = Column(Float, default=6.5, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)


class InsightAlert(Base, TimestampMixin):
    """Early-warning alerts generated for students, faculty, or advisors."""
    __tablename__ = "insight_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # ATTENDANCE_RISK, GPA_DROP, MISSED_ASSIGNMENTS
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    dedup_key = Column(String(255), unique=True, nullable=False)  # e.g., "att_risk_userId_2026-09-01"
    is_read = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index("ix_insight_alerts_user_read", "user_id", "is_read"),
    )
