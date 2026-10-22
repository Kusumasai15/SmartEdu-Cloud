"""Automated Pytest Suite for Phase 11: Communication, Notifications, Announcements & Messaging."""

import pytest
from fastapi import HTTPException
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.department import Department
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.communication import (
    Notification,
    NotificationPreference,
    Announcement,
    AnnouncementAcknowledgement,
    Conversation,
    ConversationParticipant,
    DirectMessage,
    NotificationCategory,
    NotificationPriority,
    NotificationStatus,
    AnnouncementScope,
    AnnouncementPriority,
)
from app.communication.services.notification_service import (
    send_notification,
    get_user_unread_counts,
    mark_notification_read,
    mark_all_notifications_read,
    update_user_preferences,
)
from app.communication.services.event_service import AcademicEventBus
from app.communication.services.ai_draft_service import AIDraftService
from app.communication.schemas import (
    NotificationCreate,
    NotificationPreferenceUpdate,
    AIDraftRequest,
)


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
        db.query(NotificationPreference).delete()
        db.commit()
    finally:
        db.close()


def get_token(client, email: str, password: str = "DevPassword123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["data"]["access_token"]


def test_notification_lifecycle_and_preferences(client):
    """Test notification dispatch, deduplication, unread counts, and preferences."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        assert student is not None
        student_token = get_token(client, "student1@smartedu.local")

        # 1. Dispatch first notification
        n1 = send_notification(
            db,
            NotificationCreate(
                recipient_id=student.id,
                category=NotificationCategory.ASSIGNMENT,
                priority=NotificationPriority.NORMAL,
                title="Assignment 1 Due Tomorrow",
                message="Please submit your database schema before midnight.",
                dedup_key=f"test_assign_{student.id}_1",
            ),
        )
        assert n1 is not None

        # 2. Deduplication check: dispatching duplicate dedup_key returns existing without creating extra
        n2 = send_notification(
            db,
            NotificationCreate(
                recipient_id=student.id,
                category=NotificationCategory.ASSIGNMENT,
                priority=NotificationPriority.NORMAL,
                title="Duplicate Assignment Due",
                message="Duplicate message body.",
                dedup_key=f"test_assign_{student.id}_1",
            ),
        )
        assert n2.id == n1.id

        # 3. Query unread count endpoint
        resp = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {student_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["unread_notifications_count"] >= 1

        # 4. Mark single notification as read
        read_resp = client.patch(
            f"/api/v1/notifications/{n1.id}/read",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert read_resp.status_code == 200
        assert read_resp.json()["status"] == "READ"

        # 5. Mark all as read
        all_resp = client.post(
            "/api/v1/notifications/read-all",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert all_resp.status_code == 200

        # 6. Update preferences
        pref_resp = client.patch(
            "/api/v1/notifications/preferences",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"assignment_reminders": False},
        )
        assert pref_resp.status_code == 200
        assert pref_resp.json()["assignment_reminders"] is False
    finally:
        db.close()


def test_scoped_announcements_and_acknowledgement(client):
    """Test scoped announcement authorization, recipient retrieval, and acknowledgement."""
    db = SessionLocal()
    try:
        student_token = get_token(client, "student1@smartedu.local")
        faculty_token = get_token(client, "faculty1@smartedu.local")
        hod_token = get_token(client, "hod.cse@smartedu.local")
        vc_token = get_token(client, "vc@smartedu.local")

        course = db.query(Course).first()
        assert course is not None

        # 1. Student attempts to post announcement -> 403 Forbidden
        stu_pub = client.post(
            "/api/v1/announcements",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"title": "Student Notice", "content": "Hello", "scope_type": "COURSE", "scope_id": course.id},
        )
        assert stu_pub.status_code == 403

        # 2. Faculty posts course announcement -> 201 Created
        ci = db.query(CourseInstructor).filter(CourseInstructor.faculty_id.isnot(None)).first()
        assert ci is not None

        fac_pub = client.post(
            "/api/v1/announcements",
            headers={"Authorization": f"Bearer {faculty_token}"},
            json={
                "title": "Midterm Exam Review Session",
                "content": "Review session will be held on Thursday at 3 PM.",
                "scope_type": "COURSE",
                "scope_id": ci.course_id,
                "priority": "IMPORTANT",
                "is_acknowledgement_required": True,
            },
        )
        assert fac_pub.status_code == 201
        ann_id = fac_pub.json()["id"]

        # 3. Student views announcements
        list_resp = client.get("/api/v1/announcements", headers={"Authorization": f"Bearer {student_token}"})
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) > 0

        # 4. Student acknowledges the mandatory announcement
        ack_resp = client.post(
            f"/api/v1/announcements/{ann_id}/acknowledge",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert ack_resp.status_code == 200
        assert ack_resp.json()["announcement_id"] == ann_id
    finally:
        db.close()


def test_academic_messaging_and_idor_protection(client):
    """Test academic messaging relationships, conversation creation, message history, and IDOR protection."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        faculty = db.query(User).filter(User.email == "faculty1@smartedu.local").first()
        other_faculty = db.query(User).filter(User.email == "faculty2@smartedu.local").first()

        student_token = get_token(client, "student1@smartedu.local")
        faculty_token = get_token(client, "faculty1@smartedu.local")

        # 1. Student starts conversation with assigned course faculty
        conv_resp = client.post(
            "/api/v1/messages/conversations",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "participant_user_id": faculty.id,
                "title": "DBMS Project Clarification",
                "initial_message": "Hello Professor, could you clarify the requirements for Milestone 2?",
            },
        )
        assert conv_resp.status_code == 201
        conv_id = conv_resp.json()["id"]

        # 2. Faculty replies in conversation
        msg_resp = client.post(
            f"/api/v1/messages/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {faculty_token}"},
            json={"body": "Sure! Milestone 2 covers ER diagram normalization up to BCNF."},
        )
        assert msg_resp.status_code == 201
        msg_id = msg_resp.json()["id"]

        # 3. Retrieve conversation message history
        hist_resp = client.get(
            f"/api/v1/messages/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert hist_resp.status_code == 200
        messages = hist_resp.json()
        assert len(messages) == 2

        # 4. IDOR Protection: Unrelated faculty attempts to view conversation -> 403 Forbidden
        if other_faculty:
            other_fac_token = get_token(client, "faculty2@smartedu.local")
            idor_resp = client.get(
                f"/api/v1/messages/conversations/{conv_id}/messages",
                headers={"Authorization": f"Bearer {other_fac_token}"},
            )
            assert idor_resp.status_code == 403

        # 5. Edit message
        edit_resp = client.patch(
            f"/api/v1/messages/{msg_id}",
            headers={"Authorization": f"Bearer {faculty_token}"},
            json={"body": "Sure! Milestone 2 covers ER normalization up to 3NF & BCNF."},
        )
        assert edit_resp.status_code == 200
        assert edit_resp.json()["is_edited"] is True
    finally:
        db.close()


def test_academic_event_bus_integration():
    """Test academic event bus notification dispatch."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        course = db.query(Course).first()
        assert student and course

        # Emit assignment event
        AcademicEventBus.emit_assignment_published(
            db,
            course_id=course.id,
            assignment_id="mock_assign_123",
            assignment_title="ER Modeling Exercise",
            due_date_str="2026-09-10",
        )

        # Emit attendance warning
        AcademicEventBus.emit_attendance_warning(
            db,
            student_id=student.id,
            course_name=course.name,
            attendance_pct=68.5,
        )

        # Emit academic risk alert
        AcademicEventBus.emit_academic_risk_alert(
            db,
            student_id=student.id,
            risk_level="HIGH",
            primary_reason="Attendance below 70%",
        )

        # Verify notifications were created
        notifs = db.query(Notification).filter(Notification.recipient_id == student.id).all()
        assert len(notifs) >= 2
    finally:
        db.close()


def test_ai_draft_service_and_disclaimer():
    """AI drafting fails explicitly when the provider is not configured."""
    req = AIDraftRequest(
        topic_or_purpose="Final Examination Schedule Fall 2026",
        audience="STUDENTS",
        key_points=["Exams begin Dec 1", "Hall tickets available on portal"],
    )
    with pytest.raises(HTTPException) as exc_info:
        AIDraftService.generate_announcement_draft(req)
    assert exc_info.value.status_code == 503
