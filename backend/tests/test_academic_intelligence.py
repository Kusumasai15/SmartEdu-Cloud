"""Automated Pytest Suite for Phase 10: Academic Intelligence, AI Insights & Early-Warning Engine."""

import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.department import Department
from app.models.course import Course, CourseInstructor
from app.models.semester import Semester
from app.models.academic_intelligence import (
    AcademicRiskSnapshot,
    RiskConfiguration,
    InsightAlert,
    AcademicRiskLevel,
    PerformanceTrendDirection,
    CourseHealthStatus,
)
from app.intelligence.calculations import (
    AcademicDataAggregator,
    PerformanceTrendEngine,
    AcademicRiskEngine,
    CourseHealthEngine,
)
from app.intelligence.ai.safety import AISafetyManager
from app.intelligence.ai.insight_service import AcademicAIInsightService


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


def test_academic_data_aggregator_unit():
    """Test data aggregation from database records."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        assert student is not None

        metrics = AcademicDataAggregator.aggregate_student_metrics(db, student.id)
        assert "attendance_percentage" in metrics
        assert "assignment_completion_rate" in metrics
        assert "exam_average_percentage" in metrics
        assert "current_gpa" in metrics
        assert 0.0 <= metrics["attendance_percentage"] <= 100.0
    finally:
        db.close()


def test_deterministic_risk_engine_calculations():
    """Test risk calculation score and severity level categorization with explainable reasons."""
    # 1. Optimal Profile -> LOW Risk
    optimal_metrics = {
        "attendance_percentage": 95.0,
        "assignment_completion_rate": 100.0,
        "exam_average_percentage": 90.0,
        "current_gpa": 9.2,
        "cumulative_gpa": 9.0,
        "failed_courses_count": 0,
    }
    score_low, level_low, factors_low = AcademicRiskEngine.calculate_risk_profile(
        optimal_metrics, PerformanceTrendDirection.IMPROVING
    )
    assert score_low < 20.0
    assert level_low == AcademicRiskLevel.LOW
    assert len(factors_low) > 0

    # 2. Critical Profile -> CRITICAL Risk
    critical_metrics = {
        "attendance_percentage": 58.0,  # Below 65% -> 25 pts
        "assignment_completion_rate": 40.0,  # Below 50% -> 20 pts
        "exam_average_percentage": 40.0,  # Below 45% -> 30 pts
        "current_gpa": 4.5,
        "cumulative_gpa": 4.8,
        "failed_courses_count": 2,  # 2 backlogs -> force CRITICAL
    }
    score_crit, level_crit, factors_crit = AcademicRiskEngine.calculate_risk_profile(
        critical_metrics, PerformanceTrendDirection.DECLINING  # 25 pts
    )
    assert score_crit >= 75.0
    assert level_crit == AcademicRiskLevel.CRITICAL
    # Verify explainable bullet reasons
    reasons_text = " ".join([f.reason for f in factors_crit])
    assert "Attendance is at 58.0%" in reasons_text
    assert "Assignment completion rate is 40.0%" in reasons_text
    assert "backlog count" in reasons_text


def test_course_health_and_difficult_topics():
    """Test course health score evaluation and difficult topic detection."""
    db = SessionLocal()
    try:
        course = db.query(Course).first()
        assert course is not None

        health = CourseHealthEngine.evaluate_course_health(db, course.id)
        assert health.course_id == course.id
        assert health.health_status in [CourseHealthStatus.HEALTHY, CourseHealthStatus.WATCH, CourseHealthStatus.AT_RISK]
        assert 0.0 <= health.health_score <= 100.0
        assert len(health.difficult_topics) > 0
    finally:
        db.close()


def test_ai_insights_and_safety_fallback():
    """Offline generation must not fabricate academic guidance."""
    mock_metrics = {
        "current_gpa": 8.42,
        "cumulative_gpa": 8.18,
        "attendance_percentage": 91.0,
        "assignment_completion_rate": 94.0,
        "exam_average_percentage": 88.0,
        "failed_courses_count": 0,
    }

    # 1. PII Sanitization
    safe_ctx = AISafetyManager.sanitize_student_context(mock_metrics, "Improving trend")
    assert "student_name" not in safe_ctx
    assert "email" not in safe_ctx
    assert safe_ctx["gpa"] == 8.42

    # 2. Offline generation is explicit and empty rather than fabricated.
    insight_text, is_ai = AcademicAIInsightService.generate_student_study_insights(
        mock_metrics, "Improving trend"
    )
    assert insight_text == ""
    assert is_ai is False


def test_student_intelligence_endpoint_and_idor(client):
    """Test student intelligence endpoint, recommendation generation, and IDOR protection."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        other_student = db.query(User).filter(User.email == "student2@smartedu.local").first()
        student_token = get_token(client, "student1@smartedu.local")

        # 1. Student queries own academic intelligence
        resp = client.get(
            "/api/v1/intelligence/student/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["profile"]["student_id"] == student.id
        assert "risk_score" in data["profile"]
        assert data["profile"]["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert len(data["recommendations"]) > 0

        # 2. IDOR Attack: Student attempts to access another student's profile -> Rejected 403
        if other_student:
            idor_resp = client.get(
                f"/api/v1/intelligence/student/{other_student.id}",
                headers={"Authorization": f"Bearer {student_token}"},
            )
            assert idor_resp.status_code == 403
            assert "only view their own" in idor_resp.json()["detail"].lower()
    finally:
        db.close()


def test_faculty_course_intelligence_scoping(client):
    """Test faculty course health endpoint with assigned-course scoping."""
    db = SessionLocal()
    try:
        faculty_token = get_token(client, "faculty1@smartedu.local")
        ci = db.query(CourseInstructor).first()
        assigned_course_id = ci.course_id

        # 1. Faculty queries assigned course intelligence
        resp = client.get(
            f"/api/v1/intelligence/courses/{assigned_course_id}",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp.status_code == 200
        course_data = resp.json()
        assert course_data["course_id"] == assigned_course_id
        assert "health_status" in course_data
        assert "class_average_percentage" in course_data
    finally:
        db.close()


def test_hod_and_vc_intelligence_endpoints(client):
    """Test HOD department intelligence and VC university-wide intelligence."""
    db = SessionLocal()
    try:
        hod_token = get_token(client, "hod.cse@smartedu.local")
        vc_token = get_token(client, "vc@smartedu.local")
        dept = db.query(Department).first()

        # 1. HOD Department Intelligence
        hod_resp = client.get(
            f"/api/v1/intelligence/hod/departments/{dept.id}",
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert hod_resp.status_code == 200
        hod_data = hod_resp.json()
        assert hod_data["department_id"] == dept.id
        assert "department_average_gpa" in hod_data
        assert "at_risk_roster" in hod_data

        # 2. VC Institutional Intelligence
        vc_resp = client.get(
            "/api/v1/intelligence/vc/institution",
            headers={"Authorization": f"Bearer {vc_token}"},
        )
        assert vc_resp.status_code == 200
        vc_data = vc_resp.json()
        assert "institution_average_gpa" in vc_data
        assert "department_health_rankings" in vc_data
        assert len(vc_data["department_health_rankings"]) > 0
    finally:
        db.close()
