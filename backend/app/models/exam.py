"""Exam, ExamQuestion, and ProctoringPolicy Models."""
from enum import Enum
from sqlalchemy import Column, String, Text, Float, Boolean, Integer, ForeignKey, DateTime, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ExamType(str, Enum):
    """Classification of academic examination."""
    QUIZ = "QUIZ"
    MIDTERM = "MIDTERM"
    ENDTERM = "ENDTERM"
    PRACTICE = "PRACTICE"


class ProctoringMode(str, Enum):
    """Level of browser examination supervision."""
    NONE = "NONE"
    BASIC_PROCTORED = "BASIC_PROCTORED"
    STANDARD_PROCTORED = "STANDARD_PROCTORED"
    STRICT_PROCTORED = "STRICT_PROCTORED"


class Exam(Base, TimestampMixin):
    """Academic Examination entity."""
    __tablename__ = "exams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(
        String(36),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    exam_type = Column(
        String(20),
        default=ExamType.QUIZ.value,
        nullable=False,
        index=True,
    )
    duration_minutes = Column(Integer, default=60, nullable=False)
    total_marks = Column(Float, default=100.0, nullable=False)
    passing_marks = Column(Float, default=40.0, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    max_attempts = Column(Integer, default=1, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False, index=True)
    results_published = Column(Boolean, default=False, nullable=False)
    allow_review = Column(Boolean, default=True, nullable=False)
    randomize_questions = Column(Boolean, default=True, nullable=False)
    randomize_options = Column(Boolean, default=True, nullable=False)
    created_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "exam_type IN ('QUIZ', 'MIDTERM', 'ENDTERM', 'PRACTICE')",
            name="check_exam_type",
        ),
        CheckConstraint("duration_minutes > 0", name="check_exam_duration_positive"),
        CheckConstraint("total_marks > 0", name="check_exam_total_marks_positive"),
        CheckConstraint("passing_marks >= 0 AND passing_marks <= total_marks", name="check_exam_passing_marks"),
        CheckConstraint("max_attempts > 0", name="check_exam_max_attempts_positive"),
    )

    # Relationships
    course = relationship("Course", back_populates="exams")
    creator = relationship("User", foreign_keys=[created_by])
    questions = relationship(
        "ExamQuestion",
        back_populates="exam",
        cascade="all, delete-orphan",
        order_by="ExamQuestion.display_order",
    )
    proctoring_policy = relationship(
        "ProctoringPolicy",
        back_populates="exam",
        uselist=False,
        cascade="all, delete-orphan",
    )
    attempts = relationship(
        "ExamAttempt",
        back_populates="exam",
        cascade="all, delete-orphan",
    )

    @validates("exam_type")
    def validate_exam_type(self, key: str, value: str) -> str:
        if isinstance(value, ExamType):
            return value.value
        if value not in [t.value for t in ExamType]:
            raise ValueError(f"Invalid exam type '{value}'")
        return value

    @property
    def questions_count(self) -> int:
        return len(self.questions) if self.questions else 0

    def __repr__(self) -> str:
        return f"<Exam(id='{self.id}', title='{self.title}', course_id='{self.course_id}', type='{self.exam_type}')>"


class ExamQuestion(Base):
    """Ordered question association within an exam with custom point override."""
    __tablename__ = "exam_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    exam_id = Column(
        String(36),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id = Column(
        String(36),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    points_override = Column(Float, nullable=True)
    display_order = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_exam_question"),
    )

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    question = relationship("Question", back_populates="exam_associations")

    def __repr__(self) -> str:
        return f"<ExamQuestion(exam_id='{self.exam_id}', question_id='{self.question_id}', order={self.display_order})>"


class ProctoringPolicy(Base, TimestampMixin):
    """Configurable anti-cheating, proctoring, and browser security policy."""
    __tablename__ = "proctoring_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    exam_id = Column(
        String(36),
        ForeignKey("exams.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    proctoring_mode = Column(
        String(30),
        default=ProctoringMode.BASIC_PROCTORED.value,
        nullable=False,
    )
    fullscreen_required = Column(Boolean, default=True, nullable=False)
    camera_required = Column(Boolean, default=False, nullable=False)
    microphone_required = Column(Boolean, default=False, nullable=False)
    screen_share_required = Column(Boolean, default=False, nullable=False)
    tab_switch_detection = Column(Boolean, default=True, nullable=False)
    window_blur_detection = Column(Boolean, default=True, nullable=False)
    copy_paste_prevention = Column(Boolean, default=True, nullable=False)
    context_menu_disabled = Column(Boolean, default=True, nullable=False)
    keyboard_shortcut_detection = Column(Boolean, default=True, nullable=False)
    auto_submit_on_expiry = Column(Boolean, default=True, nullable=False)
    max_violations_warning = Column(Integer, default=5, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "proctoring_mode IN ('NONE', 'BASIC_PROCTORED', 'STANDARD_PROCTORED', 'STRICT_PROCTORED')",
            name="check_proctoring_mode",
        ),
    )

    # Relationships
    exam = relationship("Exam", back_populates="proctoring_policy")

    @validates("proctoring_mode")
    def validate_mode(self, key: str, value: str) -> str:
        if isinstance(value, ProctoringMode):
            return value.value
        if value not in [m.value for m in ProctoringMode]:
            raise ValueError(f"Invalid proctoring mode '{value}'")
        return value

    def __repr__(self) -> str:
        return f"<ProctoringPolicy(exam_id='{self.exam_id}', mode='{self.proctoring_mode}')>"
