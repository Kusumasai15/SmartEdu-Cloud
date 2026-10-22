"""Application Configuration Module using Pydantic Settings."""
import os
import secrets
import logging
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("smartedu.config")


class Settings(BaseSettings):
    """Application Settings Schema and Environment loader."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General App Config
    APP_NAME: str = "SmartEdu Cloud"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    REQUIRE_REDIS: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    API_V1_STR: str = "/api/v1"
    PUBLIC_API_DOCS: bool = False
    ALLOWED_HOSTS: Union[str, List[str]] = ["localhost", "127.0.0.1", "testserver"]
    SECRET_KEY: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:9000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:9000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).rstrip("/") for i in v]
        return [
            "http://localhost:3000",
            "http://localhost:9000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:9000",
        ]

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return ["localhost", "127.0.0.1", "testserver"]

    # Database Configuration (PostgreSQL / SQLite fallback)
    DATABASE_URL: str = "sqlite:///./smartedu_dev.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE_SECONDS: int = 1800

    # AWS object storage. Credentials should come from the ECS/EC2 task role.
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = ""
    AWS_CLOUDFRONT_URL: str = ""
    AWS_UPLOAD_URL_EXPIRE_SECONDS: int = 300
    AWS_MAX_UPLOAD_BYTES: int = 25 * 1024 * 1024

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if not v:
            return "sqlite:///./smartedu_dev.db"
        # Render PostgreSQL compatibility (postgres:// -> postgresql://)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    AUTH_RATE_LIMIT_ENABLED: bool = False
    LOGIN_RATE_LIMIT_ATTEMPTS: int = 150
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 60

    # AI Configuration (Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL: str = "text-embedding-004"

    # SMTP Email Configuration for Password Reset & System Alerts
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "screenerpro.ai@gmail.com"
    SMTP_PASSWORD: str = "rctjyphwdvqkzlpt"
    SMTP_FROM_EMAIL: str = "screenerpro.ai@gmail.com"
    SMTP_FROM_NAME: str = "UniFlow University LMS"
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    FRONTEND_URL: str = "http://43.204.232.176"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Ensure safe production secrets and resilient startup."""
        if self.ENVIRONMENT.lower() in {"production", "prod"}:
            if len(self.SECRET_KEY) < 32 or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("Production requires SECRET_KEY and JWT_SECRET_KEY of at least 32 characters")
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("Production requires a PostgreSQL DATABASE_URL")
            if not self.AUTH_RATE_LIMIT_ENABLED or not self.REQUIRE_REDIS:
                raise ValueError("Production requires Redis-backed authentication rate limiting")
            if not self.AWS_S3_BUCKET:
                raise ValueError("Production requires AWS_S3_BUCKET for durable file storage")
        else:
            if len(self.SECRET_KEY) < 16:
                self.SECRET_KEY = secrets.token_urlsafe(32)
            if len(self.JWT_SECRET_KEY) < 16:
                self.JWT_SECRET_KEY = secrets.token_urlsafe(32)
        return self


# Instantiate singleton settings instance
settings = Settings()
