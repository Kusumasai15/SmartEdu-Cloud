"""Comprehensive automated test suite for Phase 06 Assignments, Submissions & Grading."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import Base, SessionLocal, engine
from tests.fixtures import seed_database
from app.models.user import User
from app.models.course import Course
from app.models.assignment import Assignment, AssignmentStatus
from app.models.assignment_submission import AssignmentSubmission, SubmissionStatus

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure database has standard seed data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def test_assignment_lists_are_scoped_to_current_user():
    faculty = {"Authorization": f"Bearer {get_auth_token('faculty1@smartedu.local')}"}
    student = {"Authorization": f"Bearer {get_auth_token('student1@smartedu.local')}"}
    outsider = {"Authorization": f"Bearer {get_auth_token('faculty2@smartedu.local')}"}
    faculty_list = client.get("/api/v1/assignments/my", headers=faculty)
    student_list = client.get("/api/v1/assignments/my", headers=student)
    own_submissions = client.get("/api/v1/assignments/my-submissions", headers=student)
    assert faculty_list.status_code == 200
    assert student_list.status_code == 200
    assert own_submissions.status_code == 200
    assert all(item["status"] != "DRAFT" for item in student_list.json())

    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").one()
        created = client.post(f"/api/v1/courses/{course.id}/assignments", headers=faculty, json={
            "title": "Scoped submission list test",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "max_points": 10,
            "passing_points": 4,
        })
        assert created.status_code == 201, created.text
        denied = client.get(f"/api/v1/assignments/{created.json()['id']}/submissions", headers=outsider)
        assert denied.status_code == 403
    finally:
        db.close()


def get_auth_token(email: str, password: str = "DevPassword123!") -> str:
    """Helper to authenticate and retrieve access token."""
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["data"]["access_token"]


def test_faculty_create_assignment():
    """Faculty creates assignment in assigned course."""
    token = get_auth_token("faculty1@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        due_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        payload = {
            "title": "Assignment 1: Algorithms Complexity",
            "description": "Analyze Big-O bounds for sorting algorithms.",
            "instructions": "Submit a PDF report or write summary in the box.",
            "max_points": 100,
            "passing_points": 40,
            "due_date": due_date,
            "allow_late_submission": True,
            "status": "DRAFT",
        }

        resp = client.post(
            f"/api/v1/courses/{course.id}/assignments",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["title"] == payload["title"]
        assert data["status"] == "DRAFT"
        assert data["max_points"] == 100
    finally:
        db.close()


def test_unassigned_faculty_cannot_create_assignment():
    """Faculty cannot create assignment in a course they are not assigned to teach."""
    token = get_auth_token("faculty2@smartedu.local")
    db: Session = SessionLocal()
    try:
        cs_course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert cs_course is not None

        due_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        payload = {
            "title": "Unauthorized Assignment",
            "due_date": due_date,
            "max_points": 50,
            "passing_points": 20,
        }

        resp = client.post(
            f"/api/v1/courses/{cs_course.id}/assignments",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
    finally:
        db.close()


def test_student_cannot_see_draft_assignment():
    """Enrolled student cannot see draft assignments."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        due_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()

        # Faculty creates draft assignment
        resp = client.post(
            f"/api/v1/courses/{course.id}/assignments",
            json={
                "title": "Draft Lab 1",
                "due_date": due_date,
                "max_points": 50,
                "passing_points": 20,
                "status": "DRAFT",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert resp.status_code == 201
        assign_id = resp.json()["id"]

        # Student lists assignments
        list_resp = client.get(
            f"/api/v1/courses/{course.id}/assignments",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert list_resp.status_code == 200
        ids = [a["id"] for a in list_resp.json()]
        assert assign_id not in ids

        # Direct ID access by student is blocked
        direct_resp = client.get(
            f"/api/v1/assignments/{assign_id}",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert direct_resp.status_code == 403
    finally:
        db.close()


def test_faculty_publish_and_student_submit_workflow():
    """Complete workflow: Publish assignment -> Student submits -> Student resubmits."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        due_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

        # 1. Faculty creates and publishes assignment
        create_resp = client.post(
            f"/api/v1/courses/{course.id}/assignments",
            json={
                "title": "Lab 2: Dynamic Programming",
                "description": "Implement 0/1 Knapsack",
                "due_date": due_date,
                "max_points": 100,
                "passing_points": 40,
                "status": "PUBLISHED",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert create_resp.status_code == 201
        assign_id = create_resp.json()["id"]

        # 2. Student views assignment
        view_resp = client.get(
            f"/api/v1/assignments/{assign_id}",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert view_resp.status_code == 200
        assert view_resp.json()["title"] == "Lab 2: Dynamic Programming"

        # 3. Student submits solution
        sub_resp = client.post(
            f"/api/v1/assignments/{assign_id}/submit",
            json={
                "submission_text": "Solution: Used memoization table DP[N][W].",
                "attachment_url": "https://github.com/student/knapsack-repo",
            },
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert sub_resp.status_code == 201, sub_resp.text
        sub_data = sub_resp.json()
        assert sub_data["status"] == "SUBMITTED"
        assert sub_data["is_late"] is False

        # 4. Student checks own submission view
        my_sub_resp = client.get(
            f"/api/v1/assignments/{assign_id}/my-submission",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert my_sub_resp.status_code == 200
        my_data = my_sub_resp.json()
        assert my_data["is_submitted"] is True
        assert my_data["is_graded"] is False

        # 5. Student resubmits with updated code
        resub_resp = client.post(
            f"/api/v1/assignments/{assign_id}/submit",
            json={
                "submission_text": "Updated Solution: Optimized space complexity to O(W).",
                "attachment_url": "https://github.com/student/knapsack-v2",
            },
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert resub_resp.status_code == 201
        assert resub_resp.json()["status"] == "RESUBMITTED"
    finally:
        db.close()


def test_faculty_grade_and_publish_results():
    """Faculty grades student submission and releases results to students."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        due_date = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

        # 1. Create published assignment
        create_resp = client.post(
            f"/api/v1/courses/{course.id}/assignments",
            json={
                "title": "Lab 3: Graph Traversal",
                "due_date": due_date,
                "max_points": 100,
                "passing_points": 50,
                "status": "PUBLISHED",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assign_id = create_resp.json()["id"]

        # 2. Student submits
        sub_resp = client.post(
            f"/api/v1/assignments/{assign_id}/submit",
            json={"submission_text": "BFS and DFS implemented with adjacency lists."},
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        sub_id = sub_resp.json()["id"]

        # 3. Faculty grades submission
        grade_resp = client.post(
            f"/api/v1/submissions/{sub_id}/grade",
            json={
                "score": 95.5,
                "feedback": "Excellent clean implementation and time complexity analysis.",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert grade_resp.status_code == 200
        assert grade_resp.json()["score"] == 95.5
        assert grade_resp.json()["status"] == "GRADED"

        # 4. Before results published, student should not see score
        my_sub_1 = client.get(
            f"/api/v1/assignments/{assign_id}/my-submission",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert my_sub_1.status_code == 200
        assert my_sub_1.json()["submission"]["score"] is None

        # 5. Faculty publishes results
        pub_res = client.post(
            f"/api/v1/assignments/{assign_id}/publish-results",
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert pub_res.status_code == 200
        assert pub_res.json()["results_published"] is True

        # 6. Student now sees score and feedback
        my_sub_2 = client.get(
            f"/api/v1/assignments/{assign_id}/my-submission",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert my_sub_2.status_code == 200
        assert my_sub_2.json()["submission"]["score"] == 95.5
        assert "Excellent clean" in my_sub_2.json()["submission"]["feedback"]
    finally:
        db.close()


def test_assignment_grading_dashboard_metrics():
    """Faculty dashboard displays accurate class submission roster and statistics."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu1_token = get_auth_token("student1@smartedu.local")
    stu2_token = get_auth_token("student2@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        due_date = (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()

        create_resp = client.post(
            f"/api/v1/courses/{course.id}/assignments",
            json={
                "title": "Midterm Project",
                "due_date": due_date,
                "max_points": 100,
                "passing_points": 40,
                "status": "PUBLISHED",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assign_id = create_resp.json()["id"]

        # Student 1 submits
        client.post(
            f"/api/v1/assignments/{assign_id}/submit",
            json={"submission_text": "Student 1 Project Submission"},
            headers={"Authorization": f"Bearer {stu1_token}"},
        )

        # Student 2 submits
        client.post(
            f"/api/v1/assignments/{assign_id}/submit",
            json={"submission_text": "Student 2 Project Submission"},
            headers={"Authorization": f"Bearer {stu2_token}"},
        )

        # Fetch dashboard
        dash_resp = client.get(
            f"/api/v1/assignments/{assign_id}/grading-dashboard",
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert dash_resp.status_code == 200
        dash = dash_resp.json()
        assert dash["total_enrolled"] >= 2
        assert dash["total_submitted"] == 2
        assert len(dash["submissions"]) >= 2
    finally:
        db.close()
