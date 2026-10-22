import json
import logging
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.email import send_password_reset_email
from app.core.redis import get_redis_client
from app.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserProfileResponse,
    UserRoleResponse,
    UserDepartmentResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.auth.service import (
    authenticate_user,
    create_user_tokens,
    refresh_user_tokens,
    revoke_refresh_token,
    get_user_permissions,
)
from app.auth.dependencies import get_current_active_user, require_role
from app.auth.jwt import TokenInvalidError, TokenExpiredError
from app.core.security import verify_password, hash_password
from app.models import Department, Permission, RefreshToken, Role, RolePermission, User

logger = logging.getLogger("smartedu.auth")
_in_memory_reset_store = {}

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

ROLE_PERMISSION_NAMES = {
    "ADMINISTRATOR": [
        "user:view", "user:create", "user:update", "user:delete", "role:manage", "system:config",
        "department:view", "department:create", "department:update", "course:view", "course:create",
        "course:update", "course:delete", "module:view", "module:create", "module:update",
        "module:delete", "topic:view", "topic:create", "topic:update", "topic:delete",
        "enrollment:view", "enrollment:create", "enrollment:delete", "analytics:institution:view",
        "analytics:department:view", "analytics:faculty:view", "analytics:student:view",
        "reports:institution:view", "reports:academic:view", "approvals:academic:view",
        "approvals:academic:approve",
    ],
    "VC": [
        "user:view", "department:view", "course:view", "module:view", "topic:view",
        "enrollment:view", "analytics:institution:view", "analytics:department:view",
        "analytics:faculty:view", "analytics:student:view", "reports:institution:view",
        "reports:academic:view", "approvals:academic:view", "approvals:academic:approve",
    ],
    "HOD": [
        "user:view", "department:view", "department:update", "course:view", "course:create",
        "course:update", "module:view", "module:create", "module:update", "topic:view",
        "topic:create", "topic:update", "enrollment:view", "enrollment:create",
        "analytics:department:view", "analytics:student:view", "reports:academic:view",
    ],
    "FACULTY": [
        "user:view", "department:view", "course:view", "course:update", "module:view",
        "module:create", "module:update", "module:delete", "topic:view", "topic:create",
        "topic:update", "topic:delete", "enrollment:view", "analytics:student:view",
    ],
    "STUDENT": ["course:view", "module:view", "topic:view", "enrollment:view"],
    "EXAMINATION": [
        "user:view", "department:view", "course:view", "module:view", "topic:view",
        "enrollment:view", "reports:academic:view", "approvals:academic:view",
        "approvals:academic:approve",
    ],
}


def ensure_role_permissions(db: Session, role: Role) -> None:
    """Attach baseline permissions for first-run production roles."""
    for permission_name in ROLE_PERMISSION_NAMES.get(role.name, []):
        permission = db.query(Permission).filter(Permission.name == permission_name).first()
        if not permission:
            resource, action = permission_name.split(":", 1)
            permission = Permission(
                name=permission_name,
                resource=resource,
                action=action,
                description=f"Allow {permission_name}",
            )
            db.add(permission)
            db.flush()
        exists = db.query(RolePermission).filter(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == permission.id,
        ).first()
        if not exists:
            db.add(RolePermission(role_id=role.id, permission_id=permission.id))


def build_profile_response(db: Session, user: User) -> UserProfileResponse:
    """Return the standard sanitized user profile for auth responses."""
    permissions = get_user_permissions(db, user)
    role_data = UserRoleResponse(
        id=user.role.id,
        name=user.role.name,
        description=user.role.description,
    ) if user.role else None

    department_data = UserDepartmentResponse(
        id=user.department.id,
        name=user.department.name,
        code=user.department.code,
    ) if user.department else None

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        role=role_data,
        department=department_data,
        student_identifier=user.student_identifier,
        faculty_identifier=user.faculty_identifier,
        phone=getattr(user, "phone", None),
        bio=getattr(user, "bio", None),
        avatar_url=getattr(user, "avatar_url", None),
        skills=getattr(user, "skills", None),
        certifications=getattr(user, "certifications", None),
        achievements=getattr(user, "achievements", None),
        notification_preferences=getattr(user, "notification_preferences", None),
        github_url=getattr(user, "github_url", None),
        linkedin_url=getattr(user, "linkedin_url", None),
        website_url=getattr(user, "website_url", None),
        is_active=user.is_active,
        permissions=permissions,
    )


