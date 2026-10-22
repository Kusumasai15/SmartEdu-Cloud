"""Production Database Role & Permission Initializer for SmartEdu Cloud (Zero Dummy Data)."""
import logging
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.models import Role, Permission, RolePermission

logger = logging.getLogger("smartedu.seed")


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


def init_roles_and_permissions(db: Session) -> dict[str, Role]:
    """Production entry point to initialize official roles and granular security permissions."""
    return seed_system_roles_and_permissions(db)


def seed_database(db: Session, include_sample_data: bool = False) -> None:
    """Production database initialization. Strictly seeds system roles and permissions (Zero Dummy Data)."""
    roles_map = seed_system_roles_and_permissions(db)
    db.commit()
    logger.info("Production security initialization completed with zero dummy data.")


def run_init():
    """CLI entrypoint to initialize production roles and permissions."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_init()
