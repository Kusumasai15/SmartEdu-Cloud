"""ProctoringEvent Model for Browser Security and Suspicious Activity Tracking."""
from enum import Enum
from sqlalchemy import Column, String, Text, Float, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class EventSeverity(str, Enum):
    """Violation severity levels."""
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProctoringEventType(str, Enum):
    """Taxonomy of detectable proctoring events and suspicious browser signals."""
    EXAM_STARTED = "EXAM_STARTED"
    EXAM_SUBMITTED = "EXAM_SUBMITTED"
    EXAM_EXPIRED = "EXAM_EXPIRED"
    
    FULLSCREEN_ENTER = "FULLSCREEN_ENTER"
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"
    
    TAB_SWITCH = "TAB_SWITCH"
    PAGE_HIDDEN = "PAGE_HIDDEN"
    PAGE_VISIBLE = "PAGE_VISIBLE"
    WINDOW_BLUR = "WINDOW_BLUR"
    WINDOW_FOCUS = "WINDOW_FOCUS"
    
    COPY_ATTEMPT = "COPY_ATTEMPT"
    PASTE_ATTEMPT = "PASTE_ATTEMPT"
    CUT_ATTEMPT = "CUT_ATTEMPT"
    CONTEXT_MENU_ATTEMPT = "CONTEXT_MENU_ATTEMPT"
    KEYBOARD_SHORTCUT = "KEYBOARD_SHORTCUT"
    
    CAMERA_PERMISSION_GRANTED = "CAMERA_PERMISSION_GRANTED"
    CAMERA_PERMISSION_DENIED = "CAMERA_PERMISSION_DENIED"
    CAMERA_DISCONNECTED = "CAMERA_DISCONNECTED"
    
    MIC_PERMISSION_GRANTED = "MIC_PERMISSION_GRANTED"
    MIC_PERMISSION_DENIED = "MIC_PERMISSION_DENIED"
    MIC_DISCONNECTED = "MIC_DISCONNECTED"
    
    SCREEN_SHARE_STARTED = "SCREEN_SHARE_STARTED"
    SCREEN_SHARE_STOPPED = "SCREEN_SHARE_STOPPED"
    
    NETWORK_DISCONNECTED = "NETWORK_DISCONNECTED"
    NETWORK_RECONNECTED = "NETWORK_RECONNECTED"


class ProctoringEvent(Base):
    """Logged security signal during an active examination session."""
    __tablename__ = "proctoring_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(
        String(36),
        ForeignKey("exam_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(
        String(20),
        default=EventSeverity.INFO.value,
        nullable=False,
        index=True,
    )
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    duration_seconds = Column(Float, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON payload for contextual details

    __table_args__ = (
        CheckConstraint(
            "severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            name="check_event_severity",
        ),
    )

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="proctoring_events")

    @validates("severity")
    def validate_severity(self, key: str, value: str) -> str:
        if isinstance(value, EventSeverity):
            return value.value
        if value not in [s.value for s in EventSeverity]:
            raise ValueError(f"Invalid severity '{value}'")
        return value

    def __repr__(self) -> str:
        return f"<ProctoringEvent(attempt_id='{self.attempt_id}', type='{self.event_type}', severity='{self.severity}')>"