@router.post(
    "/login",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="User Authentication",
    description="Authenticate user with email and password to receive JWT token pair.",
)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate institutional credentials and issue access/refresh tokens."""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tokens = create_user_tokens(db, user)
    return {
        "success": True,
        "message": "Authentication successful.",
        "data": tokens.model_dump(),
    }


@router.post(
    "/register",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create Institutional Account",
    description="Administrator-only account provisioning.",
)
async def register_account(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Create a production account instead of relying on client-side demo users."""
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    role = db.query(Role).filter(Role.name == payload.role).first()
    if not role:
        role = Role(
            name=payload.role,
            description=f"{payload.role.title()} platform role",
            is_system_role=True,
        )
        db.add(role)
        db.flush()
    ensure_role_permissions(db, role)

    department = None
    if payload.department_name or payload.department_code:
        code = (payload.department_code or "").strip().upper()
        if not code and payload.department_name:
            words = [w[0] for w in payload.department_name.split() if w and w[0].isalnum()]
            code = "".join(words[:4]).upper() or "DEPT"

        department = db.query(Department).filter(Department.code == code).first()
        if not department and payload.department_name:
            department = db.query(Department).filter(Department.name == payload.department_name.strip()).first()
        if not department:
            department = Department(
                name=(payload.department_name or code).strip(),
                code=code,
                description=None,
                is_active=True,
            )
            db.add(department)
            db.flush()

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        role_id=role.id,
        department_id=department.id if department else None,
        student_identifier=payload.identifier.strip() if payload.role == "STUDENT" and payload.identifier else None,
        faculty_identifier=payload.identifier.strip() if payload.role != "STUDENT" and payload.identifier else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    tokens = create_user_tokens(db, user)
    profile = build_profile_response(db, user)
    return {
        "success": True,
        "message": "Account created successfully.",
        "data": {
            "tokens": tokens.model_dump(),
            "user": profile.model_dump(),
        },
    }


