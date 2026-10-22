"""Comprehensive Unit and Integration Test Suite for Phase 02 Database Models."""
import pytest
from datetime import date, datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError

from app.core.database import Base
from app.core.security import hash_password, verify_password
from tests.fixtures import seed_database
from app.models import (
    Role,
    Permission,
    RolePermission,
    Department,
    Semester,
    User,
    Course,
    CourseInstructor,
    CourseModule,
    Topic,
    Enrollment,
    EnrollmentStatus,
)


@pytest.fixture(scope="function")
def db_session():
    """Create an isolated, in-memory SQLite database session for each test function."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


# ==============================================================================
# 1. SECURITY & PASSWORD HASHING TESTS
# ==============================================================================

def test_password_hashing_and_verification():
    """Verify password hashing produces valid PBKDF2 hashes and verifies properly."""
    raw_password = "SecureStudentPass123!"
    hashed = hash_password(raw_password)
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False


# ==============================================================================
# 2. ROLE & PERMISSION TESTS
# ==============================================================================

def test_role_and_permission_relationships(db_session):
    """Test Role, Permission, and composite RolePermission many-to-many mapping."""
    role = Role(name="STUDENT", description="Student Role", is_system_role=True)
    perm = Permission(name="course:view", resource="course", action="view", description="View courses")
    db_session.add_all([role, perm])
    db_session.commit()

    rp = RolePermission(role_id=role.id, permission_id=perm.id)
    db_session.add(rp)
    db_session.commit()

    assert len(role.role_permissions) == 1
    assert role.role_permissions[0].permission.name == "course:view"

    # Test uniqueness of (role_id, permission_id)
    duplicate_rp = RolePermission(role_id=role.id, permission_id=perm.id)
    db_session.add(duplicate_rp)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ==============================================================================
# 3. DEPARTMENT TESTS
# ==============================================================================

def test_department_unique_code_constraint(db_session):
    """Verify that duplicate department codes are rejected."""
    dept1 = Department(name="Computer Science", code="CSE", description="CS Dept")
    db_session.add(dept1)
    db_session.commit()

    dept2 = Department(name="Computer Science Duplicate", code="CSE", description="Duplicate Code")
    db_session.add(dept2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ==============================================================================
# 4. SEMESTER TESTS
# ==============================================================================

def test_semester_creation_and_constraints(db_session):
    """Verify semester unique constraint and date handling."""
    sem1 = Semester(
        name="Fall 2026",
        academic_year="2026-27",
        start_date=date(2026, 8, 1),
        end_date=date(2026, 12, 20),
        is_current=True,
    )
    db_session.add(sem1)
    db_session.commit()
    assert sem1.id is not None

    # Test duplicate semester name and academic year
    sem2 = Semester(
        name="Fall 2026",
        academic_year="2026-27",
        start_date=date(2026, 8, 1),
        end_date=date(2026, 12, 20),
    )
    db_session.add(sem2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ==============================================================================
# 5. USER TESTS
# ==============================================================================

def test_user_email_normalization_and_uniqueness(db_session):
    """Verify user emails are normalized to lowercase and enforced unique."""
    role = Role(name="STUDENT", description="Student")
    db_session.add(role)
    db_session.commit()

    user1 = User(
        email="  ALICE@example.com  ",
        password_hash=hash_password("Pass123!"),
        first_name="Alice",
        last_name="Smith",
        role_id=role.id,
    )
    db_session.add(user1)
    db_session.commit()

    assert user1.email == "alice@example.com"
    assert user1.full_name == "Alice Smith"

    # Test duplicate email (case-insensitive)
    user2 = User(
        email="alice@example.com",
        password_hash=hash_password("Pass456!"),
        first_name="Alice2",
        last_name="Smith2",
        role_id=role.id,
    )
    db_session.add(user2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ==============================================================================
# 6. COURSE & INSTRUCTOR TESTS
# ==============================================================================

def test_course_and_instructor_assignment(db_session):
    """Verify Course creation and CourseInstructor association."""
    dept = Department(name="Computer Science", code="CSE")
    sem = Semester(
        name="Fall 2026", academic_year="2026-27",
        start_date=date(2026, 8, 1), end_date=date(2026, 12, 20)
    )
    faculty_role = Role(name="FACULTY")
    db_session.add_all([dept, sem, faculty_role])
    db_session.commit()

    instructor = User(
        email="prof.lovelace@smartedu.local",
        password_hash=hash_password("Pass123!"),
        first_name="Ada",
        last_name="Lovelace",
        role_id=faculty_role.id,
        department_id=dept.id,
    )
    course = Course(
        course_code="CS101",
        name="Intro to Programming",
        credits=4,
        department_id=dept.id,
        semester_id=sem.id,
    )
    db_session.add_all([instructor, course])
    db_session.commit()

    assignment = CourseInstructor(course_id=course.id, faculty_id=instructor.id, is_primary=True)
    db_session.add(assignment)
    db_session.commit()

    assert len(course.instructors) == 1
    assert course.instructors[0].faculty.full_name == "Ada Lovelace"


# ==============================================================================
# 7. MODULE & TOPIC HIERARCHY TESTS
# ==============================================================================

def test_course_module_and_topic_hierarchy(db_session):
    """Verify Course -> CourseModule -> Topic cascading and ordering constraints."""
    dept = Department(name="Computer Science", code="CSE")
    sem = Semester(name="Fall 2026", academic_year="2026-27", start_date=date(2026, 8, 1), end_date=date(2026, 12, 20))
    db_session.add_all([dept, sem])
    db_session.flush()

    course = Course(course_code="CS101", name="Intro to CS", department_id=dept.id, semester_id=sem.id)
    db_session.add(course)
    db_session.commit()

    mod1 = CourseModule(course_id=course.id, title="Module 1: Basics", display_order=1)
    mod2 = CourseModule(course_id=course.id, title="Module 2: Advanced", display_order=2)
    db_session.add_all([mod1, mod2])
    db_session.commit()

    topic1 = Topic(module_id=mod1.id, title="Topic 1.1: Syntax", display_order=1)
    topic2 = Topic(module_id=mod1.id, title="Topic 1.2: Variables", display_order=2)
    db_session.add_all([topic1, topic2])
    db_session.commit()

    # Traverse hierarchy
    reloaded_course = db_session.query(Course).filter(Course.id == course.id).first()
    assert len(reloaded_course.modules) == 2
    assert len(reloaded_course.modules[0].topics) == 2
    assert reloaded_course.modules[0].topics[0].title == "Topic 1.1: Syntax"

    # Test unique display order constraint per course
    duplicate_mod = CourseModule(course_id=course.id, title="Duplicate Order", display_order=1)
    db_session.add(duplicate_mod)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ==============================================================================
# 8. ENROLLMENT TESTS
# ==============================================================================

def test_enrollment_unique_and_status_constraints(db_session):
    """Verify Enrollment uniqueness per (student, course, semester) and status handling."""
    dept = Department(name="Computer Science", code="CSE")
    sem = Semester(name="Fall 2026", academic_year="2026-27", start_date=date(2026, 8, 1), end_date=date(2026, 12, 20))
    role = Role(name="STUDENT")
    db_session.add_all([dept, sem, role])
    db_session.commit()

    student = User(
        email="student.test@smartedu.local",
        password_hash=hash_password("Pass123!"),
        first_name="Test",
        last_name="Student",
        role_id=role.id,
    )
    course = Course(course_code="CS101", name="Intro to CS", department_id=dept.id, semester_id=sem.id)
    db_session.add_all([student, course])
    db_session.commit()

    # Valid Enrollment
    enrollment = Enrollment(
        student_id=student.id,
        course_id=course.id,
        semester_id=sem.id,
        status=EnrollmentStatus.ACTIVE.value,
    )
    db_session.add(enrollment)
    db_session.commit()

    assert enrollment.status == "ACTIVE"
    assert enrollment.student.email == "student.test@smartedu.local"

    # Duplicate Enrollment Rejection
    duplicate_enr = Enrollment(
        student_id=student.id,
        course_id=course.id,
        semester_id=sem.id,
        status=EnrollmentStatus.ACTIVE.value,
    )
    db_session.add(duplicate_enr)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Invalid status validation
    with pytest.raises(ValueError):
        Enrollment(
            student_id=student.id,
            course_id=course.id,
            semester_id=sem.id,
            status="INVALID_STATUS_STRING",
        )


# ==============================================================================
# 9. SEED IDEMPOTENCY INTEGRATION TEST
# ==============================================================================

def test_seed_database_idempotency(db_session):
    """Verify that seed_database runs successfully and is completely idempotent."""
    # First seed run
    seed_database(db_session)

    # Verify counts
    assert db_session.query(Role).count() == 5  # ADMINISTRATOR, VC, HOD, FACULTY, STUDENT
    assert db_session.query(Department).count() == 2
    assert db_session.query(Course).count() == 3
    assert db_session.query(User).count() == 10  # 1 Admin + 1 VC + 1 HOD + 2 Faculty + 5 Students
    assert db_session.query(Enrollment).count() == 9

    # Second seed run should not duplicate or error
    seed_database(db_session)
    assert db_session.query(Role).count() == 5
    assert db_session.query(User).count() == 10
    assert db_session.query(Course).count() == 3
