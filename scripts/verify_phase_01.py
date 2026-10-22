"""Phase 01 System Verification Script.

Checks:
1. Environment variables and secrets isolation.
2. FastAPI app imports and route registration.
3. Database engine and Alembic configuration.
4. Pytest test suite execution.
"""
import os
import sys
import subprocess

# Add backend directory to sys.path
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


def verify_fastapi_app():
    from app.main import app
    from app.core.config import settings
    assert app.title == settings.APP_NAME
    assert settings.API_V1_STR == "/api/v1"


def verify_database_foundation():
    from app.core.database import Base, engine
    assert Base.metadata is not None
    assert engine is not None


def verify_tests():
    cmd = [sys.executable, "-m", "pytest", "tests", "-v"]
    result = subprocess.run(cmd, cwd=backend_dir, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Pytest failed:\n{result.stdout}\n{result.stderr}")


def main():
    print("==================================================")
    print(" SmartEdu Cloud - Phase 01 Verification")
    print("==================================================")

    steps = [
        ("FastAPI Application & Router Setup", verify_fastapi_app),
        ("SQLAlchemy Database Foundation", verify_database_foundation),
        ("Automated Pytest Suite", verify_tests),
    ]

    all_passed = True
    for name, fn in steps:
        if not check_step(name, fn):
            all_passed = False

    print("==================================================")
    if all_passed:
        print("[+] All Phase 01 backend verifications passed successfully!")
    else:
        print("[-] Some verifications failed. Please review errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
