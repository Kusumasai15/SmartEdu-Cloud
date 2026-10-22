"""Admin User Management Router."""

from typing import List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

from app.core.database import get_db
from app.auth.dependencies import require_role
from app.core.security import hash_password
from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.administration.schemas import AdminUserItem, AdminUserDetail, AdminUserStatusUpdate
from app.administration.services import user_admin_service

router = APIRouter(prefix="/admin/users", tags=["Admin User Management"])


def _serialize_admin_user(user: User) -> AdminUserItem:
    return AdminUserItem(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        role_name=user.role.name if user.role else "STUDENT",
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        student_identifier=user.student_identifier,
        faculty_identifier=user.faculty_identifier,
        class_name=getattr(user, "class_name", None),
        academic_year=getattr(user, "academic_year", None),
        is_active=user.is_active,
        account_status="ACTIVE" if user.is_active else "INACTIVE",
        created_at=user.created_at,
        active_sessions_count=0,
    )


@router.get("", response_model=List[AdminUserItem])
def get_admin_users(
    search: Optional[str] = Query(None, description="Search term for name/email/ID"),
    role: Optional[str] = Query(None, description="Filter by role name"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    status: Optional[str] = Query(None, description="ACTIVE | INACTIVE | SUSPENDED"),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """List users across the university with server-side filtering and pagination."""
    items, _ = user_admin_service.list_users_paginated(
        db,
        search=search,
        role_name=role,
        department_id=department_id,
        status_filter=status,
        limit=limit,
        offset=offset,
    )
    return items


@router.post("", response_model=AdminUserItem, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Create a database-backed user from the administration console."""
    email = str(payload.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email is required.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.")

    password = str(payload.get("password") or "")
    if len(password) < 12:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A password of at least 12 characters is required.",
        )

    VALID_ROLES = {"STUDENT", "FACULTY", "HOD", "VC", "ADMINISTRATOR", "EXAMINATION"}
    role_name = str(payload.get("role") or payload.get("role_name") or "STUDENT").upper()
    if role_name not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role.")
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name, description=f"{role_name.title()} platform role", is_system_role=True)
        db.add(role)
        db.flush()

    department_name = str(payload.get("department") or payload.get("department_name") or "").strip()
    department = None
    if department_name:
        department = db.query(Department).filter(Department.name == department_name).first()
        if not department:
            code = "".join(w[0] for w in department_name.split() if w).upper()[:8] or "DEPT"
            department = Department(name=department_name, code=code, is_active=True)
            db.add(department)
            db.flush()

    identifier = str(payload.get("identifier") or payload.get("student_identifier") or payload.get("faculty_identifier") or "").strip()
    class_name = str(payload.get("class_name") or payload.get("className") or "").strip() or None
    academic_year = str(payload.get("academic_year") or payload.get("academicYear") or "").strip() or None
    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name=str(payload.get("first_name") or "").strip() or email.split("@")[0],
        last_name=str(payload.get("last_name") or "").strip(),
        role_id=role.id,
        department_id=department.id if department else None,
        student_identifier=identifier if role_name == "STUDENT" and identifier else None,
        faculty_identifier=identifier if role_name != "STUDENT" and identifier else None,
        class_name=class_name,
        academic_year=academic_year,
        phone=payload.get("phone"),
        is_active=bool(payload.get("is_active", True)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)


@router.patch("/{user_id}", response_model=AdminUserItem)
def update_admin_user(
    user_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Update user profile details from the administration console."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == current_user.id and payload.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot deactivate their own account.")

    for field in ["first_name", "last_name", "email", "phone"]:
        if field in payload and payload[field] is not None:
            setattr(user, field, str(payload[field]).strip())
    if "class_name" in payload:
        user.class_name = str(payload["class_name"]).strip() if payload["class_name"] else None
    elif "className" in payload:
        user.class_name = str(payload["className"]).strip() if payload["className"] else None

    if "academic_year" in payload:
        user.academic_year = str(payload["academic_year"]).strip() if payload["academic_year"] else None
    elif "academicYear" in payload:
        user.academic_year = str(payload["academicYear"]).strip() if payload["academicYear"] else None

    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])

    if payload.get("password"):
        pwd = str(payload["password"]).strip()
        if len(pwd) < 12:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A password of at least 12 characters is required.",
            )
        user.password_hash = hash_password(pwd)

    if payload.get("role"):
        VALID_ROLES = {"STUDENT", "FACULTY", "HOD", "VC", "ADMINISTRATOR", "EXAMINATION"}
        role_name = str(payload["role"]).upper()
        if role_name not in VALID_ROLES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role.")
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=f"{role_name.title()} platform role", is_system_role=True)
            db.add(role)
            db.flush()
        user.role_id = role.id

    if "department" in payload:
        name = str(payload["department"] or "").strip()
        if name and name != "Unassigned":
            department = db.query(Department).filter(
                or_(
                    Department.name.ilike(name),
                    Department.code.ilike(name),
                )
            ).first()
            if department:
                user.department_id = department.id
        elif name == "Unassigned":
            user.department_id = None

    for field in ("student_identifier", "faculty_identifier"):
        if field in payload:
            raw_val = str(payload[field]).strip() if payload[field] is not None else ""
            setattr(user, field, raw_val if raw_val else None)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or identifier already exists.") from exc
    db.refresh(user)
    return _serialize_admin_user(user)


@router.delete("/{user_id}", response_model=AdminUserItem)
def deactivate_admin_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Deactivate a user account without destroying audit-linked records."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user_admin_service.update_user_status(
        db, user_id, AdminUserStatusUpdate(is_active=False), current_user
    )


@router.get("/{user_id}", response_model=AdminUserDetail)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Retrieve full user profile with security and audit history."""
    return user_admin_service.get_user_admin_detail(db, user_id)


@router.patch("/{user_id}/status", response_model=AdminUserItem)
def update_user_account_status(
    user_id: str,
    payload: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Activate, deactivate, or suspend a user account with audit logging."""
    return user_admin_service.update_user_status(db, user_id, payload, current_user)
