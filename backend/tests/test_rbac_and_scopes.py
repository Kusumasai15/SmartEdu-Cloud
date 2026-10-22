"""Comprehensive RBAC and Resource-Level Scoping Security Tests (5-Role Model)."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from tests.fixtures import seed_database
from app.auth.service import get_user_permissions
from app.auth.scopes import (
    can_access_student,
    can_access_course,
    can_access_department,
)
from app.models import User, Role, Course, Department


@pytest.fixture(scope="function")
def db_session():
    """Create an isolated, in-memory SQLite database session populated with Phase 03 seed data."""
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


# ==============================================================================
# 1. FIVE OFFICIAL ROLES & PERMISSION SEPARATION TESTS
# ==============================================================================

def test_five_official_roles_exist_and_distinct(db_session):
    """Verify all 5 official system roles are present in the database."""
    role_names = [r.name for r in db_session.query(Role).all()]
    expected_roles = ["STUDENT", "FACULTY", "HOD", "VC", "ADMINISTRATOR"]
    for expected in expected_roles:
        assert expected in role_names, f"Role {expected} is missing from database."


def test_vc_vs_administrator_permission_distinction(db_session):
    """Verify VC has institution-wide academic analytics permissions but CANNOT manage users or system config."""
    admin_user = db_session.query(User).filter(User.email == "admin@smartedu.local").first()
    vc_user = db_session.query(User).filter(User.email == "vc@smartedu.local").first()

    admin_perms = set(get_user_permissions(db_session, admin_user))
    vc_perms = set(get_user_permissions(db_session, vc_user))

    # VC has broad academic oversight permissions
    assert "analytics:institution:view" in vc_perms
    assert "reports:institution:view" in vc_perms
    assert "approvals:academic:approve" in vc_perms

    # VC MUST NOT have administrative technical / security permissions
    assert "user:delete" not in vc_perms
    assert "role:manage" not in vc_perms
    assert "system:config" not in vc_perms

    # Administrator has system-level permissions
    assert "user:delete" in admin_perms
    assert "role:manage" in admin_perms
    assert "system:config" in admin_perms


# ==============================================================================
# 2. STUDENT RESOURCE SCOPING & IDOR TESTS
# ==============================================================================

def test_student_self_scope_and_idor_protection(db_session):
    """Verify Student can access own records but is rejected from other students (IDOR protection)."""
    alice = db_session.query(User).filter(User.email == "student1@smartedu.local").first()
    bob = db_session.query(User).filter(User.email == "student2@smartedu.local").first()

    # Alice can access Alice
    assert can_access_student(alice, alice.id, db_session) is True
    # Alice CANNOT access Bob (IDOR attempt rejected)
    assert can_access_student(alice, bob.id, db_session) is False


def test_student_course_scoping(db_session):
    """Verify Student can access enrolled courses but cannot access un-enrolled courses."""
    alice = db_session.query(User).filter(User.email == "student1@smartedu.local").first()
    diana = db_session.query(User).filter(User.email == "student4@smartedu.local").first()

    cs101 = db_session.query(Course).filter(Course.course_code == "CS101").first()
    ec101 = db_session.query(Course).filter(Course.course_code == "EC101").first()

    # Alice is enrolled in CS101 and EC101
    assert can_access_course(alice, cs101.id, db_session) is True
    assert can_access_course(alice, ec101.id, db_session) is True

    # Diana is in ECE, enrolled in EC101 only (NOT enrolled in CS101)
    assert can_access_course(diana, ec101.id, db_session) is True
    assert can_access_course(diana, cs101.id, db_session) is False


# ==============================================================================
# 3. FACULTY RESOURCE SCOPING TESTS
# ==============================================================================

def test_faculty_assigned_course_scoping(db_session):
    """Verify Faculty can only access courses assigned to them via CourseInstructor."""
    ada = db_session.query(User).filter(User.email == "faculty1@smartedu.local").first()
    claude = db_session.query(User).filter(User.email == "faculty2@smartedu.local").first()

    cs101 = db_session.query(Course).filter(Course.course_code == "CS101").first()
    ec101 = db_session.query(Course).filter(Course.course_code == "EC101").first()

    # Ada teaches CS101
    assert can_access_course(ada, cs101.id, db_session) is True
    # Ada DOES NOT teach EC101
    assert can_access_course(ada, ec101.id, db_session) is False

    # Claude teaches EC101
    assert can_access_course(claude, ec101.id, db_session) is True
    # Claude DOES NOT teach CS101
    assert can_access_course(claude, cs101.id, db_session) is False


def test_faculty_student_scoping(db_session):
    """Verify Faculty can access students in their assigned courses, but not unrelated students."""
    ada = db_session.query(User).filter(User.email == "faculty1@smartedu.local").first()
    claude = db_session.query(User).filter(User.email == "faculty2@smartedu.local").first()

    alice = db_session.query(User).filter(User.email == "student1@smartedu.local").first()
    evan = db_session.query(User).filter(User.email == "student5@smartedu.local").first()

    # Alice is enrolled in Ada's CS101 course
    assert can_access_student(ada, alice.id, db_session) is True

    # Evan (ECE student) is ONLY enrolled in Claude's EC101 course, NOT Ada's courses
    assert can_access_student(claude, evan.id, db_session) is True
    assert can_access_student(ada, evan.id, db_session) is False


# ==============================================================================
# 4. HOD DEPARTMENT SCOPING TESTS
# ==============================================================================

def test_hod_department_scoping(db_session):
    """Verify HOD can access their department and its courses, but not other departments."""
    hod_cse = db_session.query(User).filter(User.email == "hod.cse@smartedu.local").first()

    cse_dept = db_session.query(Department).filter(Department.code == "CSE").first()
    ece_dept = db_session.query(Department).filter(Department.code == "ECE").first()

    cs101 = db_session.query(Course).filter(Course.course_code == "CS101").first()
    ec101 = db_session.query(Course).filter(Course.course_code == "EC101").first()

    alice = db_session.query(User).filter(User.email == "student1@smartedu.local").first()
    evan = db_session.query(User).filter(User.email == "student5@smartedu.local").first()

    # HOD CSE department access
    assert can_access_department(hod_cse, cse_dept.id, db_session) is True
    assert can_access_department(hod_cse, ece_dept.id, db_session) is False

    # HOD CSE course access
    assert can_access_course(hod_cse, cs101.id, db_session) is True
    assert can_access_course(hod_cse, ec101.id, db_session) is False

    # HOD CSE student access
    assert can_access_student(hod_cse, alice.id, db_session) is True
    assert can_access_student(hod_cse, evan.id, db_session) is False


# ==============================================================================
# 5. VC & ADMINISTRATOR INSTITUTION / SYSTEM SCOPING TESTS
# ==============================================================================

def test_vc_and_admin_institution_wide_scope(db_session):
    """Verify VC and Administrator have institution-wide access to departments, courses, and students."""
    vc = db_session.query(User).filter(User.email == "vc@smartedu.local").first()
    admin = db_session.query(User).filter(User.email == "admin@smartedu.local").first()

    cse_dept = db_session.query(Department).filter(Department.code == "CSE").first()
    ece_dept = db_session.query(Department).filter(Department.code == "ECE").first()

    cs101 = db_session.query(Course).filter(Course.course_code == "CS101").first()
    ec101 = db_session.query(Course).filter(Course.course_code == "EC101").first()

    alice = db_session.query(User).filter(User.email == "student1@smartedu.local").first()
    evan = db_session.query(User).filter(User.email == "student5@smartedu.local").first()

    for executive in [vc, admin]:
        # Access both departments
        assert can_access_department(executive, cse_dept.id, db_session) is True
        assert can_access_department(executive, ece_dept.id, db_session) is True

        # Access courses across all departments
        assert can_access_course(executive, cs101.id, db_session) is True
        assert can_access_course(executive, ec101.id, db_session) is True

        # Access students across all departments
        assert can_access_student(executive, alice.id, db_session) is True
        assert can_access_student(executive, evan.id, db_session) is True
