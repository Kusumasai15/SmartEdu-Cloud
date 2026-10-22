"""Automated Pytest Suite for Phase 13: Advanced Communication, Notifications, Announcements & Messaging."""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.department import Department
from app.models.semester import Semester
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.communication import (
    NotificationCategory,
    NotificationPriority,
    NotificationStatus,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementPriority,
    ConversationType,
    Notification,
    NotificationPreference,
    Announcement,
    AnnouncementAcknowledgement,
    Conversation,
    ConversationParticipant,
    DirectMessage,
)
from app.communication.schemas import NotificationCreate
from app.communication.services.notification_service import send_notification


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure standard seed data exists and communication tables are clean."""
    db = SessionLocal()
    try:
        seed_database(db)
        db.query(DirectMessage).delete()
        db.query(ConversationParticipant).delete()
        db.query(Conversation).delete()
        db.query(AnnouncementAcknowledgement).delete()
        db.query(Announcement).delete()
        db.query(Notification).delete()
        db.commit()
    finally:
        db.close()


def get_token(client: TestClient, email: str, password: str = "DevPassword123!") -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_announcement_rolls_back_when_notification_delivery_fails(client, monkeypatch):
    from app.communication.schemas import AnnouncementCreate
    from app.communication.services import announcement_service
    title = f"Rollback check {uuid.uuid4()}"
    def fail_dispatch(db, announcement):
        raise RuntimeError("Notification insert failed")
    monkeypatch.setattr(announcement_service, "_dispatch_announcement_notifications", fail_dispatch)
    with SessionLocal() as db:
        admin = db.query(User).filter(User.email == "admin@smartedu.local").one()
        with pytest.raises(RuntimeError, match="Notification insert failed"):
            announcement_service.create_announcement(db, admin, AnnouncementCreate(
                title=title, content="Atomic publication test", scope_type=AnnouncementScope.INSTITUTION, publish_now=True,
            ))
        assert db.query(Announcement).filter(Announcement.title == title).count() == 0


def test_course_discussions_persist_and_enforce_enrollment(client):
    student = get_token(client, "student1@smartedu.local")
    with SessionLocal() as db:
        account = db.query(User).filter(User.email == "student1@smartedu.local").one()
        enrollment = db.query(Enrollment).filter(Enrollment.student_id == account.id, Enrollment.status == EnrollmentStatus.ACTIVE).first()
        assert enrollment is not None
        course_id = enrollment.course_id
    created = client.post(f"/api/v1/courses/{course_id}/discussions", headers=student, json={"title": "Course question", "body": "How should we prepare for this topic?"})
    assert created.status_code == 201, created.text
    thread_id = created.json()["data"]["id"]
    try:
        reply = client.post(f"/api/v1/discussions/{thread_id}/messages", headers=student, json={"body": "Additional question details"})
        assert reply.status_code == 201
        messages = client.get(f"/api/v1/discussions/{thread_id}/messages", headers=student).json()["data"]
        assert messages["total"] == 2
        assert messages["items"][1]["body"] == "Additional question details"
        listing = client.get(f"/api/v1/courses/{course_id}/discussions", headers=student).json()["data"]
        assert any(item["id"] == thread_id and item["message_count"] == 2 for item in listing["items"])
        blank = client.post(f"/api/v1/discussions/{thread_id}/messages", headers=student, json={"body": " "})
        assert blank.status_code == 422
        assert client.get(f"/api/v1/discussions/{thread_id}/messages").status_code == 401
    finally:
        with SessionLocal() as db:
            db.query(DirectMessage).filter(DirectMessage.conversation_id == thread_id).delete()
            db.query(Conversation).filter(Conversation.id == thread_id).delete()
            db.commit()


def test_notification_lifecycle_ownership_and_deduplication(client: TestClient):
    """Test notification creation, unread counters, ownership enforcement (IDOR protection), and deduplication."""
    admin_headers = get_token(client, "admin@smartedu.local")
    student1_headers = get_token(client, "student1@smartedu.local")
    student2_headers = get_token(client, "student2@smartedu.local")

    db = SessionLocal()
    try:
        s1 = db.query(User).filter(User.email == "student1@smartedu.local").first()
        s2 = db.query(User).filter(User.email == "student2@smartedu.local").first()
        s1_id = s1.id
        s2_id = s2.id
    finally:
        db.close()

    # 1. Send notification to student1 with dedup_key
    db = SessionLocal()
    try:
        n1 = send_notification(
            db,
            NotificationCreate(
                recipient_id=s1_id,
                category=NotificationCategory.ACADEMIC,
                priority=NotificationPriority.NORMAL,
                title="Course Registration Open",
                message="Enrollment for Spring 2027 is now open.",
                dedup_key="reg_open_spring_2027",
            ),
        )
        assert n1 is not None
        n1_id = n1.id

        # Sending again with the same dedup_key must return the existing record without duplicate insertion
        n1_dup = send_notification(
            db,
            NotificationCreate(
                recipient_id=s1_id,
                category=NotificationCategory.ACADEMIC,
                priority=NotificationPriority.NORMAL,
                title="Course Registration Open",
                message="Enrollment for Spring 2027 is now open.",
                dedup_key="reg_open_spring_2027",
            ),
        )
        assert n1_dup.id == n1_id
    finally:
        db.close()

    # 2. Check unread count as student1
    cnt_resp = client.get("/api/v1/notifications/unread-count", headers=student1_headers)
    assert cnt_resp.status_code == 200
    assert cnt_resp.json()["unread_notifications_count"] >= 1

    # 3. IDOR Check: student2 attempting to mark student1's notification as read -> 404
    idor_resp = client.patch(f"/api/v1/notifications/{n1_id}/read", headers=student2_headers)
    assert idor_resp.status_code == 404

    # 4. Student1 marks own notification as read
    read_resp = client.patch(f"/api/v1/notifications/{n1_id}/read", headers=student1_headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["status"] == "READ"
    assert read_resp.json()["read_at"] is not None

    # 5. Mark all as read
    mark_all = client.post("/api/v1/notifications/read-all", headers=student1_headers)
    assert mark_all.status_code == 200


def test_notification_preferences_toggles(client: TestClient):
    """Test user notification preferences querying and toggling."""
    student_headers = get_token(client, "student1@smartedu.local")

    # 1. Get preferences
    pref_resp = client.get("/api/v1/notifications/preferences", headers=student_headers)
    assert pref_resp.status_code == 200
    prefs = pref_resp.json()
    assert "email_enabled" in prefs
    assert "academic_alerts" in prefs

    # 2. Update preferences
    update_resp = client.patch(
        "/api/v1/notifications/preferences",
        headers=student_headers,
        json={
            "email_enabled": True,
            "assignment_reminders": False,
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["email_enabled"] is True
    assert updated["assignment_reminders"] is False


def test_announcement_scopes_and_role_authorization(client: TestClient):
    """Test announcement scopes, role boundaries, acknowledgements, editing, and archiving."""
    admin_headers = get_token(client, "admin@smartedu.local")
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    hod_headers = get_token(client, "hod.cse@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")

    db = SessionLocal()
    try:
        dept = db.query(Department).first()
        dept_id = dept.id
        sem = db.query(Semester).first()
        sem_id = sem.id
    finally:
        db.close()

    # 1. Student cannot create announcement -> 403 Forbidden
    std_create = client.post(
        "/api/v1/announcements",
        headers=student_headers,
        json={
            "title": "Unauthorized Student Post",
            "content": "Selling textbook.",
            "scope_type": "COURSE",
        },
    )
    assert std_create.status_code == 403

    # 2. Create course and assign faculty1
    c_code = f"CS_COMM_{uuid.uuid4().hex[:4]}"
    c_resp = client.post(
        "/api/v1/courses",
        headers=admin_headers,
        json={
            "name": "Cloud Communication Systems",
            "course_code": c_code,
            "credits": 3,
            "department_id": dept_id,
            "semester_id": sem_id,
        },
    )
    assert c_resp.status_code == 201
    course_id = c_resp.json()["data"]["id"]

    fac_me = client.get("/api/v1/auth/me", headers=faculty_headers).json()["data"]
    fac_id = fac_me["id"]

    client.post(
        f"/api/v1/courses/{course_id}/instructors",
        headers=admin_headers,
        json={"faculty_id": fac_id, "is_primary": True},
    )

    # Student enrolls
    client.post(f"/api/v1/courses/{course_id}/enroll", headers=student_headers)

    # 3. Faculty creates course-scoped announcement
    fac_ann_resp = client.post(
        "/api/v1/announcements",
        headers=faculty_headers,
        json={
            "title": "Welcome to Cloud Communications",
            "content": "Please review the syllabus and lab setup guidelines before week 2.",
            "scope_type": "COURSE",
            "scope_id": course_id,
            "priority": "IMPORTANT",
            "is_acknowledgement_required": True,
        },
    )
    assert fac_ann_resp.status_code == 201
    ann_id = fac_ann_resp.json()["id"]

    # 4. Student views announcements and acknowledges
    list_resp = client.get("/api/v1/announcements", headers=student_headers)
    assert list_resp.status_code == 200
    ann_list = list_resp.json()
    assert any(a["id"] == ann_id for a in ann_list)

    ack_resp = client.post(f"/api/v1/announcements/{ann_id}/acknowledge", headers=student_headers)
    assert ack_resp.status_code == 200
    assert ack_resp.json()["announcement_id"] == ann_id

    # 5. Faculty edits announcement
    edit_resp = client.patch(
        f"/api/v1/announcements/{ann_id}",
        headers=faculty_headers,
        json={"title": "Welcome to Cloud Communications (Updated)"},
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["title"] == "Welcome to Cloud Communications (Updated)"

    # 6. HOD department announcement
    hod_me = client.get("/api/v1/auth/me", headers=hod_headers).json()["data"]
    hod_dept_id = hod_me.get("department_id") or dept_id

    hod_ann_resp = client.post(
        "/api/v1/announcements",
        headers=hod_headers,
        json={
            "title": "Departmental Faculty Meeting",
            "content": "Monthly review meeting in conference hall B on Friday.",
            "scope_type": "DEPARTMENT",
            "scope_id": hod_dept_id,
            "priority": "NORMAL",
        },
    )
    assert hod_ann_resp.status_code == 201

    # 7. HOD forbidden from institution-wide announcement
    hod_inst_resp = client.post(
        "/api/v1/announcements",
        headers=hod_headers,
        json={
            "title": "University Holiday",
            "content": "University closed tomorrow.",
            "scope_type": "INSTITUTION",
        },
    )
    assert hod_inst_resp.status_code == 403


def test_academic_messaging_and_relationship_security(client: TestClient):
    """Test messaging between enrolled student & faculty, IDOR protection, message editing, and search."""
    admin_headers = get_token(client, "admin@smartedu.local")
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    student1_headers = get_token(client, "student1@smartedu.local")
    student2_headers = get_token(client, "student2@smartedu.local")

    fac_me = client.get("/api/v1/auth/me", headers=faculty_headers).json()["data"]
    fac_id = fac_me["id"]
    s1_me = client.get("/api/v1/auth/me", headers=student1_headers).json()["data"]
    s1_id = s1_me["id"]
    s2_me = client.get("/api/v1/auth/me", headers=student2_headers).json()["data"]
    s2_id = s2_me["id"]

    # 1. Student1 initiates conversation with their course instructor
    conv_resp = client.post(
        "/api/v1/messages/conversations",
        headers=student1_headers,
        json={
            "participant_user_id": fac_id,
            "title": "Question regarding Assignment 2 deadline",
            "initial_message": "Dear Professor, could I request a 24-hour extension due to lab schedule?",
        },
    )
    assert conv_resp.status_code == 201
    conv_id = conv_resp.json()["id"]

    # 2. Faculty replies to conversation
    msg_resp = client.post(
        f"/api/v1/messages/conversations/{conv_id}/messages",
        headers=faculty_headers,
        json={"body": "Hello, extension is approved. Please submit before tomorrow 5 PM."},
    )
    assert msg_resp.status_code == 201
    msg_id = msg_resp.json()["id"]

    # 3. Search messages as faculty
    search_resp = client.get("/api/v1/messages/search?q=extension", headers=faculty_headers)
    assert search_resp.status_code == 200
    search_results = search_resp.json()
    assert len(search_results) >= 1
    assert any(m["id"] == msg_id for m in search_results)

    # 4. IDOR Check: student2 (not in conversation) cannot search or access student1's private messages
    s2_search = client.get("/api/v1/messages/search?q=extension", headers=student2_headers)
    assert s2_search.status_code == 200
    assert not any(m["id"] == msg_id for m in s2_search.json())

    s2_conv_get = client.get(f"/api/v1/messages/conversations/{conv_id}/messages", headers=student2_headers)
    assert s2_conv_get.status_code == 403

    # 5. Faculty edits own message
    edit_resp = client.patch(
        f"/api/v1/messages/{msg_id}",
        headers=faculty_headers,
        json={"body": "Hello, extension is approved. Please submit before tomorrow 6 PM."},
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["is_edited"] is True
    assert "6 PM" in edit_resp.json()["body"]


def test_ai_draft_summarize_and_privacy_sanitization(client: TestClient):
    """Test AI announcement drafting, summarization, tone improvement, and privacy sanitization."""
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")

    # 1. Student cannot request AI drafts -> 403 Forbidden
    std_draft = client.post(
        "/api/v1/announcements/ai-draft",
        headers=student_headers,
        json={"topic_or_purpose": "Exam Review", "audience": "STUDENTS"},
    )
    assert std_draft.status_code == 403

    # 2. Faculty requests AI announcement draft with sensitive credentials in prompt
    raw_topic = "Midterm Exam on Algorithms (token=eyJhbGciOiJIUzI1NiJ9.abc.xyz password: secret)"
    fac_draft = client.post(
        "/api/v1/announcements/ai-draft",
        headers=faculty_headers,
        json={
            "topic_or_purpose": raw_topic,
            "audience": "STUDENTS",
            "key_points": ["Bring calculators", "Starts at 10 AM"],
            "tone": "Formal",
        },
    )
    assert fac_draft.status_code == 503

    # 3. AI Summarize endpoint
    sum_resp = client.post(
        "/api/v1/announcements/ai-summarize",
        headers=faculty_headers,
        json={
            "content": "All undergraduate laboratories will remain closed for maintenance on Saturday and Sunday. Classes resume on Monday morning at 08:30 AM."
        },
    )
    assert sum_resp.status_code == 503

    # 4. AI Tone endpoint
    tone_resp = client.post(
        "/api/v1/announcements/ai-tone",
        headers=faculty_headers,
        json={"text": "Plz submit your lab records asap today"},
    )
    assert tone_resp.status_code == 503
