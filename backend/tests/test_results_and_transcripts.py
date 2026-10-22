"""Automated Pytest Suite for Phase 09: Results, Gradebook, GPA/CGPA & Transcript Engine."""

import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from tests.fixtures import seed_database
from app.models.user import User
from app.models.department import Department
from app.models.course import Course, CourseInstructor
from app.models.semester import Semester
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.result import (
    GradeScale,
    GradeScaleItem,
    CourseAssessmentWeight,
    CourseResult,
    ResultComponentScore,
    ResultCorrectionRequest,
    SemesterResult,
    ResultStatus,
    AcademicStatus,
    CorrectionRequestStatus,
    AssessmentComponentType,
)
from app.results.calculations import ResultCalculationEngine


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


def test_calculation_engine_unit_math():
    """Test deterministic mathematical formulas for normalization, grade mapping, and GPA."""
    # 1. Normalization
    assert ResultCalculationEngine.normalize_score(45.0, 50.0) == 90.0
    assert ResultCalculationEngine.normalize_score(80.0, 100.0) == 80.0
    assert ResultCalculationEngine.normalize_score(0.0, 100.0) == 0.0

    # 2. Weighted Score
    assert ResultCalculationEngine.calculate_weighted_score(90.0, 40.0) == 36.0
    assert ResultCalculationEngine.calculate_weighted_score(80.0, 60.0) == 48.0

    # 3. Grade & Grade Point Mapping
    grd, gp, is_pass = ResultCalculationEngine.resolve_grade_and_point(92.5)
    assert grd == "A+"
    assert gp == 10.0
    assert is_pass is True

    grd_f, gp_f, is_pass_f = ResultCalculationEngine.resolve_grade_and_point(35.0)
    assert grd_f == "F"
    assert gp_f == 0.0
    assert is_pass_f is False

    # 4. Credit-Weighted GPA: Course A (4 Cr, GP 10), Course B (3 Cr, GP 8), Course C (3 Cr, GP 6)
    # Total Points: (4*10) + (3*8) + (3*6) = 40 + 24 + 18 = 82
    # Total Credits: 4 + 3 + 3 = 10 -> GPA = 8.2
    courses = [
        {"credits": 4, "grade_point": 10.0, "is_passing": True},
        {"credits": 3, "grade_point": 8.0, "is_passing": True},
        {"credits": 3, "grade_point": 6.0, "is_passing": True},
    ]
    gpa, reg_cr, earn_cr = ResultCalculationEngine.calculate_gpa(courses)
    assert gpa == 8.2
    assert reg_cr == 10
    assert earn_cr == 10


