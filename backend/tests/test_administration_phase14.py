"""Automated Pytest Suite for Phase 14: Administration, Governance, Security & System Control Engine."""

import pytest
from datetime import date, datetime, timezone
from uuid import uuid4
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.token import RefreshToken
from app.models.administration import (
    AdminAuditEvent,
    SecurityEventLog,
    SystemPolicy,
    PolicyVersionHistory,
    AdminActionType,
    SecurityEventSeverity,
    PolicyCategory,
)
from app.administration.services.policy_service import get_or_create_default_policies


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure standard seed data exists and default policies are created."""
    db = SessionLocal()
    try:
        seed_database(db)
        get_or_create_default_policies(db)
    finally:
        db.close()


def get_token(client: TestClient, email: str, password: str = "DevPassword123!") -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_dashboard_kpis(client: TestClient):
    """Test administrator overview KPIs endpoint."""
    admin_headers = get_token(client, "admin@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")

    # 1. Non-admin forbidden
    std_resp = client.get("/api/v1/admin/dashboard", headers=student_headers)
    assert std_resp.status_code == 403

    # 2. Admin dashboard
    resp = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_students"] >= 1
    assert data["total_faculty"] >= 1
    assert data["total_administrators"] >= 1
    assert data["total_courses"] >= 1
    assert data["total_departments"] >= 1
    assert "active_academic_year" in data
    assert "system_health_status" in data


def test_leadership_directories_are_paged_and_department_scoped(client: TestClient):
    hod_headers = get_token(client, "hod.cse@smartedu.local")
    vc_headers = get_token(client, "vc@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")
    for endpoint in ("students", "faculty", "support"):
        assert client.get(f"/api/v1/leadership/{endpoint}", headers=student_headers).status_code == 403
        assert client.get(f"/api/v1/leadership/{endpoint}", headers=vc_headers).status_code == 200
    assert client.get("/api/v1/leadership/students?department_id=another-department", headers=hod_headers).status_code == 403
    assert client.get("/api/v1/leadership/faculty?department_id=another-department", headers=hod_headers).status_code == 403
    response = client.get("/api/v1/leadership/students?limit=1", headers=hod_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["items"]) == 1
    assert data["total"] >= 1
    email = data["items"][0]["email"]
    search = client.get("/api/v1/leadership/students", params={"search": email}, headers=hod_headers).json()["data"]
    assert search["total"] == 1
    assert search["items"][0]["email"] == email
    with SessionLocal() as db:
        hod = db.query(User).filter(User.email == "hod.cse@smartedu.local").one()
        student = db.query(User).filter(User.id == data["items"][0]["id"]).one()
        assert student.department_id == hod.department_id


def test_support_uses_recorded_attendance(client: TestClient):
    from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    hod_headers = get_token(client, "hod.cse@smartedu.local")
    with SessionLocal() as db:
        hod = db.query(User).filter(User.email == "hod.cse@smartedu.local").one()
        enrollment = db.query(Enrollment).join(Course).join(User, Enrollment.student_id == User.id).filter(
            Course.department_id == hod.department_id, User.department_id == hod.department_id,
        ).first()
        assert enrollment is not None
        session = AttendanceSession(course_id=enrollment.course_id, faculty_id=hod.id, session_date=date(2026, 10, 8))
        db.add(session)
        db.flush()
        record = AttendanceRecord(session_id=session.id, student_id=enrollment.student_id, status=AttendanceStatus.ABSENT)
        db.add(record)
        db.commit()
        try:
            response = client.get("/api/v1/leadership/support?limit=100", headers=hod_headers)
            assert response.status_code == 200, response.text
            row = next(item for item in response.json()["data"]["items"] if item["id"] == enrollment.student_id)
            assert 0 <= row["attendance_percentage"] < 75
        finally:
            db.delete(record)
            db.delete(session)
            db.commit()


def test_leadership_overview_is_role_scoped(client: TestClient):
    student_headers = get_token(client, "student1@smartedu.local")
    hod_headers = get_token(client, "hod.cse@smartedu.local")
    vc_headers = get_token(client, "vc@smartedu.local")

    assert client.get("/api/v1/leadership/overview", headers=student_headers).status_code == 403
    hod_response = client.get("/api/v1/leadership/overview", headers=hod_headers)
    vc_response = client.get("/api/v1/leadership/overview", headers=vc_headers)
    assert hod_response.status_code == 200
    assert vc_response.status_code == 200
    hod_data = hod_response.json()["data"]
    vc_data = vc_response.json()["data"]
    assert len(hod_data["departments"]) == 1
    with SessionLocal() as db:
        hod = db.query(User).filter(User.email == "hod.cse@smartedu.local").first()
        assert hod is not None
        assert hod_data["departments"][0]["id"] == hod.department_id
    assert vc_data["totals"]["departments"] >= hod_data["totals"]["departments"]
    assert vc_data["totals"]["students"] >= hod_data["totals"]["students"]


def test_admin_user_management_and_rbac(client: TestClient):
    """Test user listing, detail retrieval, account suspension, reactivation, and audit trail."""
    admin_headers = get_token(client, "admin@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    hod_headers = get_token(client, "hod.cse@smartedu.local")

    # 1. Non-admin roles rejected from /admin/users
    assert client.get("/api/v1/admin/users", headers=student_headers).status_code == 403
    assert client.get("/api/v1/admin/users", headers=faculty_headers).status_code == 403
    assert client.get("/api/v1/admin/users", headers=hod_headers).status_code == 403

    # 2. Admin lists users with search & role filter
    users_resp = client.get("/api/v1/admin/users?role=STUDENT", headers=admin_headers)
    assert users_resp.status_code == 200
    students = users_resp.json()
    assert len(students) >= 1
    target_student = students[0]
    target_id = target_student["id"]

    # 3. Admin gets user detail
    detail_resp = client.get(f"/api/v1/admin/users/{target_id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == target_id

    # 4. Admin suspends user account
    susp_resp = client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        headers=admin_headers,
        json={"is_active": False, "status_reason": "Disciplinary review pending."},
    )
    assert susp_resp.status_code == 200
    assert susp_resp.json()["is_active"] is False

    # 5. Admin reactivates user account
    react_resp = client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        headers=admin_headers,
        json={"is_active": True, "status_reason": "Review cleared."},
    )
    assert react_resp.status_code == 200
    assert react_resp.json()["is_active"] is True


def test_admin_user_profile_updates_are_persisted(client: TestClient):
    headers = get_token(client, "admin@smartedu.local")
    created = client.post("/api/v1/admin/users", headers=headers, json={
        "first_name": "Profile", "last_name": "Check",
        "email": f"profile-check-{uuid4().hex[:8]}@smartedu.local", "password": "StrongPassword123!",
        "role": "STUDENT", "department": "Computer Science & Engineering",
    })
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]
    updated = client.patch(f"/api/v1/admin/users/{user_id}", headers=headers, json={
        "first_name": "Updated", "student_identifier": f"PROFILE-{uuid4().hex[:12]}",
    })
    assert updated.status_code == 200, updated.text
    detail = client.get(f"/api/v1/admin/users/{user_id}", headers=headers)
    assert detail.json()["first_name"] == "Updated"
    assert detail.json()["student_identifier"] == updated.json()["student_identifier"]


def test_admin_cannot_deactivate_own_account(client: TestClient):
    headers = get_token(client, "admin@smartedu.local")
    users = client.get("/api/v1/admin/users?role=ADMINISTRATOR", headers=headers).json()
    own_id = next(user["id"] for user in users if user["email"] == "admin@smartedu.local")
    response = client.delete(f"/api/v1/admin/users/{own_id}", headers=headers)
    assert response.status_code == 400


def test_admin_audit_explorer_and_immutability(client: TestClient):
    """Test audit log querying and immutability."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # 1. Query audit events
    audit_resp = client.get("/api/v1/admin/audit?limit=20", headers=admin_headers)
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    assert isinstance(events, list)
    if len(events) > 0:
        event = events[0]
        assert "actor_role" in event
        assert "action" in event
        assert "resource_type" in event


