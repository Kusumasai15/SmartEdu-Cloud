"""FastAPI Authentication and Authorization Dependencies."""
from typing import Callable, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.auth.jwt import decode_token, verify_token_type, JWTError
from app.auth.service import get_user_permissions
from app.models import User, Role

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract, decode, and authenticate user from Bearer JWT access token."""
    if not auth_creds or not auth_creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_creds.credentials
    try:
        payload = decode_token(token)
        verify_token_type(payload, "access")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.department))
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_current_user(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optionally authenticate user from Bearer JWT access token without throwing 401."""
    if not auth_creds or not auth_creds.credentials:
        return None
    try:
        payload = decode_token(auth_creds.credentials)
        verify_token_type(payload, "access")
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            return None
        user = (
            db.query(User)
            .options(joinedload(User.role), joinedload(User.department))
            .filter(User.id == user_id)
            .first()
        )
        return user if user and user.is_active else None
    except Exception:
        return None


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure authenticated user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account.",
        )
    return current_user


def require_role(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory checking whether authenticated user holds one of the specified roles."""
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        user_role_name = current_user.role.name if current_user.role else ""
        if user_role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of the following roles: {list(allowed_roles)}.",
            )
        return current_user

    return role_checker


def require_permission(*required_permissions: str) -> Callable[[User, Session], User]:
    """Dependency factory verifying that the user's role has been granted all required permissions."""
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        user_permissions = set(get_user_permissions(db, current_user))
        missing_perms = [p for p in required_permissions if p not in user_permissions]
        
        if missing_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: user lacks required permissions: {missing_perms}.",
            )
        return current_user

    return permission_checker
