"""SQLAlchemy Models for Administration, Governance, Security & Audit Engine."""

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
    Index,
    JSON,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


# -------------------------------------------------------------
# ENUMS
# -------------------------------------------------------------
class AdminActionType(str, enum.Enum):
    USER_ACTIVATED = "USER_ACTIVATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_SUSPENDED = "USER_SUSPENDED"
    USER_RESTORED = "USER_RESTORED"
    USER_LOCKED = "USER_LOCKED"
    USER_UNLOCKED = "USER_UNLOCKED"
    ROLE_CHANGED = "ROLE_CHANGED"
    DEPARTMENT_CREATED = "DEPARTMENT_CREATED"
    DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED"
    COURSE_CREATED = "COURSE_CREATED"
    COURSE_UPDATED = "COURSE_UPDATED"
    FACULTY_ASSIGNED = "FACULTY_ASSIGNED"
    FACULTY_REMOVED = "FACULTY_REMOVED"
    SEMESTER_CONFIGURED = "SEMESTER_CONFIGURED"
    POLICY_CREATED = "POLICY_CREATED"
    POLICY_UPDATED = "POLICY_UPDATED"
    POLICY_VERSIONED = "POLICY_VERSIONED"
    SESSION_REVOKED = "SESSION_REVOKED"
    SECURITY_CONFIG_CHANGED = "SECURITY_CONFIG_CHANGED"
    AI_CONFIG_CHANGED = "AI_CONFIG_CHANGED"


class SecurityEventSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PolicyCategory(str, enum.Enum):
    ATTENDANCE = "ATTENDANCE"
    EXAMINATION = "EXAMINATION"
    GRADING = "GRADING"
    AI_GOVERNANCE = "AI_GOVERNANCE"
    SECURITY = "SECURITY"
    NOTIFICATIONS = "NOTIFICATIONS"
    GENERAL = "GENERAL"


class PolicyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    ARCHIVED = "ARCHIVED"


# -------------------------------------------------------------
# MODELS
# -------------------------------------------------------------
class AdminAuditEvent(Base):
    """Immutable audit trail of all platform-level administrative and security actions."""
    __tablename__ = "admin_audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_role = Column(String(50), nullable=False)
    action = Column(Enum(AdminActionType), nullable=False, index=True)

    resource_type = Column(String(50), nullable=False, index=True)  # e.g., "USER", "COURSE", "POLICY"
    resource_id = Column(String(36), nullable=True, index=True)
    scope = Column(String(100), nullable=True)  # e.g. "DEPARTMENT:CS", "INSTITUTION"

    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    request_id = Column(String(36), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    actor = relationship("User", foreign_keys=[actor_user_id])

    __table_args__ = (
        Index("ix_admin_audit_action_time", "action", "created_at"),
        Index("ix_admin_audit_res_time", "resource_type", "created_at"),
    )


class SecurityEventLog(Base):
    """Security incidents, failed logins, account lockouts, and session revocations."""
    __tablename__ = "security_event_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(50), nullable=False, index=True)  # e.g., "LOGIN_FAILED", "ACCOUNT_LOCKED", "SESSION_REVOKED"
    severity = Column(Enum(SecurityEventSeverity), default=SecurityEventSeverity.INFO, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("ix_sec_event_time_sev", "created_at", "severity"),
    )


class SystemPolicy(Base, TimestampMixin):
    """Versioned institutional policies governing attendance, exams, grading, and AI rules."""
    __tablename__ = "system_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, index=True, nullable=False)  # e.g. "POLICY_MINIMUM_ATTENDANCE"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(PolicyCategory), default=PolicyCategory.GENERAL, nullable=False, index=True)

    current_version = Column(String(20), default="1.0.0", nullable=False)
    policy_value = Column(JSON, nullable=False)
    status = Column(Enum(PolicyStatus), default=PolicyStatus.ACTIVE, nullable=False, index=True)

    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    effective_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    versions = relationship("PolicyVersionHistory", back_populates="policy", cascade="all, delete-orphan", order_by="desc(PolicyVersionHistory.created_at)")


class PolicyVersionHistory(Base):
    """Historical snapshots of institutional policy revisions."""
    __tablename__ = "policy_version_histories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    policy_id = Column(String(36), ForeignKey("system_policies.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    policy_value = Column(JSON, nullable=False)
    change_reason = Column(Text, nullable=True)

    changed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    policy = relationship("SystemPolicy", back_populates="versions")
    author = relationship("User", foreign_keys=[changed_by])


class SystemConfiguration(Base, TimestampMixin):
    """Global platform configuration parameters."""
    __tablename__ = "system_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    config_key = Column(String(100), unique=True, index=True, nullable=False)
    config_value = Column(JSON, nullable=False)
    is_sensitive = Column(Boolean, default=False, nullable=False)
    description = Column(String(255), nullable=True)
