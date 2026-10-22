"""Idempotent Development Database Seeder for SmartEdu Cloud (5-Role Security Model)."""
import logging
from datetime import date
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
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

logger = logging.getLogger("smartedu.test_fixtures")


def seed_system_roles_and_permissions(db: Session) -> dict[str, Role]:
    """Seed official system roles and granular security permissions for production (Zero Dummy Data)."""
    logger.info("Verifying system roles and permissions (Production Core)...")

    # 1. Seed 5 Official System Roles
    roles_data = [
        {
            "name": "ADMINISTRATOR",
            "description": "Full platform administration, user management, and system configuration",
            "is_system_role": True,
        },
        {
            "name": "VC",
            "description": "Vice Chancellor - Institution-wide academic governance, analytics, and high-level approvals",
            "is_system_role": True,
        },
        {
            "name": "HOD",
            "description": "Head of Department - Departmental academic oversight, course offerings, and performance analytics",
            "is_system_role": True,
        },
        {
            "name": "FACULTY",
            "description": "Course instructor, content author, student evaluator, and mentor",
            "is_system_role": True,
        },
        {
            "name": "STUDENT",
            "description": "Enrolled institutional learner with course access and personal analytics",
            "is_system_role": True,
        },
    ]
    roles_map = {}
    for r in roles_data:
        existing_role = db.query(Role).filter(Role.name == r["name"]).first()
        if not existing_role:
            role_obj = Role(**r)
            db.add(role_obj)
            db.flush()
            roles_map[r["name"]] = role_obj
            logger.info(f"Created Role: {r['name']}")
        else:
            roles_map[r["name"]] = existing_role

    # 2. Seed Granular Permissions
    permissions_data = [
        # User & Identity Management (System / Administrator)
        {"name": "user:view", "resource": "user", "action": "view", "description": "View user profiles and rosters"},
        {"name": "user:create", "resource": "user", "action": "create", "description": "Provision new user accounts"},
        {"name": "user:update", "resource": "user", "action": "update", "description": "Update user profiles and roles"},
        {"name": "user:delete", "resource": "user", "action": "delete", "description": "Deactivate or purge user accounts"},
        {"name": "role:manage", "resource": "role", "action": "manage", "description": "Configure roles and permissions"},
        {"name": "system:config", "resource": "system", "action": "config", "description": "Manage platform settings and infrastructure"},

        # Department Management
        {"name": "department:view", "resource": "department", "action": "view", "description": "View departments"},
        {"name": "department:create", "resource": "department", "action": "create", "description": "Create new academic departments"},
        {"name": "department:update", "resource": "department", "action": "update", "description": "Update department details"},

        # Course & Syllabus Management
        {"name": "course:view", "resource": "course", "action": "view", "description": "View course details and catalog"},
        {"name": "course:create", "resource": "course", "action": "create", "description": "Create new academic courses"},
        {"name": "course:update", "resource": "course", "action": "update", "description": "Update course content and syllabus"},
        {"name": "course:delete", "resource": "course", "action": "delete", "description": "Archive or delete courses"},
        {"name": "module:view", "resource": "module", "action": "view", "description": "View course modules"},
        {"name": "module:create", "resource": "module", "action": "create", "description": "Create course modules"},
        {"name": "module:update", "resource": "module", "action": "update", "description": "Update course modules"},
        {"name": "module:delete", "resource": "module", "action": "delete", "description": "Delete course modules"},
        {"name": "topic:view", "resource": "topic", "action": "view", "description": "View module topics"},
        {"name": "topic:create", "resource": "topic", "action": "create", "description": "Create module topics"},
        {"name": "topic:update", "resource": "topic", "action": "update", "description": "Update module topics"},
        {"name": "topic:delete", "resource": "topic", "action": "delete", "description": "Delete module topics"},

        # Enrollment
        {"name": "enrollment:view", "resource": "enrollment", "action": "view", "description": "View course enrollments"},
        {"name": "enrollment:create", "resource": "enrollment", "action": "create", "description": "Enroll students into courses"},
        {"name": "enrollment:delete", "resource": "enrollment", "action": "delete", "description": "Drop or withdraw enrollments"},

        # Analytics & Governance
        {"name": "analytics:institution:view", "resource": "analytics", "action": "view_institution", "description": "View institution-wide cross-department analytics"},
        {"name": "analytics:department:view", "resource": "analytics", "action": "view_department", "description": "View department-level academic analytics"},
        {"name": "analytics:faculty:view", "resource": "analytics", "action": "view_faculty", "description": "View faculty instructional performance metrics"},
        {"name": "analytics:student:view", "resource": "analytics", "action": "view_student", "description": "View student performance trends and risk metrics"},

        # Academic Reports & Approvals
        {"name": "reports:institution:view", "resource": "reports", "action": "view_institution", "description": "View and export institutional audit and KPI reports"},
        {"name": "reports:academic:view", "resource": "reports", "action": "view_academic", "description": "View department and course academic grade reports"},
        {"name": "approvals:academic:view", "resource": "approvals", "action": "view", "description": "View pending institutional academic approvals"},
        {"name": "approvals:academic:approve", "resource": "approvals", "action": "approve", "description": "Grant executive academic approvals"},
    ]

    perms_map = {}
    for p in permissions_data:
        existing_p = db.query(Permission).filter(Permission.name == p["name"]).first()
        if not existing_p:
            p_obj = Permission(**p)
            db.add(p_obj)
            db.flush()
            perms_map[p["name"]] = p_obj
        else:
            perms_map[p["name"]] = existing_p

    # Role-Permission Mapping Matrix (5 Official Roles)
    role_assignments = {
        # Administrator: System/Platform authority (Users, Roles, Permissions, System Config, Academic CRUD)
        "ADMINISTRATOR": list(perms_map.keys()),

        # VC (Vice Chancellor): Institution-wide academic authority (All Analytics, Institutional Reports, Approvals, Course/Dept View)
        # Note: VC CANNOT delete users, modify role definitions, or alter system security config.
        "VC": [
            "user:view", "department:view", "course:view", "module:view", "topic:view",
            "enrollment:view", "analytics:institution:view", "analytics:department:view",
            "analytics:faculty:view", "analytics:student:view", "reports:institution:view",
            "reports:academic:view", "approvals:academic:view", "approvals:academic:approve"
        ],

        # HOD: Departmental scope (Dept View/Update, Dept Courses/Modules/Topics, Dept Analytics/Reports)
        "HOD": [
            "user:view", "department:view", "department:update", "course:view", "course:create",
            "course:update", "module:view", "module:create", "module:update", "topic:view",
            "topic:create", "topic:update", "enrollment:view", "enrollment:create",
            "analytics:department:view", "analytics:student:view", "reports:academic:view"
        ],

        # Faculty: Assigned Courses scope (Course View/Update, Modules/Topics Full CRUD, Enrollment View)
        "FACULTY": [
            "user:view", "department:view", "course:view", "course:update", "module:view",
            "module:create", "module:update", "module:delete", "topic:view", "topic:create",
            "topic:update", "topic:delete", "enrollment:view", "analytics:student:view"
        ],

        # Student: Self & Enrolled Courses scope (Course/Module/Topic View, Enrollment View)
        "STUDENT": [
            "course:view", "module:view", "topic:view", "enrollment:view"
        ],
    }

    for r_name, perm_names in role_assignments.items():
        role_obj = roles_map[r_name]
        for p_name in perm_names:
            perm_obj = perms_map[p_name]
            existing_rp = db.query(RolePermission).filter(
                RolePermission.role_id == role_obj.id,
                RolePermission.permission_id == perm_obj.id,
            ).first()
            if not existing_rp:
                rp = RolePermission(role_id=role_obj.id, permission_id=perm_obj.id)
                db.add(rp)

    db.flush()
    logger.info("System roles and permissions initialized successfully (Zero Dummy Data).")
    return roles_map