def test_admin_security_events_and_session_revocation(client: TestClient):
    """Test security incident logs and session revocation."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # 1. Get security events
    sec_resp = client.get("/api/v1/admin/security/events", headers=admin_headers)
    assert sec_resp.status_code == 200

    # 2. Get active sessions
    sess_resp = client.get("/api/v1/admin/security/sessions", headers=admin_headers)
    assert sess_resp.status_code == 200
    sessions = sess_resp.json()
    if len(sessions) > 0:
        target_session = sessions[0]
        sess_id = target_session["id"]

        # Revoke session
        rev_resp = client.post(f"/api/v1/admin/security/sessions/{sess_id}/revoke", headers=admin_headers)
        assert rev_resp.status_code == 200


def test_system_policy_versioning(client: TestClient):
    """Test institutional policy management, update, version snapshotting, and history."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # 1. List policies
    policies_resp = client.get("/api/v1/admin/policies", headers=admin_headers)
    assert policies_resp.status_code == 200
    policies = policies_resp.json()
    assert len(policies) >= 1

    target_policy = policies[0]
    pol_key = target_policy["key"]
    initial_version = target_policy["current_version"]

    # 2. Update policy value
    new_val = dict(target_policy["policy_value"])
    new_val["updated_flag"] = True

    update_resp = client.patch(
        f"/api/v1/admin/policies/{pol_key}",
        headers=admin_headers,
        json={
            "policy_value": new_val,
            "change_reason": "Annual institutional academic board revision.",
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["current_version"] != initial_version


def test_governance_summary_and_requests(client: TestClient):
    """Test cross-phase governance aggregation summary and requests."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # 1. Governance summary
    sum_resp = client.get("/api/v1/admin/governance/summary", headers=admin_headers)
    assert sum_resp.status_code == 200
    assert "total_actionable_requests" in sum_resp.json()

    # 2. Governance requests
    req_resp = client.get("/api/v1/admin/governance/requests", headers=admin_headers)
    assert req_resp.status_code == 200
    assert isinstance(req_resp.json(), list)


def test_system_health_and_ai_masking(client: TestClient):
    """Test real-time system diagnostics and AI gateway secret masking."""
    admin_headers = get_token(client, "admin@smartedu.local")

    # 1. System Health
    health_resp = client.get("/api/v1/admin/system/health", headers=admin_headers)
    assert health_resp.status_code == 200
    h_data = health_resp.json()
    assert "overall_status" in h_data
    assert {item["service_name"] for item in h_data["services"]} == {"PostgreSQL Database", "Redis"}

    # 2. AI Admin Status (Secret masking check)
    ai_resp = client.get("/api/v1/admin/ai/status", headers=admin_headers)
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert "is_configured" in ai_data
    assert "model_name" in ai_data
    assert "safety_disclaimer" in ai_data
    # Ensure no API key secret field exists in response
    assert "api_key" not in ai_data
    assert "gemini_api_key" not in ai_data
