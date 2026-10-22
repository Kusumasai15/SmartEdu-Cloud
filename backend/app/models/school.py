"""Academic school model."""
from sqlalchemy import Boolean, Column, String, Text

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class School(Base, TimestampMixin):
    """Top-level academic unit containing departments."""

    __tablename__ = "schools"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    dean = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
