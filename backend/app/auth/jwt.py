"""JWT Token Generation, Validation, and Payload Extraction."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
from app.core.config import settings


class JWTError(Exception):
    """Base exception for JWT validation failures."""
    pass


class TokenExpiredError(JWTError):
    """Raised when token exp claim has elapsed."""
    pass


class TokenInvalidError(JWTError):
    """Raised when token signature or payload structure is invalid."""
    pass


def create_access_token(
    user_id: str,
    role_name: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a short-lived signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "role": str(role_name),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None,
) -> Tuple[str, str, datetime]:
    """Generate a long-lived signed JWT refresh token.
    
    Returns:
        Tuple[token_string, jti, expires_at_datetime]
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    token_jti = str(uuid.uuid4())
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": token_jti,
    }

    token_str = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token_str, token_jti, expire


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and cryptographically verify a signed JWT token string."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "exp", "type", "iat"]},
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError("Token has expired.") from exc
    except (jwt.InvalidTokenError, jwt.DecodeError) as exc:
        raise TokenInvalidError("Invalid or tampered token signature.") from exc
    except Exception as exc:
        raise TokenInvalidError(f"Token decoding failed: {exc}") from exc


def verify_token_type(payload: Dict[str, Any], expected_type: str) -> None:
    """Ensure decoded token possesses the expected type ('access' or 'refresh')."""
    token_type = payload.get("type")
    if token_type != expected_type:
        raise TokenInvalidError(f"Invalid token type '{token_type}'. Expected '{expected_type}'.")
