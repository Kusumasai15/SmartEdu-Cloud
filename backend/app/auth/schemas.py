from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Payload for user credential login."""
    email: str = Field(..., description="Institutional email address")
    password: str = Field(..., min_length=1, description="Plaintext password")


class RegisterRequest(BaseModel):
    """Payload for creating a real institutional account."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    email: str = Field(..., description="Institutional email address")
    password: str = Field(..., min_length=6)
    role: Literal["STUDENT", "FACULTY", "HOD", "VC", "ADMINISTRATOR", "EXAMINATION"] = "STUDENT"
    department_name: Optional[str] = Field(default=None, max_length=150)
    department_code: Optional[str] = Field(default=None, max_length=20)
    identifier: Optional[str] = Field(default=None, max_length=50)


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing an expired access token."""
    refresh_token: str = Field(..., description="Valid issued refresh token string")


class TokenResponse(BaseModel):
    """JWT token pair and metadata returned upon successful authentication."""
    access_token: str = Field(..., description="Signed JWT access token")
    refresh_token: str = Field(..., description="Signed JWT refresh token")
    token_type: str = Field(default="bearer", description="Authorization header scheme")
    expires_in: int = Field(..., description="Access token lifetime in seconds")


class UserRoleResponse(BaseModel):
    """Role information container."""
    id: str
    name: str
    description: Optional[str] = None


class UserDepartmentResponse(BaseModel):
    """Department information container."""
    id: str
    name: str
    code: str


class UserProfileResponse(BaseModel):
    """Sanitized user profile response model."""
    id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: UserRoleResponse
    department: Optional[UserDepartmentResponse] = None
    student_identifier: Optional[str] = None
    faculty_identifier: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    achievements: Optional[str] = None
    notification_preferences: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    is_active: bool
    permissions: List[str] = Field(default_factory=list, description="List of granted permission names")


class UpdateProfileRequest(BaseModel):
    """Payload for updating user profile information."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    achievements: Optional[str] = None
    notification_preferences: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    """Payload for updating user account password."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


class ForgotPasswordRequest(BaseModel):
    """Payload to initiate password reset via email."""
    email: str = Field(..., description="Registered account email address")


class ResetPasswordRequest(BaseModel):
    """Payload to verify reset code or token and set a new password."""
    token: Optional[str] = Field(None, description="Password reset token from email link")
    otp: Optional[str] = Field(None, description="6-digit verification code from email")
    email: Optional[str] = Field(None, description="User email when using 6-digit code")
    new_password: str = Field(..., min_length=6, description="New account password")
