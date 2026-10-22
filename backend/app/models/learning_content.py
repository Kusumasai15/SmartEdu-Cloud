"""Learning Content Model."""
from enum import Enum
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ContentType(str, Enum):
    """Supported learning content & resource types."""
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"
    PDF = "PDF"
    PRESENTATION = "PRESENTATION"
    EXTERNAL_LINK = "EXTERNAL_LINK"
    TEXT_CONTENT = "TEXT_CONTENT"
    IMAGE = "IMAGE"
    EMBEDDED_CONTENT = "EMBEDDED_CONTENT"


class ContentStatus(str, Enum):
    """Lifecycle states for learning content."""
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class LearningContent(Base, TimestampMixin):
    """Learning resource attached to a specific topic within a Course Module."""
    __tablename__ = "learning_contents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    topic_id = Column(
        String(36),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(
        String(30),
        default=ContentType.TEXT_CONTENT.value,
        nullable=False,
        index=True,
    )
    content_url = Column(String(1000), nullable=True)
    text_content = Column(Text, nullable=True)
    thumbnail_url = Column(String(1000), nullable=True)
    display_order = Column(Integer, default=1, nullable=False)
    status = Column(
        String(20),
        default=ContentStatus.DRAFT.value,
        nullable=False,
        index=True,
    )
    is_required = Column(Boolean, default=True, nullable=False)
    created_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    published_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("topic_id", "display_order", name="uq_topic_content_order"),
        CheckConstraint(
            "content_type IN ('VIDEO', 'DOCUMENT', 'PDF', 'PRESENTATION', 'EXTERNAL_LINK', 'TEXT_CONTENT', 'IMAGE', 'EMBEDDED_CONTENT')",
            name="check_learning_content_type",
        ),
        CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
            name="check_learning_content_status",
        ),
    )

    # Relationships
    topic = relationship("Topic", back_populates="contents")
    creator = relationship("User", foreign_keys=[created_by])
    progress_records = relationship("StudentContentProgress", back_populates="content", cascade="all, delete-orphan")

    @validates("content_type")
    def validate_type(self, key: str, value: str) -> str:
        """Validate content type."""
        if isinstance(value, ContentType):
            return value.value
        if value not in [t.value for t in ContentType]:
            raise ValueError(f"Invalid content type '{value}'. Allowed: {[t.value for t in ContentType]}")
        return value

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        """Validate status."""
        if isinstance(value, ContentStatus):
            return value.value
        if value not in [s.value for s in ContentStatus]:
            raise ValueError(f"Invalid content status '{value}'. Allowed: {[s.value for s in ContentStatus]}")
        return value

    def __repr__(self) -> str:
        return f"<LearningContent(id='{self.id}', title='{self.title}', type='{self.content_type}', status='{self.status}')>"
