"""Production Seed Script for SmartEdu Cloud on PostgreSQL."""
import uuid
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.db.seed import seed_system_roles_and_permissions
from app.models import (
    Role, User, School, Department, AcademicRoom, RoomType
)

def run_production_seed():
    db = SessionLocal()
    try:
        print("[*] Initializing system roles and granular permissions...")
        roles_map = seed_system_roles_and_permissions(db)
        db.commit()

        # 1. Academic School
        school = db.query(School).filter(School.code == "SET").first()
        if not school:
            school = School(
                id=str(uuid.uuid4()),
                name="School of Engineering & Technology",
                code="SET",
                description="Core engineering disciplines and computing programs",
                is_active=True,
            )
            db.add(school)
            db.flush()
            print(f"[+] Created School: {school.name}")

        # 2. Academic Department
        dept = db.query(Department).filter(Department.code == "CSE").first()
        if not dept:
            dept = Department(
                id=str(uuid.uuid4()),
                name="Computer Science & Engineering",
                code="CSE",
                school=school.name,
                description="Department of Computer Science and Engineering",
                is_active=True,
            )
            db.add(dept)
            db.flush()
            print(f"[+] Created Department: {dept.name}")

        # 3. Academic Rooms
        room1 = db.query(AcademicRoom).filter(
            AcademicRoom.building == "Aryabhatta Academic Complex",
            AcademicRoom.room_number == "101"
        ).first()
        if not room1:
            room1 = AcademicRoom(
                id=str(uuid.uuid4()),
                building="Aryabhatta Academic Complex",
                floor="1st Floor",
                room_number="101",
                display_name="Room 101 - Smart Lecture Hall",
                capacity=60,
                room_type=RoomType.CLASSROOM,
                has_projector=True,
                has_recording=True,
                is_active=True,
            )
            room2 = AcademicRoom(
                id=str(uuid.uuid4()),
                building="Aryabhatta Academic Complex",
                floor="1st Floor",
                room_number="102",
                display_name="Room 102 - Computing Lab",
                capacity=40,
                room_type=RoomType.LAB,
                has_projector=True,
                has_recording=False,
                is_active=True,
            )
            db.add_all([room1, room2])
            db.flush()
            print("[+] Created Campus Rooms: 101, 102")

        # 4. Standard User Accounts
        password_hash = hash_password("DevPassword123!")
        users_to_seed = [
            {
                "email": "admin@smartedu.local",
                "first_name": "System",
                "last_name": "Administrator",
                "role_name": "ADMINISTRATOR",
                "department_id": dept.id,
            },
            {
                "email": "vc@smartedu.local",
                "first_name": "Prof. S.",
                "last_name": "Radhakrishnan",
                "role_name": "VC",
                "department_id": dept.id,
            },
            {
                "email": "hod.cse@smartedu.local",
                "first_name": "Dr. Ramesh",
                "last_name": "Gupta",
                "role_name": "HOD",
                "department_id": dept.id,
            },
            {
                "email": "faculty@smartedu.local",
                "first_name": "Ananya",
                "last_name": "Sharma",
                "role_name": "FACULTY",
                "department_id": dept.id,
            },
            {
                "email": "student@smartedu.local",
                "first_name": "Aarav",
                "last_name": "Mehta",
                "role_name": "STUDENT",
                "department_id": dept.id,
            },
        ]

        for u_data in users_to_seed:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            role = roles_map[u_data["role_name"]]
            if not user:
                user = User(
                    id=str(uuid.uuid4()),
                    email=u_data["email"],
                    password_hash=password_hash,
                    first_name=u_data["first_name"],
                    last_name=u_data["last_name"],
                    role_id=role.id,
                    department_id=u_data["department_id"],
                    is_active=True,
                )
                db.add(user)
                print(f"[+] Provisioned User: {user.email} ({u_data['role_name']})")
            else:
                user.password_hash = password_hash
                user.role_id = role.id
                user.is_active = True
                print(f"[~] Updated existing user password & role: {user.email}")

        db.commit()
        print("\n[SUCCESS] Production database seeding completed!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_production_seed()
