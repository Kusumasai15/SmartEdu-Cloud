"""Course Module Model."""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class CourseModule(Base, TimestampMixin):
    """Course Module representing a major unit/syllabus section of a Course."""
    __tablename__ = "course_modules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(
        String(36),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "display_order", name="uq_course_module_order"),
    )

    # Relationships
    course = relationship("Course", back_populates="modules")
    topics = relationship(
        "Topic",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Topic.display_order",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<CourseModule(title='{self.title}', order={self.display_order}, course_id='{self.course_id}')>"
