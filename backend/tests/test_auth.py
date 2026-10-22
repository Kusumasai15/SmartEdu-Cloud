"""Comprehensive Authentication and JWT Security Unit/Integration Tests."""
import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.auth.jwt import create_access_token, create_refresh_token
from tests.fixtures import seed_database
from app.models import User, RefreshToken
from app.cli.bootstrap_admin import bootstrap_admin


@pytest.fixture(scope="function")
def test_db():
    """Create an isolated, in-memory SQLite database session populated with Phase 03 seed data."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    seed_database(session)

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==============================================================================
# 1. LOGIN TESTS
# ==============================================================================

def test_public_registration_cannot_create_admin(client):
    response = client.post("/api/v1/auth/register", json={
        "first_name": "Unauthorized", "email": "intruder@example.com",
        "password": "StrongPassword123!", "role": "ADMINISTRATOR",
    })
    assert response.status_code in (401, 403)


def test_first_admin_bootstrap_is_one_time():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    with Session() as db:
        user = bootstrap_admin(db, "first-admin@example.edu", "StrongPassword123!", "First", "Admin")
        assert user.role.name == "ADMINISTRATOR"
        with pytest.raises(RuntimeError):
            bootstrap_admin(db, "second-admin@example.edu", "StrongPassword123!", "Second", "Admin")
    Base.metadata.drop_all(bind=engine)


def test_student_cannot_authorize_course_material_upload(client, monkeypatch):
    monkeypatch.setattr(settings, "AWS_S3_BUCKET", "private-test-bucket")
    login = client.post("/api/v1/auth/login", json={
        "email": "student1@smartedu.local", "password": "DevPassword123!",
    })
    token = login.json()["data"]["access_token"]
    response = client.post(
        "/api/v1/storage/uploads",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "file_name": "notes.pdf",
            "content_type": "application/pdf",
            "size_bytes": 128,
            "category": "course-materials",
        },
    )
    assert response.status_code == 403


def test_student_cannot_download_another_students_private_file(client, test_db, monkeypatch):
    monkeypatch.setattr(settings, "AWS_S3_BUCKET", "private-test-bucket")
    other = test_db.query(User).filter(User.email == "student2@smartedu.local").one()
    login = client.post("/api/v1/auth/login", json={
        "email": "student1@smartedu.local", "password": "DevPassword123!",
    })
    token = login.json()["data"]["access_token"]
    response = client.get(
        "/api/v1/storage/download",
        headers={"Authorization": f"Bearer {token}"},
        params={"object_key": f"assignments/{other.id}/{'a' * 32}.pdf"},
    )
    assert response.status_code == 403


def test_login_success(client):
    """Verify valid credentials return 200 with access and refresh tokens."""
    payload = {
        "email": "student1@smartedu.local",
        "password": "DevPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"


def test_login_case_insensitivity(client):
    """Verify login handles uppercase / whitespace in email correctly."""
    payload = {
        "email": "  STUDENT1@SMARTEDU.LOCAL  ",
        "password": "DevPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_login_wrong_password(client):
    """Verify incorrect password produces 401 without leaking internal details."""
    payload = {
        "email": "student1@smartedu.local",
        "password": "WrongPassword!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_unknown_email(client):
    """Verify non-existent user produces identical generic 401 error (no user enumeration)."""
    payload = {
        "email": "nonexistent@smartedu.local",
        "password": "SomePassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_inactive_user(client, test_db):
    """Verify deactivated user account cannot log in."""
    user = test_db.query(User).filter(User.email == "student1@smartedu.local").first()
    user.is_active = False
    test_db.commit()

    payload = {
        "email": "student1@smartedu.local",
        "password": "DevPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


# ==============================================================================
# 2. JWT TOKEN VALIDATION TESTS
# ==============================================================================

def test_jwt_access_token_validation(client):
    """Verify authentic access token enables access to /api/v1/auth/me."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartedu.local", "password": "DevPassword123!"},
    )
    token = login_resp.json()["data"]["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()["data"]
    assert user_data["email"] == "admin@smartedu.local"
    assert user_data["role"]["name"] == "ADMINISTRATOR"
    assert len(user_data["permissions"]) > 0


def test_jwt_expired_access_token(client, test_db):
    """Verify expired token is rejected with 401."""
    user = test_db.query(User).filter(User.email == "student1@smartedu.local").first()
    expired_token = create_access_token(
        user_id=user.id,
        role_name="STUDENT",
        expires_delta=timedelta(seconds=-10),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_jwt_tampered_token(client):
    """Verify tampered JWT signature is rejected with 401."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "student1@smartedu.local", "password": "DevPassword123!"},
    )
    valid_token = login_resp.json()["data"]["access_token"]
    tampered_token = valid_token[:-4] + "xxxx"

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_jwt_wrong_token_type(client):
    """Verify a refresh token cannot be used as a Bearer access token."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "student1@smartedu.local", "password": "DevPassword123!"},
    )
    refresh_token = login_resp.json()["data"]["refresh_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert response.status_code == 401
    assert "invalid token type" in response.json()["detail"].lower()


# ==============================================================================
# 3. REFRESH & LOGOUT TESTS
# ==============================================================================

def test_refresh_token_lifecycle(client):
    """Verify valid refresh token issues a new token pair and rotates the refresh token."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "faculty1@smartedu.local", "password": "DevPassword123!"},
    )
    old_refresh = login_resp.json()["data"]["refresh_token"]

    # Exchange refresh token
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert refresh_resp.status_code == 200
    new_data = refresh_resp.json()["data"]
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["refresh_token"] != old_refresh

    # Old refresh token should now be revoked (rotation)
    reused_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert reused_resp.status_code == 401


def test_logout_revocation(client):
    """Verify logging out revokes the refresh token."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "student2@smartedu.local", "password": "DevPassword123!"},
    )
    refresh_token = login_resp.json()["data"]["refresh_token"]

    # Logout
    logout_resp = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["success"] is True

    # Attempting to refresh with the revoked token must fail
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401
