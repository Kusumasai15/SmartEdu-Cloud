"""Admin Dashboard Summary Router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.models.course import Course
from app.models.semester import Semester
from app.models.exam import Exam
from app.models.token import RefreshToken
from app.administration.schemas import AdminDashboardStats
from app.administration.services.governance_service import get_governance_summary
from app.administration.services.system_health_service import check_system_health

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/dashboard", response_model=AdminDashboardStats)
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Retrieve comprehensive platform KPIs and operational metrics for the Administrator Control Center."""
    # 1. Role-wise user counts
    students_cnt = db.query(func.count(User.id)).join(Role).filter(Role.name == "STUDENT").scalar() or 0
    faculty_cnt = db.query(func.count(User.id)).join(Role).filter(Role.name == "FACULTY").scalar() or 0
    hod_cnt = db.query(func.count(User.id)).join(Role).filter(Role.name == "HOD").scalar() or 0
    admin_cnt = db.query(func.count(User.id)).join(Role).filter(Role.name == "ADMINISTRATOR").scalar() or 0

    # 2. Academic catalogs
    courses_cnt = db.query(func.count(Course.id)).scalar() or 0
    depts_cnt = db.query(func.count(Department.id)).scalar() or 0

    # 3. Active Term
    active_sem = db.query(Semester).filter(Semester.is_current == True).first()
    acad_year = active_sem.academic_year if active_sem else "2026-27"
    sem_name = active_sem.name if active_sem else "Fall 2026"

    # 4. Active Exams
    active_exams = db.query(func.count(Exam.id)).filter(Exam.is_published == True).scalar() or 0

    # 5. Governance & Health
    gov_summary = get_governance_summary(db)
    health = check_system_health(db)

    # 6. Active sessions
    active_sessions = db.query(func.count(RefreshToken.id)).filter(RefreshToken.revoked == False).scalar() or 0

    return AdminDashboardStats(
        total_students=students_cnt,
        total_faculty=faculty_cnt,
        total_hods=hod_cnt,
        total_administrators=admin_cnt,
        total_courses=courses_cnt,
        total_departments=depts_cnt,
        active_academic_year=acad_year,
        active_semester_name=sem_name,
        active_exams_count=active_exams,
        pending_governance_count=gov_summary.total_actionable_requests,
        failed_logins_count=0,
        active_sessions_count=active_sessions,
        system_health_status=health.overall_status,
    )