def test_grade_scale_creation_and_defaults(client):
    """Test grade scale endpoints, default initialization, and admin authorization."""
    # 1. Clean up custom scale if exists
    db = SessionLocal()
    try:
        db.query(GradeScale).filter(GradeScale.name == "Graduate 4-Point Scale").delete()
        db.commit()
    finally:
        db.close()

    # 2. Get default scale
    admin_token = get_token(client, "admin@smartedu.local")
    student_token = get_token(client, "student1@smartedu.local")
    resp = client.get("/api/v1/results/grade-scales/default", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    scale = resp.json()
    assert scale["name"] == "Standard Institutional 10-Point Scale"
    assert len(scale["items"]) >= 7

    # 2. Admin creates custom scale
    custom_scale_data = {
        "name": "Graduate 4-Point Scale",
        "description": "4.0 GPA scale for graduate programs",
        "is_default": False,
        "items": [
            {"grade": "A", "minimum_percentage": 90.0, "maximum_percentage": 100.0, "grade_point": 4.0, "is_passing": True},
            {"grade": "B", "minimum_percentage": 80.0, "maximum_percentage": 89.99, "grade_point": 3.0, "is_passing": True},
            {"grade": "C", "minimum_percentage": 70.0, "maximum_percentage": 79.99, "grade_point": 2.0, "is_passing": True},
            {"grade": "F", "minimum_percentage": 0.0, "maximum_percentage": 69.99, "grade_point": 0.0, "is_passing": False},
        ],
    }
    create_resp = client.post(
        "/api/v1/results/grade-scales",
        json=custom_scale_data,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["name"] == "Graduate 4-Point Scale"

    # 3. Student forbidden from creating grade scales (403)
    student_resp = client.post(
        "/api/v1/results/grade-scales",
        json=custom_scale_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_resp.status_code == 403


def test_assessment_weights_validation(client):
    """Test assessment weight distribution configuration and strict 100% sum validation."""
    db = SessionLocal()
    try:
        faculty_token = get_token(client, "faculty1@smartedu.local")
        course = db.query(Course).first()
        semester = db.query(Semester).first()

        # 1. Invalid weight sum (40 + 40 = 80% != 100%) -> Rejected 400 Bad Request
        invalid_data = {
            "course_id": course.id,
            "semester_id": semester.id,
            "weights": [
                {"component_type": "ASSIGNMENT", "weight_percentage": 40.0, "minimum_passing_percentage": 40.0, "is_mandatory": True},
                {"component_type": "FINAL_EXAM", "weight_percentage": 40.0, "minimum_passing_percentage": 40.0, "is_mandatory": True},
            ],
        }
        resp_inv = client.post(
            "/api/v1/results/weights",
            json=invalid_data,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_inv.status_code == 400
        assert "must sum to exactly 100%" in resp_inv.json()["detail"]

        # 2. Valid weight sum (30% Assignment + 20% Quiz + 50% Final Exam = 100%)
        valid_data = {
            "course_id": course.id,
            "semester_id": semester.id,
            "weights": [
                {"component_type": "ASSIGNMENT", "weight_percentage": 30.0, "minimum_passing_percentage": 40.0, "is_mandatory": True},
                {"component_type": "QUIZ", "weight_percentage": 20.0, "minimum_passing_percentage": 40.0, "is_mandatory": True},
                {"component_type": "FINAL_EXAM", "weight_percentage": 50.0, "minimum_passing_percentage": 40.0, "is_mandatory": True},
            ],
        }
        resp_val = client.post(
            "/api/v1/results/weights",
            json=valid_data,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_val.status_code == 200
        weights_res = resp_val.json()
        assert len(weights_res) == 3
    finally:
        db.close()


def test_gradebook_and_result_lifecycle(client):
    """Test full result calculation, submission, HOD approval, and publication lifecycle."""
    db = SessionLocal()
    try:
        db.query(ResultCorrectionRequest).delete()
        db.query(ResultComponentScore).delete()
        db.query(CourseResult).delete()
        db.query(SemesterResult).delete()
        db.commit()

        faculty_token = get_token(client, "faculty1@smartedu.local")
        hod_token = get_token(client, "hod.cse@smartedu.local")
        
        ci = db.query(CourseInstructor).first()
        course_id = ci.course_id
        course = db.query(Course).filter(Course.id == course_id).first()

        # 1. View Gradebook
        gb_resp = client.get(
            f"/api/v1/results/courses/{course_id}/gradebook",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert gb_resp.status_code == 200
        gb_data = gb_resp.json()
        assert gb_data["course_id"] == course_id
        assert len(gb_data["roster"]) > 0

        # 2. Calculate Results
        calc_resp = client.post(
            f"/api/v1/results/courses/{course_id}/calculate",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert calc_resp.status_code == 200
        calc_results = calc_resp.json()
        assert len(calc_results) > 0
        assert calc_results[0]["status"] == "CALCULATED"

        # 3. Submit Results to HOD
        sub_resp = client.post(
            f"/api/v1/results/courses/{course_id}/submit",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert sub_resp.status_code == 200
        assert sub_resp.json()["submitted_count"] > 0

        # 4. HOD Reviews & Approves Results
        review_resp = client.post(
            f"/api/v1/results/courses/{course_id}/review",
            json={"approval_status": "APPROVED", "review_notes": "Reviewed and verified by HOD."},
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert review_resp.status_code == 200
        assert review_resp.json()["reviewed_count"] > 0

        # 5. HOD Publishes Results
        pub_resp = client.post(
            f"/api/v1/results/courses/{course_id}/publish",
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert pub_resp.status_code == 200
        assert pub_resp.json()["published_count"] > 0

        # 6. Lock Results
        lock_resp = client.post(
            f"/api/v1/results/courses/{course_id}/lock",
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert lock_resp.status_code == 200
        assert lock_resp.json()["locked_count"] > 0
    finally:
        db.close()


def test_result_correction_workflow(client):
    """Test formal result correction audit request and approval."""
    db = SessionLocal()
    try:
        faculty_token = get_token(client, "faculty1@smartedu.local")
        hod_token = get_token(client, "hod.cse@smartedu.local")

        # Find a published/locked result
        res = db.query(CourseResult).filter(CourseResult.status.in_([ResultStatus.PUBLISHED, ResultStatus.LOCKED])).first()
        assert res is not None, "Need a published result to test correction"

        # 1. Faculty requests correction
        corr_data = {
            "result_id": res.id,
            "requested_grade": "A+",
            "requested_percentage": 94.0,
            "reason": "Re-evaluation of final project component increased score by 10 marks.",
        }
        corr_resp = client.post(
            "/api/v1/results/corrections",
            json=corr_data,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert corr_resp.status_code == 201
        correction_id = corr_resp.json()["id"]

        # 2. HOD Approves Correction
        approve_resp = client.patch(
            f"/api/v1/results/corrections/{correction_id}",
            json={"approval_status": "APPROVED", "review_notes": "Re-evaluation verified and approved."},
            headers={"Authorization": f"Bearer {hod_token}"},
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "APPROVED"

        # 3. Verify underlying CourseResult has been updated to A+ (94.0%)
        db.refresh(res)
        assert res.final_percentage == 94.0
        assert res.letter_grade == "A+"
        assert res.grade_point == 10.0
    finally:
        db.close()


def test_student_transcript_and_idor_protection(client):
    """Test student official transcript compilation and IDOR access blocking."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student1@smartedu.local").first()
        student_token = get_token(client, "student1@smartedu.local")
        other_student = db.query(User).filter(User.email == "student2@smartedu.local").first()

        # 1. Student retrieves own transcript
        resp = client.get(
            "/api/v1/results/students/me/transcript",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_id"] == student.id
        assert "cumulative_gpa" in data
        assert data["academic_standing"] in ["GOOD_STANDING", "DEAN_LIST", "PROBATION"]
        assert len(data["semesters"]) > 0

        # 2. IDOR Attack: Student attempts to query other student's transcript -> Rejected 403
        if other_student:
            idor_resp = client.get(
                f"/api/v1/results/students/{other_student.id}/transcript",
                headers={"Authorization": f"Bearer {student_token}"},
            )
            assert idor_resp.status_code == 403
            assert "only view their own" in idor_resp.json()["detail"].lower()
    finally:
        db.close()


def test_analytics_and_vc_oversight(client):
    """Test course, department, and institution-wide result analytics."""
    db = SessionLocal()
    try:
        vc_token = get_token(client, "vc@smartedu.local")
        dept = db.query(Department).first()

        # VC Institutional Analytics
        resp = client.get(
            "/api/v1/results/vc/institution/analytics",
            headers={"Authorization": f"Bearer {vc_token}"},
        )
        assert resp.status_code == 200
        inst_data = resp.json()
        assert "institution_average_gpa" in inst_data
        assert "institution_pass_rate" in inst_data
        assert len(inst_data["department_rankings"]) > 0
    finally:
        db.close()
