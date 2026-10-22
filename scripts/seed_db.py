"""CLI Script to trigger development database seeding."""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.db.seed import run_seed

if __name__ == "__main__":
    print("==================================================")
    print(" SmartEdu Cloud - Seeding Development Database")
    print("==================================================")
    run_seed()
    print("[+] Seeding finished successfully.")
