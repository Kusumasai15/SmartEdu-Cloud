"""Service for Immutable Audit Event Logging and Exploration."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.administration import AdminAuditEvent, AdminActionType
from app.administration.schemas import AdminAuditEventItem


def log_admin_audit(
    db: Session,
    actor_user_id: Optional[str],
    actor_role: str,
    action: AdminActionType,
    resource_type: str,
    resource_id: Optional[str] = None,
    scope: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
) -> AdminAuditEvent:
    """Create an append-only, immutable administrative audit log record."""
    # Sanitize any passwords or tokens from details dict
    clean_details = {}
    if details:
        for k, v in details.items():
            if any(secret_word in k.lower() for secret_word in ["password", "token", "key", "secret"]):
                clean_details[k] = "[REDACTED]"
            else:
                clean_details[k] = v

    audit_entry = AdminAuditEvent(
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        scope=scope,
        details=clean_details,
        ip_address=ip_address,
        request_id=request_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry


def list_audit_events(
    db: Session,
    action: Optional[AdminActionType] = None,
    resource_type: Optional[str] = None,
    actor_role: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[AdminAuditEventItem]:
    """Retrieve filtered administrative audit events."""
    query = db.query(AdminAuditEvent)

    if action:
        query = query.filter(AdminAuditEvent.action == action)
    if resource_type:
        query = query.filter(AdminAuditEvent.resource_type == resource_type)
    if actor_role:
        query = query.filter(AdminAuditEvent.actor_role == actor_role)

    records = query.order_by(desc(AdminAuditEvent.created_at)).offset(offset).limit(limit).all()

    results = []
    for r in records:
        actor_name = r.actor.full_name if r.actor else "System Automated"
        results.append(
            AdminAuditEventItem(
                id=r.id,
                actor_user_id=r.actor_user_id,
                actor_name=actor_name,
                actor_role=r.actor_role,
                action=r.action,
                resource_type=r.resource_type,
                resource_id=r.resource_id,
                scope=r.scope,
                details=r.details,
                ip_address=r.ip_address,
                created_at=r.created_at,
            )
        )
    return results
