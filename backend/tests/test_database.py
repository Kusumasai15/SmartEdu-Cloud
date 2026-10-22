"""Test suite for database connection and session lifecycle."""
from sqlalchemy import text
from app.core.database import SessionLocal, check_database_connection, Base


def test_database_connection_probe() -> None:
    """Verify check_database_connection function returns a boolean."""
    result = check_database_connection()
    assert isinstance(result, bool)


def test_session_lifecycle() -> None:
    """Verify that a database session can be created and execute basic query."""
    session = SessionLocal()
    try:
        result = session.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        session.close()


def test_base_metadata_initialized() -> None:
    """Verify that declarative Base is ready for model registration in Phase 02."""
    assert Base.metadata is not None
