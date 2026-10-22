"""Automated Test Suite for LMS, Learning Content Delivery, and Student Progress (Phase 05)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db, SessionLocal
from tests.fixtures import seed_database
from app.models.learning_content import LearningContent, ContentType, ContentStatus
from app.models.content_progress import StudentContentProgress, ProgressStatus
from app.models.course import Course, CourseInstructor
from app.models.course_module import CourseModule
from app.models.topic import Topic
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.user import User

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure database has standard seed data."""
    db: Session = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def get_auth_token(email: str, password: str = "DevPassword123!") -> str:
    """Helper to authenticate and retrieve access token."""
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["data"]["access_token"]


def get_first_topic_id(db: Session, course_code: str = "CS101") -> str:
    """Helper to fetch first topic in a course."""
    course = db.query(Course).filter(Course.course_code == course_code).first()
    assert course is not None, f"Course {course_code} not found in DB"
    module = db.query(CourseModule).filter(CourseModule.course_id == course.id).first()
    assert module is not None, f"No modules found for course {course_code}"
    topic = db.query(Topic).filter(Topic.module_id == module.id).first()
    assert topic is not None, f"No topics found for module {module.id}"
    return topic.id


def test_faculty_create_learning_content():
    """Test assigned faculty can create draft learning content in their course."""
    token = get_auth_token("faculty1@smartedu.local")
    db: Session = SessionLocal()
    try:
        topic_id = get_first_topic_id(db, "CS101")
        
        payload = {
            "title": "Introduction to Algorithms Video Lecture",
            "description": "Comprehensive walkthrough of Big-O analysis and growth rates",
            "content_type": "VIDEO",
            "content_url": "https://www.youtube.com/watch?v=kPRA0W1kECg",
            "display_order": 1,
            "is_required": True,
            "status": "DRAFT",
        }

        resp = client.post(
            f"/api/v1/topics/{topic_id}/content",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["title"] == payload["title"]
        assert data["content_type"] == "VIDEO"
        assert data["status"] == "DRAFT"
        assert data["id"] is not None
    finally:
        db.close()


def test_student_cannot_see_draft_content():
    """Test students cannot access DRAFT content before faculty publishes it."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        topic_id = get_first_topic_id(db, "CS101")

        # Create draft item
        resp = client.post(
            f"/api/v1/topics/{topic_id}/content",
            json={
                "title": "Top Secret Exam Preview (Draft)",
                "content_type": "TEXT_CONTENT",
                "text_content": "Draft lecture notes not ready for release.",
                "status": "DRAFT",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert resp.status_code == 201
        content_id = resp.json()["id"]

        # Student direct fetch should be 403 Forbidden
        stu_resp = client.get(
            f"/api/v1/content/{content_id}",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert stu_resp.status_code == 403
    finally:
        db.close()


def test_faculty_publish_and_student_access():
    """Test faculty can publish content and enrolled students can immediately access it."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        topic_id = get_first_topic_id(db, "CS101")

        # Create item
        resp = client.post(
            f"/api/v1/topics/{topic_id}/content",
            json={
                "title": "Data Structures Reference Manual",
                "content_type": "PDF",
                "content_url": "https://example.com/docs/dsa-manual.pdf",
                "status": "DRAFT",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert resp.status_code == 201
        content_id = resp.json()["id"]

        # Publish item
        pub_resp = client.post(
            f"/api/v1/content/{content_id}/publish",
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert pub_resp.status_code == 200
        assert pub_resp.json()["status"] == "PUBLISHED"

        # Student now successfully accesses the published content
        stu_resp = client.get(
            f"/api/v1/content/{content_id}",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert stu_resp.status_code == 200
        assert stu_resp.json()["title"] == "Data Structures Reference Manual"
    finally:
        db.close()


def test_unassigned_faculty_cannot_add_content():
    """Test faculty cannot add content to courses they are not assigned to."""
    fac2_token = get_auth_token("faculty2@smartedu.local")
    db: Session = SessionLocal()
    try:
        # CS101 is taught by faculty1, not faculty2
        topic_id = get_first_topic_id(db, "CS101")

        resp = client.post(
            f"/api/v1/topics/{topic_id}/content",
            json={
                "title": "Unauthorized Lecture Notes",
                "content_type": "TEXT_CONTENT",
                "text_content": "This should be rejected.",
            },
            headers={"Authorization": f"Bearer {fac2_token}"},
        )
        assert resp.status_code == 403
    finally:
        db.close()


def test_student_progress_lifecycle_and_course_learning_tree():
    """Test student completing learning content and verifying dynamic course progress updates."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        topic_id = get_first_topic_id(db, "CS101")

        # Create published content
        resp = client.post(
            f"/api/v1/topics/{topic_id}/content",
            json={
                "title": "Interactive Recursion Lab",
                "content_type": "TEXT_CONTENT",
                "text_content": "Solve Tower of Hanoi recursively.",
                "status": "PUBLISHED",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert resp.status_code == 201
        content_id = resp.json()["id"]

        # 1. Check learning tree before completion
        tree_resp1 = client.get(
            f"/api/v1/courses/{course.id}/learn",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert tree_resp1.status_code == 200
        tree1 = tree_resp1.json()
        assert tree1["course_code"] == "CS101"
        assert len(tree1["modules"]) > 0

        # 2. Student marks item complete
        prog_resp = client.post(
            f"/api/v1/content/{content_id}/progress",
            json={"status": "COMPLETED"},
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert prog_resp.status_code == 200
        assert prog_resp.json()["status"] == "COMPLETED"

        # 3. Check learning tree after completion
        tree_resp2 = client.get(
            f"/api/v1/courses/{course.id}/learn",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert tree_resp2.status_code == 200
        tree2 = tree_resp2.json()
        assert tree2["total_completed_contents"] >= 1
    finally:
        db.close()


def test_unenrolled_student_blocked_from_course_learning_tree():
    """Test student who is NOT enrolled cannot access the course learning tree."""
    stu2_token = get_auth_token("student2@smartedu.local")
    db: Session = SessionLocal()
    try:
        # Check student2 enrollment in EC101
        course = db.query(Course).filter(Course.course_code == "EC101").first()
        user2 = db.query(User).filter(User.email == "student2@smartedu.local").first()
        
        # Ensure student2 is not actively enrolled in EC101
        enr = db.query(Enrollment).filter(
            Enrollment.student_id == user2.id,
            Enrollment.course_id == course.id,
            Enrollment.status == EnrollmentStatus.ACTIVE.value,
        ).first()
        if enr:
            enr.status = EnrollmentStatus.DROPPED.value
            db.commit()

        resp = client.get(
            f"/api/v1/courses/{course.id}/learn",
            headers={"Authorization": f"Bearer {stu2_token}"},
        )
        assert resp.status_code == 403
    finally:
        db.close()


def test_faculty_course_analytics():
    """Test faculty can view real course progress analytics across enrolled students."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()

        resp = client.get(
            f"/api/v1/courses/{course.id}/faculty-analytics",
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["course_code"] == "CS101"
        assert "total_enrolled_students" in data
        assert "average_course_progress" in data
        assert isinstance(data["student_roster_progress"], list)
    finally:
        db.close()


def test_delete_content_with_progress_safely_archives():
    """Test that deleting content with student progress transitions it to ARCHIVED safely."""
    fac_token = get_auth_token("faculty1@smartedu.local")
    stu_token = get_auth_token("student1@smartedu.local")
    db: Session = SessionLocal()
    try:
        topic_id = get_first_topic_id(db, "CS101")

        # 1. Create published item
        resp = client.post(
            f"/api/v1/topics/{topic_id}/content",
            json={
                "title": "Binary Search Trees Practice Quiz Guide",
                "content_type": "TEXT_CONTENT",
                "status": "PUBLISHED",
            },
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert resp.status_code == 201
        content_id = resp.json()["id"]

        # 2. Student completes it
        client.post(
            f"/api/v1/content/{content_id}/progress",
            json={"status": "COMPLETED"},
            headers={"Authorization": f"Bearer {stu_token}"},
        )

        # 3. Faculty attempts delete -> should safely ARCHIVE
        del_resp = client.delete(
            f"/api/v1/content/{content_id}",
            headers={"Authorization": f"Bearer {fac_token}"},
        )
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "ARCHIVED"

        # Verify database still has record in ARCHIVED status
        item = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        assert item is not None
        assert item.status == "ARCHIVED"
    finally:
        db.close()
