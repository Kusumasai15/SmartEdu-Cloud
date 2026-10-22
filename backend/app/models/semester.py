"""Semester Model."""
from sqlalchemy import Column, String, Boolean, Date, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Semester(Base, TimestampMixin):
    """Academic Semester / Term entity."""
    __tablename__ = "semesters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    academic_year = Column(String(20), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="check_semester_dates"),
        UniqueConstraint("name", "academic_year", name="uq_semester_name_year"),
    )

    # Relationships
    courses = relationship("Course", back_populates="semester", lazy="select")
    enrollments = relationship("Enrollment", back_populates="semester", lazy="select")

    def __repr__(self) -> str:
        return f"<Semester(name='{self.name}', academic_year='{self.academic_year}')>"
