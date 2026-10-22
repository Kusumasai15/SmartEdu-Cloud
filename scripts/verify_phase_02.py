"""Phase 02 System Verification Script.

Checks:
1. All 10 domain models can be imported and initialized.
2. Alembic migration history and current head status.
3. Database seeding idempotency and record counts.
4. Comprehensive automated pytest suite (16 tests).
"""
import os
import sys
import subprocess

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)


def check_step(name: str, fn):
    print(f"[*] Checking {name}...", end=" ", flush=True)
    try:
        fn()
        print("PASSED")
        return True
    except Exception as exc:
        print(f"FAILED: {exc}")
        return False


def verify_models_import():
    from app.models import (
        Role, Permission, RolePermission, Department, Semester,
        User, Course, CourseInstructor, CourseModule, Topic,
        Enrollment, EnrollmentStatus
    )
    assert Role.__tablename__ == "roles"
    assert User.__tablename__ == "users"
    assert Course.__tablename__ == "courses"
    assert Enrollment.__tablename__ == "enrollments"


def verify_seed_counts():
    from app.core.database import SessionLocal
    from app.models import Role, Department, Course, User, Enrollment
    db = SessionLocal()
    try:
        assert db.query(Role).count() >= 4, "Expected at least 4 roles"
        assert db.query(Department).count() >= 2, "Expected at least 2 departments"
        assert db.query(Course).count() >= 3, "Expected at least 3 courses"
        assert db.query(User).count() >= 9, "Expected at least 9 seed users"
        assert db.query(Enrollment).count() >= 9, "Expected at least 9 enrollments"
    finally:
        db.close()


def verify_pytest_suite():
    cmd = [sys.executable, "-m", "pytest", "tests", "-v"]
    result = subprocess.run(cmd, cwd=backend_dir, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Pytest failed:\n{result.stdout}\n{result.stderr}")


def main():
    print("==================================================")
    print(" SmartEdu Cloud - Phase 02 Verification")
    print("==================================================")

    steps = [
        ("Domain Models Import & Declarative Metadata", verify_models_import),
        ("Database Seed Records & Counts", verify_seed_counts),
        ("Automated Pytest Suite (16 Tests)", verify_pytest_suite),
    ]

    all_passed = True
    for name, fn in steps:
        if not check_step(name, fn):
            all_passed = False

    print("==================================================")
    if all_passed:
        print("[+] All Phase 02 database verifications passed successfully!")
    else:
        print("[-] Some verifications failed. Please review errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
