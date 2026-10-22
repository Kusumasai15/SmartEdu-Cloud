"""Permission and RolePermission Models."""
from sqlalchemy import Column, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Permission(Base, TimestampMixin):
    """Permission entity defining discrete actions over system resources."""
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, index=True, nullable=False)
    resource = Column(String(50), index=True, nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)

    # Relationships
    role_permissions = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Permission(name='{self.name}', resource='{self.resource}', action='{self.action}')>"


class RolePermission(Base):
    """Association table mapping Roles to Permissions."""
    __tablename__ = "role_permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    role_id = Column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    permission_id = Column(
        String(36),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")

    def __repr__(self) -> str:
        return f"<RolePermission(role_id='{self.role_id}', permission_id='{self.permission_id}')>"
