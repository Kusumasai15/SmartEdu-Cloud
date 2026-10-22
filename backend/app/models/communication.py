"""SQLAlchemy Models for Advanced Communication, Notifications, Announcements & Messaging."""

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


# -------------------------------------------------------------
# ENUMS
# -------------------------------------------------------------
class NotificationCategory(str, enum.Enum):
    ACADEMIC = "ACADEMIC"
    ASSIGNMENT = "ASSIGNMENT"
    QUIZ = "QUIZ"
    EXAM = "EXAM"
    RESULT = "RESULT"
    ATTENDANCE = "ATTENDANCE"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    WORKFLOW = "WORKFLOW"
    SYSTEM = "SYSTEM"
    SECURITY = "SECURITY"
    AI_INSIGHT = "AI_INSIGHT"


class NotificationPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class NotificationStatus(str, enum.Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    ARCHIVED = "ARCHIVED"


class AnnouncementScope(str, enum.Enum):
    INSTITUTION = "INSTITUTION"
    DEPARTMENT = "DEPARTMENT"
    COURSE = "COURSE"
    INDIVIDUAL = "INDIVIDUAL"


class AnnouncementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    EXPIRED = "EXPIRED"
    ARCHIVED = "ARCHIVED"


class AnnouncementPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    IMPORTANT = "IMPORTANT"
    CRITICAL = "CRITICAL"


class ConversationType(str, enum.Enum):
    DIRECT = "DIRECT"
    COURSE_THREAD = "COURSE_THREAD"
    DEPARTMENT_THREAD = "DEPARTMENT_THREAD"
    ADVISING = "ADVISING"


# -------------------------------------------------------------
# NOTIFICATIONS & PREFERENCES
# -------------------------------------------------------------
class Notification(Base, TimestampMixin):
    """User-scoped notification event record."""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    category = Column(Enum(NotificationCategory), default=NotificationCategory.ACADEMIC, nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.UNREAD, nullable=False)

    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    source_type = Column(String(50), nullable=True)  # e.g., "ASSIGNMENT", "RESULT", "ATTENDANCE"
    source_id = Column(String(36), nullable=True)
    action_url = Column(String(255), nullable=True)
    dedup_key = Column(String(255), nullable=True, index=True)

    read_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id])

    __table_args__ = (
        Index("ix_notifications_recipient_status", "recipient_id", "status"),
        Index("ix_notifications_created_at", "created_at"),
    )


class NotificationPreference(Base, TimestampMixin):
    """User-configurable notification channel and category toggles."""
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    email_enabled = Column(Boolean, default=False, nullable=False)
    academic_alerts = Column(Boolean, default=True, nullable=False)
    assignment_reminders = Column(Boolean, default=True, nullable=False)
    exam_notifications = Column(Boolean, default=True, nullable=False)
    result_notifications = Column(Boolean, default=True, nullable=False)
    announcements_enabled = Column(Boolean, default=True, nullable=False)
    ai_insights_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# -------------------------------------------------------------
# ANNOUNCEMENTS & ACKNOWLEDGEMENTS
# -------------------------------------------------------------
class Announcement(Base, TimestampMixin):
    """Broadcast announcement scoped by institution, department, or course."""
    __tablename__ = "announcements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    scope_type = Column(Enum(AnnouncementScope), default=AnnouncementScope.COURSE, nullable=False)
    scope_id = Column(String(36), nullable=True)  # Course ID, Department ID, or NULL for institution

    priority = Column(Enum(AnnouncementPriority), default=AnnouncementPriority.NORMAL, nullable=False)
    status = Column(Enum(AnnouncementStatus), default=AnnouncementStatus.PUBLISHED, nullable=False)

    is_acknowledgement_required = Column(Boolean, default=False, nullable=False)
    publish_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    acknowledgements = relationship("AnnouncementAcknowledgement", back_populates="announcement", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_announcements_scope", "scope_type", "scope_id"),
        Index("ix_announcements_status", "status"),
    )


class AnnouncementAcknowledgement(Base, TimestampMixin):
    """Audit log verifying a user has formally acknowledged an important announcement."""
    __tablename__ = "announcement_acknowledgements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    announcement_id = Column(String(36), ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    announcement = relationship("Announcement", back_populates="acknowledgements")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("announcement_id", "user_id", name="uq_announcement_user_ack"),
    )


# -------------------------------------------------------------
# ACADEMIC MESSAGING & CONVERSATIONS
# -------------------------------------------------------------
class Conversation(Base, TimestampMixin):
    """Academic communication thread between authorized academic counterparts."""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=True)
    conversation_type = Column(Enum(ConversationType), default=ConversationType.DIRECT, nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    course = relationship("Course", foreign_keys=[course_id])
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("DirectMessage", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base, TimestampMixin):
    """Participant membership within an academic conversation thread."""
    __tablename__ = "conversation_participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_read_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
        Index("ix_conv_participants_user", "user_id"),
    )


class DirectMessage(Base, TimestampMixin):
    """Individual message record sent within an authorized academic conversation."""
    __tablename__ = "direct_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    body = Column(Text, nullable=False)
    is_edited = Column(Boolean, default=False, nullable=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])

    __table_args__ = (
        Index("ix_messages_conv_created", "conversation_id", "created_at"),
    )
