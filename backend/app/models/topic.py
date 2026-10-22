"""Topic Model."""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Topic(Base, TimestampMixin):
    """Specific learning concept or lecture topic within a Course Module."""
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    module_id = Column(
        String(36),
        ForeignKey("course_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("module_id", "display_order", name="uq_module_topic_order"),
    )

    # Relationships
    module = relationship("CourseModule", back_populates="topics")
    contents = relationship(
        "LearningContent",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="LearningContent.display_order",
    )

    def __repr__(self) -> str:
        return f"<Topic(title='{self.title}', order={self.display_order}, module_id='{self.module_id}')>"