@router.post(
    "/signup",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Public User Self-Registration",
    description="Allows students and faculty members to register an institutional portal account.",
)
async def signup_account(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Self-service registration endpoint for new users."""
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in or reset your password.",
        )

    # Restrict self-registration roles to STUDENT or FACULTY for security
    allowed_roles = ["STUDENT", "FACULTY"]
    chosen_role = payload.role if payload.role in allowed_roles else "STUDENT"

    role = db.query(Role).filter(Role.name == chosen_role).first()
    if not role:
        role = Role(
            name=chosen_role,
            description=f"{chosen_role.title()} platform role",
            is_system_role=True,
        )
        db.add(role)
        db.flush()
    ensure_role_permissions(db, role)

    department = None
    if payload.department_name or payload.department_code:
        code = (payload.department_code or "").strip().upper()
        if not code and payload.department_name:
            words = [w[0] for w in payload.department_name.split() if w and w[0].isalnum()]
            code = "".join(words[:4]).upper() or "DEPT"

        department = db.query(Department).filter(Department.code == code).first()
        if not department and payload.department_name:
            department = db.query(Department).filter(Department.name == payload.department_name.strip()).first()
        if not department:
            department = Department(
                name=(payload.department_name or code).strip(),
                code=code,
                description=None,
                is_active=True,
            )
            db.add(department)
            db.flush()

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        role_id=role.id,
        department_id=department.id if department else None,
        student_identifier=payload.identifier.strip() if chosen_role == "STUDENT" and payload.identifier else None,
        faculty_identifier=payload.identifier.strip() if chosen_role != "STUDENT" and payload.identifier else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    tokens = create_user_tokens(db, user)
    profile = build_profile_response(db, user)
    return {
        "success": True,
        "message": "Account created successfully. Welcome to UniFlow LMS!",
        "data": {
            "tokens": tokens.model_dump(),
            "user": profile.model_dump(),
        },
    }


@router.post(
    "/refresh",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Refresh Access Token",
    description="Exchange a valid refresh token for a newly signed access token.",
)
async def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Issue renewed access token using active refresh token."""
    try:
        tokens = refresh_user_tokens(db, payload.refresh_token)
        return {
            "success": True,
            "message": "Access token refreshed successfully.",
            "data": tokens.model_dump(),
        }
    except (TokenInvalidError, TokenExpiredError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "/logout",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="User Logout",
    description="Revoke the provided refresh token session.",
)
async def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Revoke user refresh token session."""
    revoke_refresh_token(db, payload.refresh_token)
    return {
        "success": True,
        "message": "Successfully logged out. Refresh token revoked.",
    }


@router.get(
    "/me",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Current User Profile",
    description="Retrieve authenticated user profile, assigned role, department, and granted permissions.",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return authenticated user profile and permissions."""
    profile = build_profile_response(db, current_user)

    return {
        "success": True,
        "data": profile.model_dump(),
    }


@router.put(
    "/me",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Update Current User Profile",
    description="Update authenticated user profile information including skills, certifications, and contact details.",
)
async def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Persist updated user profile fields to backend database."""
    if payload.first_name is not None:
        current_user.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        current_user.last_name = payload.last_name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.skills is not None:
        current_user.skills = payload.skills
    if payload.certifications is not None:
        current_user.certifications = payload.certifications
    if payload.achievements is not None:
        current_user.achievements = payload.achievements
    if payload.notification_preferences is not None:
        current_user.notification_preferences = payload.notification_preferences
    if payload.github_url is not None:
        current_user.github_url = payload.github_url.strip()
    if payload.linkedin_url is not None:
        current_user.linkedin_url = payload.linkedin_url.strip()
    if payload.website_url is not None:
        current_user.website_url = payload.website_url.strip()

    db.commit()
    db.refresh(current_user)

    permissions = get_user_permissions(db, current_user)
    role_data = UserRoleResponse(
        id=current_user.role.id,
        name=current_user.role.name,
        description=current_user.role.description,
    ) if current_user.role else None

    department_data = UserDepartmentResponse(
        id=current_user.department.id,
        name=current_user.department.name,
        code=current_user.department.code,
    ) if current_user.department else None

    profile = UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        full_name=current_user.full_name,
        role=role_data,
        department=department_data,
        student_identifier=current_user.student_identifier,
        faculty_identifier=current_user.faculty_identifier,
        phone=getattr(current_user, "phone", None),
        bio=getattr(current_user, "bio", None),
        avatar_url=getattr(current_user, "avatar_url", None),
        skills=getattr(current_user, "skills", None),
        certifications=getattr(current_user, "certifications", None),
        achievements=getattr(current_user, "achievements", None),
        notification_preferences=getattr(current_user, "notification_preferences", None),
        github_url=getattr(current_user, "github_url", None),
        linkedin_url=getattr(current_user, "linkedin_url", None),
        website_url=getattr(current_user, "website_url", None),
        is_active=current_user.is_active,
        permissions=permissions,
    )

    return {
        "success": True,
        "message": "User profile updated successfully.",
        "data": profile.model_dump(),
    }


@router.post(
    "/change-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Change User Password",
    description="Verify current password and set a new secure password hash.",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Verify current password and update with new hash."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {
        "success": True,
        "message": "Password changed successfully.",
    }


@router.post(
    "/forgot-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Request Password Reset",
    description="Initiate password reset via institutional email with secure OTP and token link.",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Generate reset token/OTP and dispatch email."""
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean, User.is_active == True).first()

    # Always return a generic success message to prevent user enumeration
    generic_response = {
        "success": True,
        "message": "If an active account exists for this email, password reset instructions and a verification code have been dispatched.",
    }

    if not user:
        logger.info("[FORGOT_PASSWORD] Requested for non-existent or inactive email: %s", email_clean)
        return generic_response

    # Generate 32-character crypto token and 6-digit numeric OTP
    reset_token = secrets.token_urlsafe(32)
    reset_otp = f"{secrets.randbelow(900000) + 100000}"

    r = get_redis_client()
    payload_data = {
        "user_id": user.id,
        "email": user.email,
        "otp": reset_otp,
        "token": reset_token,
    }

    if r:
        try:
            r.setex(f"pwd_reset_tok:{reset_token}", 900, user.id)
            r.setex(f"pwd_reset_otp:{user.email.lower()}", 900, json.dumps(payload_data))
        except Exception as e:
            logger.warning("[FORGOT_PASSWORD] Redis setex failed: %s; falling back to memory store", e)
            _in_memory_reset_store[f"tok:{reset_token}"] = (user.id, datetime.now(timezone.utc).timestamp() + 900)
            _in_memory_reset_store[f"otp:{user.email.lower()}"] = (payload_data, datetime.now(timezone.utc).timestamp() + 900)
    else:
        _in_memory_reset_store[f"tok:{reset_token}"] = (user.id, datetime.now(timezone.utc).timestamp() + 900)
        _in_memory_reset_store[f"otp:{user.email.lower()}"] = (payload_data, datetime.now(timezone.utc).timestamp() + 900)

    # Dispatch email
    user_name = f"{user.first_name} {user.last_name}".strip() or "User"
    email_sent = send_password_reset_email(user.email, user_name, reset_token, reset_otp)
    logger.info("[FORGOT_PASSWORD] Password reset dispatched for %s (Email sent: %s)", user.email, email_sent)

    return generic_response


