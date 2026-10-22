"""Department Model."""
from sqlalchemy import Column, String, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Department(Base, TimestampMixin):
    """Academic Department entity within the institution."""
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    school = Column(String(150), nullable=True)
    head_of_department = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    cohorts = Column(JSON, nullable=True, default=list)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    users = relationship("User", back_populates="department", lazy="select")
    courses = relationship("Course", back_populates="department", lazy="select")

    def __repr__(self) -> str:
        return f"<Department(code='{self.code}', name='{self.name}')>"
