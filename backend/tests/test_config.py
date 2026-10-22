"""Test suite for application configuration and environment parsing."""
from app.core.config import Settings


def test_settings_defaults() -> None:
    """Verify default configuration values."""
    settings = Settings()
    assert settings.APP_NAME == "SmartEdu Cloud"
    assert settings.API_V1_STR == "/api/v1"
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) >= 1


def test_cors_parsing_from_string() -> None:
    """Verify comma-separated CORS strings are parsed into a clean list."""
    custom_origins = "http://localhost:3000, https://smartedu.example.com "
    parsed = Settings.assemble_cors_origins(custom_origins)
    assert parsed == ["http://localhost:3000", "https://smartedu.example.com"]
