"""Course and CourseInstructor Models."""
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Course(Base, TimestampMixin):
    """Academic Course entity."""
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_code = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    credits = Column(Integer, default=3, nullable=False)
    
    department_id = Column(
        String(36),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    semester_id = Column(
        String(36),
        ForeignKey("semesters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="courses", lazy="select")
    semester = relationship("Semester", back_populates="courses", lazy="select")
    modules = relationship(
        "CourseModule",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseModule.display_order",
        lazy="select",
    )
    enrollments = relationship(
        "Enrollment",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )
    instructors = relationship(
        "CourseInstructor",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )
    assignments = relationship(
        "Assignment",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )
    exams = relationship(
        "Exam",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )
    schedules = relationship(
        "ClassSchedule",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )
    attendance_sessions = relationship(
        "AttendanceSession",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )

    @property
    def title(self) -> str:
        return self.name

    def __repr__(self) -> str:
        return f"<Course(code='{self.course_code}', name='{self.name}')>"


class CourseInstructor(Base):
    """Association entity assigning Faculty members to Courses."""
    __tablename__ = "course_instructors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(
        String(36),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    faculty_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("course_id", "faculty_id", name="uq_course_faculty"),
    )

    # Relationships
    course = relationship("Course", back_populates="instructors")
    faculty = relationship("User", back_populates="course_assignments")

    def __repr__(self) -> str:
        return f"<CourseInstructor(course_id='{self.course_id}', faculty_id='{self.faculty_id}', primary={self.is_primary})>"
