"""Automated Pytest Suite for Phase 12: Advanced Attendance, Timetable, Leave & Scheduling Intelligence."""

import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.department import Department
from app.models.semester import Semester
from app.models.course import Course
from app.models.scheduling import (
    CalendarEventType,
    RoomType,
    LeaveType,
    LeaveStatus,
    SubstitutionStatus,
    AcademicCalendarEvent,
    AcademicRoom,
    StudentLeaveRequest,
    ScheduleChangeLog,
    SubstituteFacultyAssignment,
)
from app.models.attendance import AttendanceStatus, AttendanceSessionStatus, AttendanceSession, AttendanceRecord


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure standard seed data exists and scheduling tables are clean."""
    db = SessionLocal()
    try:
        seed_database(db)
        db.query(SubstituteFacultyAssignment).delete()
        db.query(ScheduleChangeLog).delete()
        db.query(StudentLeaveRequest).delete()
        db.query(AcademicRoom).delete()
        db.query(AcademicCalendarEvent).delete()
        db.commit()
    finally:
        db.close()


def get_token(client: TestClient, email: str, password: str = "DevPassword123!") -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_academic_calendar_and_holidays(client: TestClient):
    """Test academic calendar milestone creation, holiday management, and date validation."""
    admin_headers = get_token(client, "admin@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")
    today = date.today()

    # 1. Invalid date range (start > end) -> 400 Bad Request
    invalid_resp = client.post(
        "/api/v1/calendar/events",
        headers=admin_headers,
        json={
            "event_type": "HOLIDAY",
            "title": "Winter Break",
            "start_date": str(today + timedelta(days=10)),
            "end_date": str(today + timedelta(days=5)),
            "is_instructional_day": False,
        },
    )
    assert invalid_resp.status_code == 400
    assert "start date cannot be after end date" in invalid_resp.json()["detail"]

    # 2. Valid Milestone creation by Admin
    create_resp = client.post(
        "/api/v1/calendar/events",
        headers=admin_headers,
        json={
            "event_type": "SEMESTER_START",
            "title": "Fall 2026 Semester Commencement",
            "description": "First day of instruction for all undergraduate departments.",
            "start_date": str(today),
            "end_date": str(today),
            "is_instructional_day": True,
        },
    )
    assert create_resp.status_code == 201
    evt_data = create_resp.json()
    assert evt_data["title"] == "Fall 2026 Semester Commencement"
    assert evt_data["is_instructional_day"] is True

    # 3. Valid Holiday creation by Admin
    holiday_resp = client.post(
        "/api/v1/calendar/events",
        headers=admin_headers,
        json={
            "event_type": "HOLIDAY",
            "title": "National Republic Holiday",
            "start_date": str(today + timedelta(days=20)),
            "end_date": str(today + timedelta(days=21)),
            "is_instructional_day": False,
        },
    )
    assert holiday_resp.status_code == 201

    # 4. Query calendar events as student
    list_resp = client.get("/api/v1/calendar", headers=student_headers)
    assert list_resp.status_code == 200
    events = list_resp.json()
    assert len(events) >= 2
    titles = [e["title"] for e in events]
    assert "Fall 2026 Semester Commencement" in titles
    assert "National Republic Holiday" in titles


def test_room_inventory_and_capacity(client: TestClient):
    """Test physical room catalog creation, duplicate prevention, and capacity queries."""
    admin_headers = get_token(client, "admin@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")
    r_suffix = uuid.uuid4().hex[:4]

    # 1. Non-admin forbidden from creating rooms
    forbidden_resp = client.post(
        "/api/v1/rooms",
        headers=student_headers,
        json={
            "building": "Turing Block",
            "room_number": f"TR-{r_suffix}",
            "capacity": 80,
            "room_type": "CLASSROOM",
        },
    )
    assert forbidden_resp.status_code == 403

    # 2. Admin creates room
    create_resp = client.post(
        "/api/v1/rooms",
        headers=admin_headers,
        json={
            "building": "Turing Block",
            "room_number": f"TR-{r_suffix}",
            "capacity": 80,
            "room_type": "CLASSROOM",
            "has_projector": True,
            "has_recording": True,
        },
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["room_number"] == f"TR-{r_suffix}"

    # 3. Duplicate building + room_number rejected
    dup_resp = client.post(
        "/api/v1/rooms",
        headers=admin_headers,
        json={
            "building": "Turing Block",
            "room_number": f"TR-{r_suffix}",
            "capacity": 60,
            "room_type": "LAB",
        },
    )
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    # 4. Query rooms with capacity filter
    list_resp = client.get("/api/v1/rooms?min_capacity=50", headers=student_headers)
    assert list_resp.status_code == 200
    rooms = list_resp.json()
    assert any(r["room_number"] == f"TR-{r_suffix}" and r["capacity"] == 80 for r in rooms)


def test_room_details_update_and_delete_are_persistent_and_admin_only(client: TestClient):
    admin_headers = get_token(client, "admin@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")
    room_number = f"RM-{uuid.uuid4().hex[:8]}"
    payload = {
        "building": "Turing Block",
        "floor": "Second Floor",
        "room_number": room_number,
        "display_name": "Algorithms Classroom",
        "room_category": "LECTURE_HALL",
        "room_type": "CLASSROOM",
        "capacity": 75,
        "facilities": ["Smart Projector"],
        "operational_status": "AVAILABLE",
    }
    created = client.post("/api/v1/rooms", headers=admin_headers, json=payload)
    assert created.status_code == 201
    room_id = created.json()["id"]
    assert created.json()["floor"] == "Second Floor"
    assert created.json()["facilities"] == ["Smart Projector"]

    updated_payload = {**payload, "floor": "Third Floor", "capacity": 90, "operational_status": "MAINTENANCE"}
    assert client.put(f"/api/v1/rooms/{room_id}", headers=student_headers, json=updated_payload).status_code == 403
    updated = client.put(f"/api/v1/rooms/{room_id}", headers=admin_headers, json=updated_payload)
    assert updated.status_code == 200
    assert updated.json()["floor"] == "Third Floor"
    assert updated.json()["capacity"] == 90
    listed = client.get("/api/v1/rooms", headers=admin_headers)
    assert any(room["id"] == room_id and room["operational_status"] == "MAINTENANCE" for room in listed.json())

    assert client.delete(f"/api/v1/rooms/{room_id}", headers=student_headers).status_code == 403
    assert client.delete(f"/api/v1/rooms/{room_id}", headers=admin_headers).status_code == 204
    assert all(room["id"] != room_id for room in client.get("/api/v1/rooms", headers=admin_headers).json())


def test_timetable_conflict_detection_and_rescheduling(client: TestClient):
    """Test multi-vector timetable conflict checking, rescheduling with change logs, and substitutions."""
    admin_headers = get_token(client, "admin@smartedu.local")
    faculty_headers = get_token(client, "faculty1@smartedu.local")

    db = SessionLocal()
    try:
        dept = db.query(Department).first()
        dept_id = dept.id
        sem = db.query(Semester).first()
        sem_id = sem.id
    finally:
        db.close()

    c_code = f"AERO_{uuid.uuid4().hex[:6]}"
    course_resp = client.post(
        "/api/v1/courses",
        headers=admin_headers,
        json={
            "name": "Fluid Dynamics",
            "course_code": c_code,
            "credits": 4,
            "department_id": dept_id,
            "semester_id": sem_id,
        },
    )
    assert course_resp.status_code == 201
    course_id = course_resp.json()["data"]["id"]

    # Assign faculty to course
    fac_me = client.get("/api/v1/auth/me", headers=faculty_headers).json()["data"]
    fac_id = fac_me["id"]

    client.post(
        f"/api/v1/courses/{course_id}/instructors",
        headers=admin_headers,
        json={"faculty_id": fac_id, "is_primary": True},
    )

    unique_room = f"ROOM_{uuid.uuid4().hex[:4]}"
    # Create active schedule: Friday 15:00 - 16:30 in unique_room
    sched_resp = client.post(
        "/api/v1/timetable/schedules",
        headers=admin_headers,
        json={
            "course_id": course_id,
            "faculty_id": fac_id,
            "day_of_week": "FRIDAY",
            "start_time": "15:00",
            "end_time": "16:30",
            "room": unique_room,
            "building": "Main Block",
            "section_name": "A",
            "academic_period": "Fall 2026",
        },
    )
    assert sched_resp.status_code == 201
    sched_id = sched_resp.json()["id"]

    # 2. Test Conflict Engine for overlapping schedule (Friday 15:30 - 17:00 in same room)
    conflict_check = client.post(
        "/api/v1/timetable-advanced/conflict-check",
        headers=faculty_headers,
        json={
            "course_id": course_id,
            "faculty_id": fac_id,
            "day_of_week": "FRIDAY",
            "start_time": "15:30",
            "end_time": "17:00",
            "room": unique_room,
        },
    )
    assert conflict_check.status_code == 200
    report = conflict_check.json()
    assert report["has_conflicts"] is True
    assert report["is_blocked"] is True
    c_types = [c["conflict_type"] for c in report["conflicts"]]
    assert "FACULTY_OVERLAP" in c_types
    assert "ROOM_DOUBLE_BOOKED" in c_types

    # 3. Reschedule session to a non-conflicting time (Saturday 10:00 - 11:30 in Room C-202)
    resched_resp = client.post(
        f"/api/v1/timetable-advanced/schedules/{sched_id}/reschedule",
        headers=faculty_headers,
        json={
            "new_day_of_week": "SATURDAY",
            "new_start_time": "10:00",
            "new_end_time": "11:30",
            "new_room": "C-202",
            "reason": "Lab equipment calibration required on Friday afternoon.",
        },
    )
    assert resched_resp.status_code == 200
    updated_sched = resched_resp.json()
    assert updated_sched["day_of_week"] == "SATURDAY"
    assert updated_sched["start_time"] == "10:00"
    assert updated_sched["room"] == "C-202"

    # 4. Assign substitute faculty
    db = SessionLocal()
    try:
        sub_fac = db.query(User).filter(User.email == "faculty2@smartedu.local").first()
        sub_fac_id = sub_fac.id
    finally:
        db.close()

    sub_assign_resp = client.post(
        f"/api/v1/timetable-advanced/schedules/{sched_id}/substitute",
        headers=faculty_headers,
        json={
            "substitute_faculty_id": sub_fac_id,
            "assigned_date": str(date.today() + timedelta(days=1)),
            "reason": "Attending international conference symposium.",
        },
    )
    assert sub_assign_resp.status_code == 201
    assert sub_assign_resp.json()["status"] == "ACTIVE"


def test_student_leave_lifecycle_and_attendance_integration(client: TestClient):
    """Test student leave application, overlap prevention, HOD approval, and automatic attendance EXCUSED sync."""
    admin_headers = get_token(client, "admin@smartedu.local")
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")

    db = SessionLocal()
    try:
        dept = db.query(Department).first()
        dept_id = dept.id
        sem = db.query(Semester).first()
        sem_id = sem.id
    finally:
        db.close()

    # 1. Setup course, enrollment, and attendance session with ABSENT record
    c_code = f"ROB_{uuid.uuid4().hex[:6]}"
    course_resp = client.post(
        "/api/v1/courses",
        headers=admin_headers,
        json={
            "name": "Robotics Engineering",
            "course_code": c_code,
            "credits": 3,
            "department_id": dept_id,
            "semester_id": sem_id,
        },
    )
    assert course_resp.status_code == 201
    course_id = course_resp.json()["data"]["id"]

    fac_me = client.get("/api/v1/auth/me", headers=faculty_headers).json()["data"]
    fac_id = fac_me["id"]

    # Assign faculty to course
    client.post(
        f"/api/v1/courses/{course_id}/instructors",
        headers=admin_headers,
        json={"faculty_id": fac_id, "is_primary": True},
    )

    # Student enrolls
    student_me = client.get("/api/v1/auth/me", headers=student_headers).json()["data"]
    student_id = student_me["id"]

    enroll_resp = client.post(
        f"/api/v1/courses/{course_id}/enroll",
        headers=student_headers,
    )
    assert enroll_resp.status_code == 201

    # Faculty creates attendance session for target_date
    target_date = date.today() + timedelta(days=2)
    sess_resp = client.post(
        "/api/v1/attendance/sessions",
        headers=faculty_headers,
        json={
            "course_id": course_id,
            "session_date": str(target_date),
            "start_time": "10:00",
            "end_time": "11:00",
            "topic_covered": "Kinematic Chains",
        },
    )
    assert sess_resp.status_code == 201
    sess_id = sess_resp.json()["id"]

    # Mark student ABSENT
    mark_resp = client.post(
        f"/api/v1/attendance/sessions/{sess_id}/records",
        headers=faculty_headers,
        json={
            "records": [
                {
                    "student_id": student_id,
                    "status": "ABSENT",
                    "minutes_late": 0,
                    "remarks": "Unexcused absence recorded.",
                }
            ]
        },
    )
    assert mark_resp.status_code == 200

    # 2. Student submits leave request covering target_date
    leave_resp = client.post(
        "/api/v1/leave",
        headers=student_headers,
        json={
            "leave_type": "MEDICAL",
            "start_date": str(target_date - timedelta(days=1)),
            "end_date": str(target_date + timedelta(days=1)),
            "reason": "Hospitalized for acute fever with medical certificate attached.",
        },
    )
    assert leave_resp.status_code == 201
    leave_id = leave_resp.json()["id"]
    assert leave_resp.json()["status"] == "SUBMITTED"

    # 3. Prevent duplicate/overlapping leave request
    dup_leave = client.post(
        "/api/v1/leave",
        headers=student_headers,
        json={
            "leave_type": "PERSONAL",
            "start_date": str(target_date),
            "end_date": str(target_date),
            "reason": "Family emergency.",
        },
    )
    assert dup_leave.status_code == 400
    assert "already have a leave request" in dup_leave.json()["detail"]

    # 4. Admin/HOD approves leave request
    review_resp = client.patch(
        f"/api/v1/leave/{leave_id}/review",
        headers=admin_headers,
        json={
            "status": "APPROVED",
            "review_notes": "Medical certificate verified by university health clinic.",
        },
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "APPROVED"

    # 5. Verify that AttendanceRecord automatically transformed to EXCUSED!
    sess_detail = client.get(
        f"/api/v1/attendance/sessions/{sess_id}",
        headers=faculty_headers,
    ).json()
    student_rec = next(r for r in sess_detail["records"] if r["student_id"] == student_id)
    assert student_rec["status"] == "EXCUSED"
    assert "Excused via approved leave" in student_rec["remarks"]


def test_faculty_workload_and_attendance_shortage_recovery(client: TestClient):
    """Test faculty teaching workload calculations and deterministic student shortage recovery math."""
    faculty_headers = get_token(client, "faculty1@smartedu.local")
    student_headers = get_token(client, "student1@smartedu.local")

    # 1. Faculty Workload calculation
    wl_resp = client.get(
        "/api/v1/scheduling-analytics/workload/me",
        headers=faculty_headers,
    )
    assert wl_resp.status_code == 200
    wl_data = wl_resp.json()
    assert "weekly_teaching_hours" in wl_data
    assert "total_assigned_courses" in wl_data
    assert wl_data["status"] in ["NORMAL", "HIGH", "OVERLOADED"]

    # 2. Student Shortage and Recovery guidance
    shortage_resp = client.get(
        "/api/v1/scheduling-analytics/shortage/me?target_threshold=75.0&remaining_sessions=10",
        headers=student_headers,
    )
    assert shortage_resp.status_code == 200
    shortage_data = shortage_resp.json()
    assert "overall_attendance_pct" in shortage_data
    assert "shortage_courses" in shortage_data
    for sc in shortage_data["shortage_courses"]:
        assert "minimum_sessions_to_attend" in sc
        assert "recovery_guidance" in sc
