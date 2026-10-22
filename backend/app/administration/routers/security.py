"""Admin Security Center & Active Sessions Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.models.administration import SecurityEventSeverity
from app.administration.schemas import SecurityEventItem, ActiveSessionItem
from app.administration.services import security_service

router = APIRouter(prefix="/admin/security", tags=["Admin Security Center"])


@router.get("/events", response_model=List[SecurityEventItem])
def get_security_events(
    severity: Optional[SecurityEventSeverity] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Retrieve security incident logs and alerts."""
    return security_service.list_security_events(db, severity=severity, limit=limit, offset=offset)


@router.get("/sessions", response_model=List[ActiveSessionItem])
def get_active_sessions(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """List active user sessions across the university."""
    return security_service.list_active_sessions(db, limit=limit)


@router.post("/sessions/{session_id}/revoke", status_code=status.HTTP_200_OK)
def revoke_user_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Revoke an active refresh token session immediately."""
    security_service.revoke_session(db, session_id, current_user)
    return {"message": "Session successfully revoked."}
