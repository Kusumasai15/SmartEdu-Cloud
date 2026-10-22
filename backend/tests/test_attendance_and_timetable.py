"""Automated Test Suite for Phase 08 — Attendance, Timetable & Engagement Engine."""

import pytest
from datetime import date, timedelta
from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.timetable import ClassSchedule, DayOfWeek, ScheduleStatus
from app.models.attendance import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrection,
    AttendanceSessionStatus,
    AttendanceStatus,
    CorrectionStatus,
)


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure standard seed data exists."""
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def get_token(client, email: str, password: str = "DevPassword123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["data"]["access_token"]


def test_attendance_sessions_reject_outside_department_access(client):
    from app.models.department import Department
    from uuid import uuid4
    hod_headers = {"Authorization": f"Bearer {get_token(client, 'hod.cse@smartedu.local')}"}
    student_headers = {"Authorization": f"Bearer {get_token(client, 'student1@smartedu.local')}"}
    with SessionLocal() as db:
        faculty = db.query(User).filter(User.email == "faculty1@smartedu.local").one()
        existing_course = db.query(Course).first()
        department = Department(name=f"Scope test {uuid4()}", code=f"T{uuid4().hex[:6]}")
        db.add(department)
        db.flush()
        course = Course(course_code=f"T{uuid4().hex[:6]}", name="Restricted course", department_id=department.id, semester_id=existing_course.semester_id, credits=3)
        db.add(course)
        db.flush()
        session = AttendanceSession(course_id=course.id, faculty_id=faculty.id, session_date=date.today())
        db.add(session)
        db.commit()
        try:
            for headers in (hod_headers, student_headers):
                assert client.get(f"/api/v1/courses/{course.id}/attendance-sessions", headers=headers).status_code == 403
                assert client.get(f"/api/v1/attendance/sessions/{session.id}", headers=headers).status_code == 403
                assert client.post(f"/api/v1/attendance/sessions/{session.id}/close", headers=headers).status_code == 403
            response = client.post("/api/v1/attendance/sessions", headers=hod_headers, json={"course_id": course.id, "session_date": date.today().isoformat()})
            assert response.status_code == 403
        finally:
            db.delete(session)
            db.delete(course)
            db.delete(department)
            db.commit()


def test_timetable_creation_and_conflict_detection(client):
    """Test timetable creation, faculty assignment scoping, and conflict rejection."""
    db = SessionLocal()
    try:
        db.query(AttendanceCorrection).delete()
        db.query(AttendanceRecord).delete()
        db.query(AttendanceSession).delete()
        db.query(ClassSchedule).delete()
        db.commit()
    finally:
        db.close()

    db = SessionLocal()
    try:
        admin_token = get_token(client, "admin@smartedu.local")
        faculty_user = db.query(User).filter(User.email == "faculty1@smartedu.local").first()
        course = db.query(Course).first()

        # 1. Admin creates valid schedule
        sched_data = {
            "course_id": course.id,
            "faculty_id": faculty_user.id,
            "section_name": "A",
            "day_of_week": "MONDAY",
            "start_time": "09:00",
            "end_time": "10:00",
            "room": "Room-101",
            "building": "Main Block",
            "academic_period": "Fall 2026",
        }
        resp = client.post(
            "/api/v1/timetable/schedules",
            json=sched_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201, f"Step 1 failed: {resp.text}"
        created_sched = resp.json()
        assert created_sched["room"] == "Room-101"

        # 2. Conflict A: Same Faculty at overlapping time (09:30 - 10:30 on MONDAY)
        overlap_faculty_data = {
            "course_id": course.id,
            "faculty_id": faculty_user.id,
            "section_name": "B",
            "day_of_week": "MONDAY",
            "start_time": "09:30",
            "end_time": "10:30",
            "room": "Room-102",
        }
        resp_f = client.post(
            "/api/v1/timetable/schedules",
            json=overlap_faculty_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_f.status_code == 409
        assert "Faculty conflict" in resp_f.json()["detail"]

        # 3. Conflict B: Same Room at overlapping time (09:30 - 10:30 on MONDAY) with different faculty
        other_faculty = db.query(User).join(User.role).filter(User.role.has(name="FACULTY"), User.id != faculty_user.id).first()
        if other_faculty:
            overlap_room_data = {
                "course_id": course.id,
                "faculty_id": other_faculty.id,
                "section_name": "B",
                "day_of_week": "MONDAY",
                "start_time": "09:30",
                "end_time": "10:30",
                "room": "Room-101",  # Same room
            }
            resp_r = client.post(
                "/api/v1/timetable/schedules",
                json=overlap_room_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert resp_r.status_code == 409
            assert "Room conflict" in resp_r.json()["detail"]
    finally:
        db.close()


def test_attendance_session_and_bulk_marking(client):
    """Test attendance session creation by assigned faculty and bulk student marking."""
    db = SessionLocal()
    try:
        faculty_user = db.query(User).filter(User.email == "faculty1@smartedu.local").first()
        faculty_token = get_token(client, "faculty1@smartedu.local")
        
        # Course assigned to faculty
        ci = db.query(CourseInstructor).filter(CourseInstructor.faculty_id == faculty_user.id).first()
        assert ci is not None, "Faculty must have an assigned course"
        course_id = ci.course_id

        # 1. Create Session
        today = date.today().isoformat()
        sess_resp = client.post(
            "/api/v1/attendance/sessions",
            json={
                "course_id": course_id,
                "session_date": today,
                "start_time": "09:00",
                "end_time": "10:00",
                "topic_covered": "Relational Algebra",
            },
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert sess_resp.status_code == 201
        session_data = sess_resp.json()
        session_id = session_data["id"]

        # 2. Get Enrolled Students
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()
        assert len(enrollments) > 0, "Need enrolled students to mark attendance"

        # 3. Bulk mark attendance
        records = [
            {"student_id": enr.student_id, "status": "PRESENT", "minutes_late": 0}
            for enr in enrollments
        ]
        records[0]["status"] = "ABSENT"

        mark_resp = client.post(
            f"/api/v1/attendance/sessions/{session_id}/records",
            json={"records": records},
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert mark_resp.status_code == 200
        assert mark_resp.json()["records_saved"] == len(records)
        assert mark_resp.json()["absence_notifications_sent"] == 1

        absent_user = db.query(User).filter(User.id == records[0]["student_id"]).first()
        absent_token = get_token(client, absent_user.email)
        notification_resp = client.get(
            "/api/v1/notifications?unread_only=true",
            headers={"Authorization": f"Bearer {absent_token}"},
        )
        assert notification_resp.status_code == 200
        absence_notifications = [
            item for item in notification_resp.json()
            if item["source_type"] == "ATTENDANCE" and item["source_id"] == session_id
        ]
        assert len(absence_notifications) == 1
        assert absence_notifications[0]["action_url"] == f"/student?catchUpSession={session_id}"

        catch_up = client.get(
            f"/api/v1/attendance/sessions/{session_id}/catch-up",
            headers={"Authorization": f"Bearer {absent_token}"},
        )
        assert catch_up.status_code == 200
        assert catch_up.json()["topic"] == "Relational Algebra"

        # 4. Verify Session Detail
        detail_resp = client.get(
            f"/api/v1/attendance/sessions/{session_id}",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert detail_resp.status_code == 200
        det = detail_resp.json()
        assert det["total_records"] == len(records)
        assert det["present_count"] >= 1
    finally:
        db.close()


def test_session_closure_and_immutability(client):
    """Test that closing an attendance session prevents direct modification."""
    db = SessionLocal()
    try:
        faculty_user = db.query(User).filter(User.email == "faculty1@smartedu.local").first()
        faculty_token = get_token(client, "faculty1@smartedu.local")
        
        ci = db.query(CourseInstructor).filter(CourseInstructor.faculty_id == faculty_user.id).first()
        course_id = ci.course_id

        # 1. Create session
        sess_resp = client.post(
            "/api/v1/attendance/sessions",
            json={
                "course_id": course_id,
                "session_date": (date.today() - timedelta(days=1)).isoformat(),
                "topic_covered": "Indexing & Hash Tables",
            },
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert sess_resp.status_code == 201
        session_id = sess_resp.json()["id"]

        # 2. Close Session
        close_resp = client.post(
            f"/api/v1/attendance/sessions/{session_id}/close",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert close_resp.status_code == 200
        assert close_resp.json()["status"] == "CLOSED"

        # 3. Attempt to mark records on CLOSED session -> Must be rejected (400 Bad Request)
        student_enr = db.query(Enrollment).filter(Enrollment.course_id == course_id).first()
        if student_enr:
            attempt_resp = client.post(
                f"/api/v1/attendance/sessions/{session_id}/records",
                json={"records": [{"student_id": student_enr.student_id, "status": "PRESENT"}]},
                headers={"Authorization": f"Bearer {faculty_token}"},
            )
            assert attempt_resp.status_code == 400
            assert "locked" in attempt_resp.json()["detail"].lower()
    finally:
        db.close()


def test_attendance_correction_workflow(client):
    """Test the formal correction request and HOD approval lifecycle."""
    db = SessionLocal()
    try:
        faculty_token = get_token(client, "faculty1@smartedu.local")
        hod_token = get_token(client, "hod.cse@smartedu.local")

        # Find an attendance record
        record = db.query(AttendanceRecord).filter(AttendanceRecord.status == AttendanceStatus.ABSENT).first()
        if not record:
            session = db.query(AttendanceSession).first()
            student = db.query(User).join(User.role).filter(User.role.has(name="STUDENT")).first()
            record = AttendanceRecord(session_id=session.id, student_id=student.id, status=AttendanceStatus.ABSENT)
            db.add(record)
            db.commit()
            db.refresh(record)

        # 1. Faculty requests correction
        corr_resp = client.post(
            "/api/v1/attendance/corrections",
            json={
                "record_id": record.id,
                "requested_status": "PRESENT",
                "reason": "Student attended the laboratory session but was incorrectly marked absent.",
            },
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert corr_resp.status_code == 201
        correction_id = corr_resp.json()["id"]

        # 2. HOD views pending corrections
        pending_resp = client.get(
            "/api/v1/hod/attendance/pending-corrections",
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert pending_resp.status_code == 200
        assert any(c["id"] == correction_id for c in pending_resp.json())

        # 3. HOD approves correction
        review_resp = client.patch(
            f"/api/v1/attendance/corrections/{correction_id}",
            json={"approval_status": "APPROVED", "review_notes": "Verified with lab attendance log. Approved."},
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert review_resp.status_code == 200
        assert review_resp.json()["approval_status"] == "APPROVED"

        # 4. Verify underlying AttendanceRecord.status is now PRESENT
        db.refresh(record)
        assert record.status == AttendanceStatus.PRESENT
    finally:
        db.close()


def test_student_attendance_dashboard_and_calculations(client):
    """Test student self-scope attendance view, percentage calculations, and IDOR protection."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        student_token = get_token(client, "student1@smartedu.local")
        other_student = db.query(User).filter(User.email == "student2@smartedu.local").first()

        # 1. Student queries own attendance
        resp = client.get(
            "/api/v1/students/me/attendance",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_id"] == student.id
        assert data["overall_status"] in ["GOOD", "WARNING", "CRITICAL"]
        assert isinstance(data["overall_percentage"], (int, float))

        # 2. IDOR Attack: Student attempts to access another student's attendance
        if other_student:
            idor_resp = client.get(
                f"/api/v1/students/{other_student.id}/attendance",
                headers={"Authorization": f"Bearer {student_token}"},
            )
            assert idor_resp.status_code == 403
            assert "only view their own" in idor_resp.json()["detail"].lower()
    finally:
        db.close()


def test_academic_engagement_score(client):
    """Test academic engagement composite score calculation."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        student_token = get_token(client, "student1@smartedu.local")

        resp = client.get(
            f"/api/v1/students/{student.id}/engagement-score",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        eng = resp.json()
        assert "engagement_percentage" in eng
        assert "attendance_rate" in eng
        assert "assignment_rate" in eng
        assert "exam_participation_rate" in eng
        assert eng["rating"] in ["HIGH", "MODERATE", "NEEDS_ATTENTION"]
    finally:
        db.close()
