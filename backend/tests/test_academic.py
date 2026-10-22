"""Comprehensive Automated Test Suite for Phase 04 Academic Management System."""
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.auth.jwt import create_access_token
from tests.fixtures import seed_database
from app.models import (
    User,
    Department,
    Semester,
    Course,
    CourseModule,
    Topic,
    CourseInstructor,
    Enrollment,
    EnrollmentStatus,
)


@pytest.fixture(scope="function")
def test_db():
    """Isolated, in-memory SQLite database session populated with seed data."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    seed_database(session)

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """FastAPI TestClient with overridden DB session."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_headers(user_id: str, role_name: str) -> dict:
    """Generate authorization Bearer headers for given user credentials."""
    token = create_access_token(user_id=user_id, role_name=role_name)
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. DEPARTMENT MANAGEMENT TESTS
# ==============================================================================

def test_admin_create_department(client, test_db):
    """Verify Administrator can provision new academic departments with school hierarchy."""
    admin = test_db.query(User).filter(User.email == "admin@smartedu.local").first()
    payload = {
        "name": "Mechanical Engineering",
        "code": "MECH",
        "school": "School of Engineering & Technology",
        "description": "Robotics and Dynamics",
        "is_active": True,
    }
    response = client.post(
        "/api/v1/departments",
        json=payload,
        headers=auth_headers(admin.id, "ADMINISTRATOR"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["code"] == "MECH"
    assert data["data"]["school"] == "School of Engineering & Technology"


def test_hod_update_own_department(client, test_db):
    """Verify HOD can update metadata for their assigned department."""
    hod = test_db.query(User).filter(User.email == "hod.cse@smartedu.local").first()
    cse_dept = test_db.query(Department).filter(Department.code == "CSE").first()

    payload = {"description": "Updated Computer Science Department"}
    response = client.patch(
        f"/api/v1/departments/{cse_dept.id}",
        json=payload,
        headers=auth_headers(hod.id, "HOD"),
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_hod_cannot_update_other_department(client, test_db):
    """Verify HOD is denied access when attempting to update another department (IDOR protection)."""
    hod = test_db.query(User).filter(User.email == "hod.cse@smartedu.local").first()
    ece_dept = test_db.query(Department).filter(Department.code == "ECE").first()

    payload = {"description": "Unauthorized HOD Attempt"}
    response = client.patch(
        f"/api/v1/departments/{ece_dept.id}",
        json=payload,
        headers=auth_headers(hod.id, "HOD"),
    )
    assert response.status_code == 403


def test_duplicate_department_code_rejected(client, test_db):
    """Verify duplicate department code returns 409 Conflict."""
    admin = test_db.query(User).filter(User.email == "admin@smartedu.local").first()
    payload = {
        "name": "Computer Science Alternate",
        "code": "CSE",  # Already exists
        "description": "Duplicate code",
    }
    response = client.post(
        "/api/v1/departments",
        json=payload,
        headers=auth_headers(admin.id, "ADMINISTRATOR"),
    )
    assert response.status_code == 409


# ==============================================================================
# 2. SEMESTER MANAGEMENT TESTS
# ==============================================================================

def test_admin_create_semester(client, test_db):
    """Verify Administrator can create academic terms."""
    admin = test_db.query(User).filter(User.email == "admin@smartedu.local").first()
    payload = {
        "name": "Fall 2027",
        "academic_year": "2027-28",
        "start_date": "2027-08-10",
        "end_date": "2027-12-25",
        "is_current": False,
    }
    response = client.post(
        "/api/v1/semesters",
        json=payload,
        headers=auth_headers(admin.id, "ADMINISTRATOR"),
    )
    assert response.status_code == 201
    assert response.json()["success"] is True


def test_invalid_semester_dates_rejected(client, test_db):
    """Verify end_date < start_date is rejected with 422."""
    admin = test_db.query(User).filter(User.email == "admin@smartedu.local").first()
    payload = {
        "name": "Invalid Term",
        "academic_year": "2026-27",
        "start_date": "2027-05-25",
        "end_date": "2027-01-10",  # Prior to start
    }
    response = client.post(
        "/api/v1/semesters",
        json=payload,
        headers=auth_headers(admin.id, "ADMINISTRATOR"),
    )
    assert response.status_code == 422


# ==============================================================================
# 3. COURSE MANAGEMENT & SCOPING TESTS
# ==============================================================================

def test_hod_create_course_in_own_department(client, test_db):
    """Verify HOD can create courses within their own department."""
    hod = test_db.query(User).filter(User.email == "hod.cse@smartedu.local").first()
    cse_dept = test_db.query(Department).filter(Department.code == "CSE").first()
    sem = test_db.query(Semester).first()

    payload = {
        "course_code": "CS301",
        "name": "Operating Systems",
        "description": "Kernel architecture and concurrency",
        "credits": 4,
        "department_id": cse_dept.id,
        "semester_id": sem.id,
        "is_active": True,
    }
    response = client.post(
        "/api/v1/courses",
        json=payload,
        headers=auth_headers(hod.id, "HOD"),
    )
    assert response.status_code == 201
    assert response.json()["data"]["course_code"] == "CS301"


def test_hod_cannot_create_course_in_other_department(client, test_db):
    """Verify HOD is denied when attempting to create a course in another department."""
    hod = test_db.query(User).filter(User.email == "hod.cse@smartedu.local").first()
    ece_dept = test_db.query(Department).filter(Department.code == "ECE").first()
    sem = test_db.query(Semester).first()

    payload = {
        "course_code": "EC202",
        "name": "VLSI Design",
        "credits": 3,
        "department_id": ece_dept.id,
        "semester_id": sem.id,
    }
    response = client.post(
        "/api/v1/courses",
        json=payload,
        headers=auth_headers(hod.id, "HOD"),
    )
    assert response.status_code == 403


def test_course_structure_tree(client, test_db):
    """Verify course structure returns nested modules and topics in deterministic order."""
    faculty = test_db.query(User).filter(User.email == "faculty1@smartedu.local").first()
    cs101 = test_db.query(Course).filter(Course.course_code == "CS101").first()

    response = client.get(
        f"/api/v1/courses/{cs101.id}/structure",
        headers=auth_headers(faculty.id, "FACULTY"),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["modules"]) >= 2
    assert len(data["modules"][0]["topics"]) >= 2


# ==============================================================================
# 4. MODULE & TOPIC HIERARCHY TESTS
# ==============================================================================

def test_faculty_create_module_in_assigned_course(client, test_db):
    """Verify Faculty can create modules for their assigned courses."""
    faculty = test_db.query(User).filter(User.email == "faculty1@smartedu.local").first()
    cs101 = test_db.query(Course).filter(Course.course_code == "CS101").first()

    payload = {
        "title": "Module 3: Advanced Algorithms",
        "description": "Dynamic Programming and Greedy Strategies",
        "display_order": 3,
    }
    response = client.post(
        f"/api/v1/courses/{cs101.id}/modules",
        json=payload,
        headers=auth_headers(faculty.id, "FACULTY"),
    )
    assert response.status_code == 201
    assert response.json()["data"]["title"] == "Module 3: Advanced Algorithms"


def test_faculty_cannot_create_module_in_unassigned_course(client, test_db):
    """Verify Faculty is denied when attempting to add modules to an unassigned course."""
    faculty = test_db.query(User).filter(User.email == "faculty1@smartedu.local").first()
    ec101 = test_db.query(Course).filter(Course.course_code == "EC101").first()

    payload = {"title": "Unauthorized Module", "display_order": 5}
    response = client.post(
        f"/api/v1/courses/{ec101.id}/modules",
        json=payload,
        headers=auth_headers(faculty.id, "FACULTY"),
    )
    assert response.status_code == 403


# ==============================================================================
# 5. FACULTY ASSIGNMENT TESTS
# ==============================================================================

def test_hod_assign_faculty_to_course(client, test_db):
    """Verify HOD can assign faculty to courses within their department."""
    hod = test_db.query(User).filter(User.email == "hod.cse@smartedu.local").first()
    faculty2 = test_db.query(User).filter(User.email == "faculty2@smartedu.local").first()
    cs101 = test_db.query(Course).filter(Course.course_code == "CS101").first()

    payload = {"faculty_id": faculty2.id, "is_primary": False}
    response = client.post(
        f"/api/v1/courses/{cs101.id}/instructors",
        json=payload,
        headers=auth_headers(hod.id, "HOD"),
    )
    assert response.status_code == 201
    assert response.json()["success"] is True


def test_faculty_self_assignment_rejected(client, test_db):
    """Verify Faculty cannot self-assign themselves to courses without HOD/Admin authority."""
    faculty = test_db.query(User).filter(User.email == "faculty1@smartedu.local").first()
    ec101 = test_db.query(Course).filter(Course.course_code == "EC101").first()

    payload = {"faculty_id": faculty.id, "is_primary": True}
    response = client.post(
        f"/api/v1/courses/{ec101.id}/instructors",
        json=payload,
        headers=auth_headers(faculty.id, "FACULTY"),
    )
    assert response.status_code == 403


# ==============================================================================
# 6. ENROLLMENT TESTS
# ==============================================================================

def test_student_enrollment_and_drop_lifecycle(client, test_db):
    """Verify Student can enroll in an eligible course, view enrollments, and drop."""
    diana = test_db.query(User).filter(User.email == "student4@smartedu.local").first()
    cs101 = test_db.query(Course).filter(Course.course_code == "CS101").first()

    # 1. Enroll in CS101
    enroll_resp = client.post(
        f"/api/v1/courses/{cs101.id}/enroll",
        headers=auth_headers(diana.id, "STUDENT"),
    )
    assert enroll_resp.status_code == 201
    assert enroll_resp.json()["data"]["status"] == "ACTIVE"

    # 2. Duplicate active enrollment is rejected
    dup_resp = client.post(
        f"/api/v1/courses/{cs101.id}/enroll",
        headers=auth_headers(diana.id, "STUDENT"),
    )
    assert dup_resp.status_code == 409

    # 3. View my enrollments
    my_resp = client.get(
        "/api/v1/enrollments/my-enrollments",
        headers=auth_headers(diana.id, "STUDENT"),
    )
    assert my_resp.status_code == 200
    course_codes = [e["course_code"] for e in my_resp.json()["data"]]
    assert "CS101" in course_codes

    # 4. Drop enrollment
    drop_resp = client.delete(
        f"/api/v1/courses/{cs101.id}/enroll",
        headers=auth_headers(diana.id, "STUDENT"),
    )
    assert drop_resp.status_code == 200
    assert drop_resp.json()["success"] is True


def test_academic_catalog_retrieval(client, test_db):
    """Verify /api/v1/catalog returns course list annotated with department and instructors."""
    student = test_db.query(User).filter(User.email == "student1@smartedu.local").first()
    response = client.get(
        "/api/v1/catalog",
        headers=auth_headers(student.id, "STUDENT"),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) >= 3
    # Check that Alice's enrolled courses are flagged is_enrolled = True
    cs101_entry = next((c for c in data if c["course_code"] == "CS101"), None)
    assert cs101_entry is not None
    assert cs101_entry["is_enrolled"] is True
