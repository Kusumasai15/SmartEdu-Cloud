"""Admin Audit Explorer Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.models.administration import AdminActionType
from app.administration.schemas import AdminAuditEventItem
from app.administration.services import audit_service

router = APIRouter(prefix="/admin/audit", tags=["Admin Audit Explorer"])


@router.get("", response_model=List[AdminAuditEventItem])
def get_audit_events(
    action: Optional[AdminActionType] = Query(None),
    resource_type: Optional[str] = Query(None),
    actor_role: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Query immutable administrative and security audit trail with server-side filters."""
    return audit_service.list_audit_events(
        db,
        action=action,
        resource_type=resource_type,
        actor_role=actor_role,
        limit=limit,
        offset=offset,
    )
