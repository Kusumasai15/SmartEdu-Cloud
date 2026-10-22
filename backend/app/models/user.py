"""User Model."""
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship, validates
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class User(Base, TimestampMixin):
    """Institutional User model representing Students, Faculty, HODs, and Administrators."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    
    role_id = Column(
        String(36),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    department_id = Column(
        String(36),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    student_identifier = Column(String(50), unique=True, index=True, nullable=True)
    faculty_identifier = Column(String(50), unique=True, index=True, nullable=True)
    class_name = Column(String(150), nullable=True)
    academic_year = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    bio = Column(String(1000), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    skills = Column(String(4000), nullable=True)
    certifications = Column(String(8000), nullable=True)
    achievements = Column(String(8000), nullable=True)
    notification_preferences = Column(String(2000), nullable=True)
    github_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    website_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    role = relationship("Role", back_populates="users", lazy="select")
    department = relationship("Department", back_populates="users", lazy="select")
    enrollments = relationship("Enrollment", back_populates="student", lazy="select")
    course_assignments = relationship("CourseInstructor", back_populates="faculty", lazy="select")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan", lazy="select")
    content_progress = relationship("StudentContentProgress", back_populates="student", cascade="all, delete-orphan", lazy="select")
    submissions = relationship("AssignmentSubmission", foreign_keys="AssignmentSubmission.student_id", back_populates="student", cascade="all, delete-orphan", lazy="select")
    exam_attempts = relationship("ExamAttempt", foreign_keys="ExamAttempt.student_id", back_populates="student", cascade="all, delete-orphan", lazy="select")

    @validates("email")
    def validate_email(self, key: str, address: str) -> str:
        """Normalize email to lowercase and trim whitespace."""
        if not address:
            raise ValueError("Email address cannot be empty")
        return address.strip().lower()

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<User(email='{self.email}', role='{self.role_id}', active={self.is_active})>"
