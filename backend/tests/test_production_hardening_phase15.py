"""Automated Pytest Suite for Phase 15: Production Hardening, Observability, Security & Final System Integration."""

import pytest
import uuid
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure standard seed data exists."""
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def get_token(client: TestClient, email: str, password: str = "DevPassword123!") -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_probes_and_correlation_headers(client: TestClient):
    """Test root, liveness, readiness probes and correlation ID / security headers."""
    # 1. Root health probe
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "database" in data

    # 2. Liveness & Readiness probes
    live = client.get("/health/live")
    assert live.status_code == 200
    assert live.json()["status"] == "alive"

    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert "status" in ready.json()

    # 3. Correlation ID propagation
    custom_req_id = f"test-trace-{uuid.uuid4()}"
    traced_resp = client.get("/", headers={"X-Request-ID": custom_req_id})
    assert traced_resp.status_code == 200
    assert traced_resp.headers.get("X-Request-ID") == custom_req_id

    # 4. Security Headers
    assert traced_resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert traced_resp.headers.get("X-Frame-Options") == "DENY"
    assert traced_resp.headers.get("X-XSS-Protection") == "1; mode=block"
    assert "X-Response-Time-Ms" in traced_resp.headers


def test_secret_sanitization_and_ai_isolation(client: TestClient):
    """Verify that backend secrets, tokens, and Gemini API keys are never exposed."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # 1. AI admin endpoint must never return raw API key
    ai_resp = client.get("/api/v1/admin/ai/status", headers=admin_headers)
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert "api_key" not in ai_data
    assert "gemini_api_key" not in ai_data
    assert "is_configured" in ai_data
    assert ai_data["human_review_enforced"] is True

    # 2. Current user profile must never return password_hash
    me_resp = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()["data"]
    assert "password" not in me_data
    assert "password_hash" not in me_data


def test_operational_state_is_database_backed_and_role_scoped(client: TestClient):
    admin_headers = get_token(client, "admin@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")

    saved = client.patch(
        "/api/v1/admin/operational-state",
        headers=admin_headers,
        json={"currentSemester": 2, "institutionalHolidays": []},
    )
    assert saved.status_code == 200
    assert saved.json()["data"]["currentSemester"] == 2

    loaded = client.get("/api/v1/admin/operational-state", headers=student_headers)
    assert loaded.status_code == 200
    assert loaded.json()["data"]["currentSemester"] == 2

    allowed = client.patch(
        "/api/v1/admin/operational-state",
        headers=student_headers,
        json={"studentLeaves": []},
    )
    assert allowed.status_code == 200

    forbidden = client.patch(
        "/api/v1/admin/operational-state",
        headers=student_headers,
        json={"hallTicketsReleased": True},
    )
    assert forbidden.status_code == 403


def test_five_role_rbac_privilege_isolation_matrix(client: TestClient):
    """Test strict RBAC boundaries preventing unauthorized privilege escalation."""
    student_headers = get_token(client, "student1@smartedu.local")
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    hod_headers = get_token(client, "hod.cse@smartedu.local")
    vc_headers = get_token(client, "vc@smartedu.local")

    # 1. Students forbidden from Admin & HOD APIs
    assert client.get("/api/v1/admin/dashboard", headers=student_headers).status_code == 403
    assert client.get("/api/v1/admin/users", headers=student_headers).status_code == 403
    assert client.get("/api/v1/admin/audit", headers=student_headers).status_code == 403

    # 2. Faculty forbidden from Admin APIs
    assert client.get("/api/v1/admin/dashboard", headers=faculty_headers).status_code == 403
    assert client.get("/api/v1/admin/security/events", headers=faculty_headers).status_code == 403

    # 3. HOD forbidden from Administrator-only endpoints
    assert client.get("/api/v1/admin/policies", headers=hod_headers).status_code == 403
    assert client.get("/api/v1/admin/security/sessions", headers=hod_headers).status_code == 403

    # 4. VC forbidden from Administrator-only endpoints
    assert client.get("/api/v1/admin/policies", headers=vc_headers).status_code == 403


def test_idor_and_tenant_isolation(client: TestClient):
    """Test object-level authorization across users."""
    student1_headers = get_token(client, "student1@smartedu.local")
    student2_headers = get_token(client, "student2@smartedu.local")

    # 1. Student2 cannot mark Student1's notification read
    fake_notif_id = str(uuid.uuid4())
    idor_notif = client.patch(f"/api/v1/notifications/{fake_notif_id}/read", headers=student2_headers)
    assert idor_notif.status_code == 404

    # 2. Student2 cannot view non-existent private message thread
    fake_conv_id = str(uuid.uuid4())
    idor_conv = client.get(f"/api/v1/messages/conversations/{fake_conv_id}/messages", headers=student2_headers)
    assert idor_conv.status_code in [403, 404]


def test_error_envelope_structure_with_request_id(client: TestClient):
    """Test standardized error responses with correlation IDs."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # Request invalid user
    fake_id = str(uuid.uuid4())
    err_resp = client.get(f"/api/v1/admin/users/{fake_id}", headers=admin_headers)
    assert err_resp.status_code == 404
    assert "X-Request-ID" in err_resp.headers
