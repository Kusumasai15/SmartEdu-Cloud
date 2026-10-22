"""Service for Security Events, Active Session Monitoring & Revocation."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.user import User
from app.models.token import RefreshToken
from app.models.administration import SecurityEventLog, SecurityEventSeverity, AdminActionType
from app.administration.schemas import SecurityEventItem, ActiveSessionItem
from app.administration.services.audit_service import log_admin_audit


def log_security_event(
    db: Session,
    event_type: str,
    severity: SecurityEventSeverity,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[str] = None,
) -> SecurityEventLog:
    """Record a security event log entry."""
    entry = SecurityEventLog(
        event_type=event_type,
        severity=severity,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_security_events(
    db: Session,
    severity: Optional[SecurityEventSeverity] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[SecurityEventItem]:
    """Retrieve security event logs."""
    query = db.query(SecurityEventLog)
    if severity:
        query = query.filter(SecurityEventLog.severity == severity)

    records = query.order_by(desc(SecurityEventLog.created_at)).offset(offset).limit(limit).all()

    items = []
    for r in records:
        items.append(
            SecurityEventItem(
                id=r.id,
                event_type=r.event_type,
                severity=r.severity,
                user_id=r.user_id,
                user_email=r.user.email if r.user else None,
                ip_address=r.ip_address,
                user_agent=r.user_agent,
                details=r.details,
                created_at=r.created_at,
            )
        )
    return items


def list_active_sessions(db: Session, limit: int = 100) -> List[ActiveSessionItem]:
    """Query currently active sessions across all users from RefreshTokens."""
    now = datetime.now(timezone.utc)
    tokens = (
        db.query(RefreshToken)
        .filter(RefreshToken.revoked == False, RefreshToken.expires_at > now)
        .order_by(desc(RefreshToken.created_at))
        .limit(limit)
        .all()
    )

    sessions = []
    for t in tokens:
        u = t.user
        sessions.append(
            ActiveSessionItem(
                id=t.id,
                user_id=t.user_id,
                user_email=u.email if u else "Unknown",
                user_name=u.full_name if u else "Unknown",
                role_name=u.role.name if u and u.role else "USER",
                created_at=t.created_at,
                expires_at=t.expires_at,
                is_revoked=t.revoked,
            )
        )
    return sessions


def revoke_session(db: Session, session_id: str, admin_user: User) -> bool:
    """Revoke a specific active refresh token session."""
    token = db.query(RefreshToken).filter(RefreshToken.id == session_id).first()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    token.revoked = True
    db.commit()

    log_admin_audit(
        db,
        actor_user_id=admin_user.id,
        actor_role=admin_user.role.name,
        action=AdminActionType.SESSION_REVOKED,
        resource_type="SESSION",
        resource_id=token.id,
        scope=f"USER:{token.user_id}",
        details={"revoked_user_id": token.user_id},
    )

    log_security_event(
        db,
        event_type="SESSION_REVOKED",
        severity=SecurityEventSeverity.MEDIUM,
        user_id=token.user_id,
        details=f"Session revoked by Administrator {admin_user.email}",
    )

    return True
