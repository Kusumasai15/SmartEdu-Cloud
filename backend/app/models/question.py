"""Question and QuestionOption Models for the Academic Question Bank."""
from enum import Enum
from sqlalchemy import Column, String, Text, Float, Boolean, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship, validates
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class QuestionType(str, Enum):
    """Supported question formats."""
    MCQ_SINGLE = "MCQ_SINGLE"
    MCQ_MULTIPLE = "MCQ_MULTIPLE"
    TRUE_FALSE = "TRUE_FALSE"
    SHORT_ANSWER = "SHORT_ANSWER"


class DifficultyLevel(str, Enum):
    """Question cognitive difficulty level."""
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class Question(Base, TimestampMixin):
    """Individual assessment item in the university question bank."""
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(
        String(36),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_id = Column(
        String(36),
        ForeignKey("course_modules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    topic_id = Column(
        String(36),
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    question_type = Column(
        String(20),
        default=QuestionType.MCQ_SINGLE.value,
        nullable=False,
        index=True,
    )
    difficulty = Column(
        String(20),
        default=DifficultyLevel.MEDIUM.value,
        nullable=False,
        index=True,
    )
    question_text = Column(Text, nullable=False)
    points = Column(Float, default=1.0, nullable=False)
    negative_points = Column(Float, default=0.0, nullable=False)
    explanation = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "question_type IN ('MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER')",
            name="check_question_type",
        ),
        CheckConstraint(
            "difficulty IN ('EASY', 'MEDIUM', 'HARD')",
            name="check_question_difficulty",
        ),
        CheckConstraint("points > 0", name="check_question_points_positive"),
        CheckConstraint("negative_points >= 0", name="check_question_negative_points_non_negative"),
    )

    # Relationships
    course = relationship("Course")
    module = relationship("CourseModule")
    topic = relationship("Topic")
    creator = relationship("User", foreign_keys=[created_by])
    options = relationship(
        "QuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.display_order",
    )
    exam_associations = relationship(
        "ExamQuestion",
        back_populates="question",
        cascade="all, delete-orphan",
    )

    @validates("question_type")
    def validate_type(self, key: str, value: str) -> str:
        if isinstance(value, QuestionType):
            return value.value
        if value not in [t.value for t in QuestionType]:
            raise ValueError(f"Invalid question type '{value}'")
        return value

    @validates("difficulty")
    def validate_difficulty(self, key: str, value: str) -> str:
        if isinstance(value, DifficultyLevel):
            return value.value
        if value not in [d.value for d in DifficultyLevel]:
            raise ValueError(f"Invalid difficulty '{value}'")
        return value

    def __repr__(self) -> str:
        return f"<Question(id='{self.id}', type='{self.question_type}', difficulty='{self.difficulty}')>"


class QuestionOption(Base):
    """Answer choice for multiple choice or true/false questions."""
    __tablename__ = "question_options"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_id = Column(
        String(36),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=1, nullable=False)

    # Relationships
    question = relationship("Question", back_populates="options")

    def __repr__(self) -> str:
        return f"<QuestionOption(id='{self.id}', question_id='{self.question_id}', is_correct={self.is_correct})>"