@router.post(
    "/reset-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Reset User Password",
    description="Verify token or OTP code and set new password.",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Verify reset credentials and update password."""
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters.",
        )

    user_id = None
    r = get_redis_client()
    token_used = None
    email_used = None

    # Option A: Verification by direct URL token
    if payload.token:
        token_used = payload.token.strip()
        if r:
            try:
                user_id = r.get(f"pwd_reset_tok:{token_used}")
            except Exception:
                pass
        if not user_id:
            entry = _in_memory_reset_store.get(f"tok:{token_used}")
            if entry and entry[1] > datetime.now(timezone.utc).timestamp():
                user_id = entry[0]

    # Option B: Verification by 6-digit OTP code + email
    if not user_id and payload.otp and payload.email:
        email_clean = payload.email.strip().lower()
        email_used = email_clean
        otp_clean = payload.otp.strip()
        raw_data = None
        if r:
            try:
                raw_data = r.get(f"pwd_reset_otp:{email_clean}")
            except Exception:
                pass
        if raw_data:
            try:
                stored = json.loads(raw_data)
                if stored.get("otp") == otp_clean:
                    user_id = stored.get("user_id")
                    token_used = stored.get("token")
            except Exception:
                pass
        else:
            entry = _in_memory_reset_store.get(f"otp:{email_clean}")
            if entry and entry[1] > datetime.now(timezone.utc).timestamp():
                stored = entry[0]
                if stored.get("otp") == otp_clean:
                    user_id = stored.get("user_id")
                    token_used = stored.get("token")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or incorrect verification code / reset token.",
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this token not found.",
        )

    # Update password hash
    user.password_hash = hash_password(payload.new_password)
    db.commit()

    # Clean up tokens
    if r:
        try:
            if token_used:
                r.delete(f"pwd_reset_tok:{token_used}")
            if email_used or user.email:
                r.delete(f"pwd_reset_otp:{(email_used or user.email).lower()}")
        except Exception:
            pass
    if token_used:
        _in_memory_reset_store.pop(f"tok:{token_used}", None)
    if user.email:
        _in_memory_reset_store.pop(f"otp:{user.email.lower()}", None)

    # Invalidate all existing refresh tokens
    try:
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
        db.commit()
    except Exception:
        pass

    logger.info("[RESET_PASSWORD] Password successfully updated for %s", user.email)
    return {
        "success": True,
        "message": "Password has been successfully reset. You may now sign in with your new password.",
    }
