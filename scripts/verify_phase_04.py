"""Phase 04 System Verification Script.

Checks:
1. Academic domain models, relationships, and seed data.
2. Complete Automated Pytest Suite (50/50 Tests).
3. Next.js Production Build and Static Page Compilation.
"""
import os
import sys
import subprocess

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
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


def verify_academic_database_relations():
    from app.core.database import SessionLocal
    from app.db.seed import seed_database
    from app.models import Department, Semester, Course, CourseModule, Topic, CourseInstructor, Enrollment
    db = SessionLocal()
    try:
        seed_database(db)
        assert db.query(Department).count() >= 2, "Departments missing"
        assert db.query(Semester).count() >= 2, "Semesters missing"
        assert db.query(Course).count() >= 3, "Courses missing"
        assert db.query(CourseModule).count() >= 4, "CourseModules missing"
        assert db.query(Topic).count() >= 8, "Topics missing"
        assert db.query(CourseInstructor).count() >= 2, "CourseInstructors missing"
        assert db.query(Enrollment).count() >= 3, "Enrollments missing"
    finally:
        db.close()


def verify_pytest_suite():
    cmd = [sys.executable, "-m", "pytest", "tests", "-v"]
    result = subprocess.run(cmd, cwd=backend_dir, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Pytest failed:\n{result.stdout}\n{result.stderr}")


def verify_frontend_build():
    cmd = ["npm", "run", "build"]
    result = subprocess.run(cmd, cwd=frontend_dir, capture_output=True, text=True, shell=True)
    if result.returncode != 0:
        raise RuntimeError(f"Next.js build failed:\n{result.stdout}\n{result.stderr}")


def main():
    print("==================================================")
    print(" SmartEdu Cloud - Phase 04 Academic Verification")
    print("==================================================")

    steps = [
        ("Academic Models & Relationship Integrity", verify_academic_database_relations),
        ("Automated Pytest Suite (50 Tests)", verify_pytest_suite),
        ("Next.js Frontend Build & SSR Compilation", verify_frontend_build),
    ]

    all_passed = True
    for name, fn in steps:
        if not check_step(name, fn):
            all_passed = False

    print("==================================================")
    if all_passed:
        print("[+] All Phase 04 Academic Management verifications passed successfully!")
    else:
        print("[-] Some verifications failed. Please review errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