def seed_sample_data(db: Session, roles_map: dict[str, Role] | None = None) -> None:
    """Optional sample test fixtures for local testing/development environments."""
    logger.info("Seeding development sample fixtures (Departments, Test Users, Sample Courses)...")
    if not roles_map:
        roles_map = {r.name: r for r in db.query(Role).all()}

    # Test-only school required by department validation.
    from app.models import School
    school = db.query(School).filter(School.code == "SEAT").first()
    if not school:
        db.add(School(name="School of Engineering & Technology", code="SEAT", is_active=True))
        db.flush()

    # 3. Seed Departments (2 departments)
    departments_data = [
        {
            "name": "Computer Science & Engineering",
            "code": "CSE",
            "school": "School of Engineering & Technology",
            "description": "Department of Computer Science, AI, and Software Engineering",
            "is_active": True,
        },
        {
            "name": "Electronics & Communication Engineering",
            "code": "ECE",
            "school": "School of Engineering & Technology",
            "description": "Department of Electronics, Embedded Systems, and Signal Processing",
            "is_active": True,
        },
    ]
    dept_map = {}
    for d in departments_data:
        existing_dept = db.query(Department).filter(Department.code == d["code"]).first()
        if not existing_dept:
            dept_obj = Department(**d)
            db.add(dept_obj)
            db.flush()
            dept_map[d["code"]] = dept_obj
            logger.info(f"Created Department: {d['code']}")
        else:
            dept_map[d["code"]] = existing_dept

    # 4. Seed Semesters (Fall 2026 and Spring 2027)
    semesters_data = [
        {
            "name": "Fall 2026",
            "academic_year": "2026-27",
            "start_date": date(2026, 8, 1),
            "end_date": date(2026, 12, 20),
            "is_current": True,
        },
        {
            "name": "Spring 2027",
            "academic_year": "2026-27",
            "start_date": date(2027, 1, 10),
            "end_date": date(2027, 5, 25),
            "is_current": False,
        },
    ]
    semester_obj = None
    for s_data in semesters_data:
        existing_sem = db.query(Semester).filter(
            Semester.name == s_data["name"],
            Semester.academic_year == s_data["academic_year"],
        ).first()
        if not existing_sem:
            sem_obj = Semester(**s_data)
            db.add(sem_obj)
            db.flush()
            logger.info(f"Created Semester: {s_data['name']}")
            if s_data["is_current"]:
                semester_obj = sem_obj
        else:
            if s_data["is_current"]:
                semester_obj = existing_sem

    # 5. Seed Users (1 Admin, 1 VC, 1 HOD, 2 Faculty, 5 Students)
    default_dev_hash = hash_password("DevPassword123!")

    users_data = [
        # Administrator (System Authority)
        {
            "email": "admin@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "System",
            "last_name": "Administrator",
            "role_id": roles_map["ADMINISTRATOR"].id,
            "department_id": None,
        },
        # VC (Vice Chancellor - Institution Academic Authority)
        {
            "email": "vc@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Charles",
            "last_name": "Babbage",
            "role_id": roles_map["VC"].id,
            "department_id": None,
            "faculty_identifier": "VC-INST-001",
        },
        # HOD (Department Authority - CSE)
        {
            "email": "hod.cse@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Alan",
            "last_name": "Turing",
            "role_id": roles_map["HOD"].id,
            "department_id": dept_map["CSE"].id,
            "faculty_identifier": "HOD-CSE-001",
        },
        # Faculty (2)
        {
            "email": "faculty1@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "role_id": roles_map["FACULTY"].id,
            "department_id": dept_map["CSE"].id,
            "faculty_identifier": "FAC-CSE-001",
        },
        {
            "email": "faculty2@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Claude",
            "last_name": "Shannon",
            "role_id": roles_map["FACULTY"].id,
            "department_id": dept_map["ECE"].id,
            "faculty_identifier": "FAC-ECE-001",
        },
        # Students (5)
        {
            "email": "student1@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Alice",
            "last_name": "Smith",
            "role_id": roles_map["STUDENT"].id,
            "department_id": dept_map["CSE"].id,
            "student_identifier": "STU-2026-001",
        },
        {
            "email": "student2@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Bob",
            "last_name": "Jones",
            "role_id": roles_map["STUDENT"].id,
            "department_id": dept_map["CSE"].id,
            "student_identifier": "STU-2026-002",
        },
        {
            "email": "student3@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Charlie",
            "last_name": "Brown",
            "role_id": roles_map["STUDENT"].id,
            "department_id": dept_map["CSE"].id,
            "student_identifier": "STU-2026-003",
        },
        {
            "email": "student4@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Diana",
            "last_name": "Prince",
            "role_id": roles_map["STUDENT"].id,
            "department_id": dept_map["ECE"].id,
            "student_identifier": "STU-2026-004",
        },
        {
            "email": "student5@smartedu.local",
            "password_hash": default_dev_hash,
            "first_name": "Evan",
            "last_name": "Wright",
            "role_id": roles_map["STUDENT"].id,
            "department_id": dept_map["ECE"].id,
            "student_identifier": "STU-2026-005",
        },
    ]

    users_map = {}
    for u in users_data:
        existing_user = db.query(User).filter(User.email == u["email"].lower()).first()
        if not existing_user:
            user_obj = User(**u)
            db.add(user_obj)
            db.flush()
            users_map[u["email"]] = user_obj
            logger.info(f"Created User: {u['email']}")
        else:
            users_map[u["email"]] = existing_user

    # 6. Seed Courses (3 courses)
    courses_data = [
        {
            "course_code": "CS101",
            "name": "Introduction to Computer Science",
            "description": "Core concepts of computing, algorithmic thinking, and programming foundations.",
            "credits": 4,
            "department_id": dept_map["CSE"].id,
            "semester_id": semester_obj.id,
            "instructor_email": "faculty1@smartedu.local",
            "modules": [
                {
                    "title": "Foundations of Computing",
                    "description": "Binary logic, computer architecture, and basic operations.",
                    "display_order": 1,
                    "topics": [
                        {"title": "Binary Arithmetic & Logic Gates", "display_order": 1},
                        {"title": "Von Neumann Architecture", "display_order": 2},
                    ],
                },
                {
                    "title": "Control Structures & Functions",
                    "description": "Branching, loops, functions, and recursion.",
                    "display_order": 2,
                    "topics": [
                        {"title": "Conditional Statements & Loops", "display_order": 1},
                        {"title": "Function Call Stack & Scope", "display_order": 2},
                    ],
                },
            ],
        },
        {
            "course_code": "CS201",
            "name": "Data Structures & Algorithms",
            "description": "Fundamental linear and non-linear data structures with algorithmic complexity analysis.",
            "credits": 4,
            "department_id": dept_map["CSE"].id,
            "semester_id": semester_obj.id,
            "instructor_email": "faculty1@smartedu.local",
            "modules": [
                {
                    "title": "Linear Data Structures",
                    "description": "Linked lists, stacks, and queues.",
                    "display_order": 1,
                    "topics": [
                        {"title": "Singly and Doubly Linked Lists", "display_order": 1},
                        {"title": "Stacks, Queues, and Priority Queues", "display_order": 2},
                    ],
                },
                {
                    "title": "Hierarchical Data Structures",
                    "description": "Trees and graphs.",
                    "display_order": 2,
                    "topics": [
                        {"title": "Binary Search Trees & Traversal Algorithms", "display_order": 1},
                        {"title": "Graph Representations & Search (BFS/DFS)", "display_order": 2},
                    ],
                },
            ],
        },
        {
            "course_code": "EC101",
            "name": "Digital Electronics",
            "description": "Analysis and design of digital electronic circuits and logic families.",
            "credits": 3,
            "department_id": dept_map["ECE"].id,
            "semester_id": semester_obj.id,
            "instructor_email": "faculty2@smartedu.local",
            "modules": [
                {
                    "title": "Boolean Algebra & Minimization",
                    "description": "Boolean theorems and Karnaugh map optimization.",
                    "display_order": 1,
                    "topics": [
                        {"title": "Karnaugh Map Minimization", "display_order": 1},
                        {"title": "Combinational Logic Design", "display_order": 2},
                    ],
                },
            ],
        },
    ]

    courses_map = {}
    for c in courses_data:
        existing_c = db.query(Course).filter(Course.course_code == c["course_code"]).first()
        if not existing_c:
            c_obj = Course(
                course_code=c["course_code"],
                name=c["name"],
                description=c["description"],
                credits=c["credits"],
                department_id=c["department_id"],
                semester_id=c["semester_id"],
            )
            db.add(c_obj)
            db.flush()
            courses_map[c["course_code"]] = c_obj
            logger.info(f"Created Course: {c['course_code']}")

            # Assign Instructor
            instructor = users_map[c["instructor_email"]]
            ci = CourseInstructor(course_id=c_obj.id, faculty_id=instructor.id, is_primary=True)
            db.add(ci)

            # Add Modules and Topics
            for m in c["modules"]:
                m_obj = CourseModule(
                    course_id=c_obj.id,
                    title=m["title"],
                    description=m.get("description"),
                    display_order=m["display_order"],
                )
                db.add(m_obj)
                db.flush()

                for t in m["topics"]:
                    t_obj = Topic(
                        module_id=m_obj.id,
                        title=t["title"],
                        description=t.get("description"),
                        display_order=t["display_order"],
                    )
                    db.add(t_obj)
        else:
            courses_map[c["course_code"]] = existing_c

    # 7. Seed Enrollments
    enrollments_plan = [
        ("student1@smartedu.local", "CS101"),
        ("student1@smartedu.local", "CS201"),
        ("student1@smartedu.local", "EC101"),  # Elective
        ("student2@smartedu.local", "CS101"),
        ("student2@smartedu.local", "CS201"),
        ("student3@smartedu.local", "CS101"),
        ("student3@smartedu.local", "CS201"),
        ("student4@smartedu.local", "EC101"),
        ("student5@smartedu.local", "EC101"),
    ]

    for student_email, course_code in enrollments_plan:
        student = users_map[student_email]
        course = courses_map[course_code]

        existing_enr = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course.id,
            Enrollment.semester_id == semester_obj.id,
        ).first()

        if not existing_enr:
            enr = Enrollment(
                student_id=student.id,
                course_id=course.id,
                semester_id=semester_obj.id,
                status=EnrollmentStatus.ACTIVE.value,
            )
            db.add(enr)
            logger.info(f"Enrolled {student_email} in {course_code}")

    db.commit()
    logger.info("Sample database fixtures completed successfully.")


def seed_database(db: Session, include_sample_data: bool = True) -> None:
    """Main database seeding entry point.
    In production (include_sample_data=False), initializes only system roles and permissions.
    In testing/dev (include_sample_data=True), seeds test fixtures as well.
    """
    roles_map = seed_system_roles_and_permissions(db)
    if include_sample_data:
        seed_sample_data(db, roles_map)
    db.commit()


def run_seed():
    """CLI entrypoint to seed the database."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seed()
