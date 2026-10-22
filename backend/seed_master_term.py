"""Seed master curriculum bucket semester and ensure departments exist."""
from datetime import date
from app.core.database import SessionLocal
from app.models.semester import Semester
from app.models.department import Department

def seed():
    db = SessionLocal()
    try:
        # 1. Master Semester
        term = db.query(Semester).filter(Semester.name == "Master Course Catalog").first()
        if not term:
            term = Semester(
                name="Master Course Catalog",
                academic_year="2024-2028",
                start_date=date(2024, 1, 1),
                end_date=date(2028, 12, 31),
                is_current=True,
            )
            db.add(term)
            db.commit()
            db.refresh(term)
            print(f"Created Master Semester: {term.id}")
        else:
            print(f"Master Semester already exists: {term.id}")

        # 2. Departments check
        depts = db.query(Department).all()
        print(f"Total departments in DB: {len(depts)}")
        for d in depts:
            print(f" - {d.code}: {d.name} (ID: {d.id})")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
