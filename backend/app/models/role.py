"""Role Model."""
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Role(Base, TimestampMixin):
    """System Role model representing user authorization groups."""
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_system_role = Column(Boolean, default=True, nullable=False)

    # Relationships
    users = relationship("User", back_populates="role", lazy="select")
    role_permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Role(name='{self.name}', id='{self.id}')>"
