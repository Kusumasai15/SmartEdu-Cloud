"""Service for User Administration, Account Status Governance, and Security Auditing."""

from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.models.token import RefreshToken
from app.models.administration import AdminActionType, SecurityEventSeverity
from app.administration.schemas import AdminUserItem, AdminUserDetail, AdminUserStatusUpdate
from app.administration.services.audit_service import log_admin_audit
from app.administration.services.security_service import log_security_event


def list_users_paginated(
    db: Session,
    search: Optional[str] = None,
    role_name: Optional[str] = None,
    department_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> Tuple[List[AdminUserItem], int]:
    """Search and filter users with server-side pagination."""
    query = db.query(User).join(Role, User.role_id == Role.id)

    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.email.ilike(s_term),
                User.first_name.ilike(s_term),
                User.last_name.ilike(s_term),
                User.student_identifier.ilike(s_term),
                User.faculty_identifier.ilike(s_term),
            )
        )

    if role_name:
        query = query.filter(Role.name == role_name.upper())

    if department_id:
        query = query.filter(User.department_id == department_id)

    if status_filter == "ACTIVE":
        query = query.filter(User.is_active == True)
    elif status_filter == "INACTIVE" or status_filter == "SUSPENDED":
        query = query.filter(User.is_active == False)

    total_count = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for u in users:
        active_sessions = db.query(func.count(RefreshToken.id)).filter(
            RefreshToken.user_id == u.id,
            RefreshToken.revoked == False,
        ).scalar() or 0

        acc_status = "ACTIVE" if u.is_active else "SUSPENDED"
        items.append(
            AdminUserItem(
                id=u.id,
                email=u.email,
                first_name=u.first_name,
                last_name=u.last_name,
                full_name=u.full_name,
                role_name=u.role.name if u.role else "USER",
                department_id=u.department_id,
                department_name=u.department.name if u.department else None,
                student_identifier=u.student_identifier,
                faculty_identifier=u.faculty_identifier,
                is_active=u.is_active,
                account_status=acc_status,
                created_at=u.created_at,
                active_sessions_count=active_sessions,
                class_name=getattr(u, "class_name", None),
                academic_year=getattr(u, "academic_year", None),
            )
        )

    return items, total_count


def get_user_admin_detail(db: Session, user_id: str) -> AdminUserDetail:
    """Retrieve full user profile with security and audit history."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    active_sessions = db.query(func.count(RefreshToken.id)).filter(
        RefreshToken.user_id == u.id,
        RefreshToken.revoked == False,
    ).scalar() or 0

    acc_status = "ACTIVE" if u.is_active else "SUSPENDED"
    return AdminUserDetail(
        id=u.id,
        email=u.email,
        first_name=u.first_name,
        last_name=u.last_name,
        full_name=u.full_name,
        role_name=u.role.name if u.role else "USER",
        department_id=u.department_id,
        department_name=u.department.name if u.department else None,
        student_identifier=u.student_identifier,
        faculty_identifier=u.faculty_identifier,
        is_active=u.is_active,
        account_status=acc_status,
        created_at=u.created_at,
        active_sessions_count=active_sessions,
        recent_security_events=[],
        recent_audit_actions=[],
    )


def update_user_status(
    db: Session,
    user_id: str,
    payload: AdminUserStatusUpdate,
    admin_user: User,
) -> AdminUserItem:
    """Activate, deactivate, or suspend a user account with audit logging."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if u.id == admin_user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    old_status = u.is_active
    u.is_active = payload.is_active
    db.commit()
    db.refresh(u)

    action_type = AdminActionType.USER_ACTIVATED if payload.is_active else AdminActionType.USER_SUSPENDED
    log_admin_audit(
        db,
        actor_user_id=admin_user.id,
        actor_role=admin_user.role.name,
        action=action_type,
        resource_type="USER",
        resource_id=u.id,
        scope=f"ROLE:{u.role.name}",
        details={
            "target_email": u.email,
            "previous_active": old_status,
            "new_active": u.is_active,
            "reason": payload.status_reason,
        },
    )

    log_security_event(
        db,
        event_type="USER_STATUS_CHANGED",
        severity=SecurityEventSeverity.MEDIUM if not payload.is_active else SecurityEventSeverity.INFO,
        user_id=u.id,
        details=f"Account status set to {'ACTIVE' if u.is_active else 'SUSPENDED'} by Admin {admin_user.email}",
    )

    return get_user_admin_detail(db, u.id)
