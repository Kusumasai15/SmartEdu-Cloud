"""Base Model Mixins and Shared Column Types."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


def generate_uuid() -> str:
    """Generate a standard UUIDv4 string."""
    return str(uuid.uuid4())


class TimestampMixin:
    """Mixin adding consistent created_at and updated_at datetime timestamps."""
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
