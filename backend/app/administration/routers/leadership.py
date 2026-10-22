"""Role-scoped, database-backed leadership counts."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.core.database import get_db
from app.models.course import Course, CourseInstructor
from app.models.department import Department
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.result import AcademicStatus, CourseResult, ResultStatus
from app.models.role import Role
from app.models.user import User
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus


def _scoped_courses(db: Session, user: User):
    query = db.query(Course.id)
    if user.role.name == "HOD":
        if not user.department_id:
            raise HTTPException(status_code=403, detail="Department assignment required.")
        query = query.filter(Course.department_id == user.department_id)
    elif user.role.name == "FACULTY":
        query = query.join(CourseInstructor).filter(CourseInstructor.faculty_id == user.id)
    return query

router = APIRouter(prefix="/leadership", tags=["Leadership"])


@router.get("/support")
def get_student_support(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FACULTY", "HOD", "VC", "ADMINISTRATOR")),
):
    """Measured attendance shortages and failed published results, aggregated in SQL."""
    course_ids = _scoped_courses(db, current_user)
    attendance = db.query(
        AttendanceRecord.student_id.label("student_id"),
        func.count(AttendanceRecord.id).label("sessions"),
        func.sum(case((AttendanceRecord.status.in_((AttendanceStatus.PRESENT, AttendanceStatus.LATE)), 1), else_=0)).label("attended"),
    ).join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id).filter(
        AttendanceSession.course_id.in_(course_ids),
        AttendanceRecord.status != AttendanceStatus.EXCUSED,
    ).group_by(AttendanceRecord.student_id).subquery()
    failures = db.query(
        CourseResult.student_id.label("student_id"), func.count(CourseResult.id).label("failed_courses"),
    ).filter(
        CourseResult.course_id.in_(course_ids),
        CourseResult.status.in_((ResultStatus.PUBLISHED, ResultStatus.LOCKED)),
        CourseResult.academic_status == AcademicStatus.FAIL,
    ).group_by(CourseResult.student_id).subquery()
    percentage = 100.0 * attendance.c.attended / func.nullif(attendance.c.sessions, 0)
    query = db.query(User, percentage.label("attendance_percentage"), failures.c.failed_courses).outerjoin(
        attendance, attendance.c.student_id == User.id,
    ).outerjoin(failures, failures.c.student_id == User.id).filter(
        User.is_active.is_(True), User.role.has(name="STUDENT"),
        or_(percentage < 75, failures.c.failed_courses > 0),
    )
    if current_user.role.name == "HOD":
        query = query.filter(User.department_id == current_user.department_id)
    total = query.count()
    rows = query.order_by(User.last_name, User.first_name, User.id).offset(offset).limit(limit).all()
    return {"success": True, "data": {"total": total, "items": [{
        "id": student.id, "name": student.full_name, "email": student.email,
        "student_identifier": student.student_identifier,
        "attendance_percentage": round(float(attendance_pct), 1) if attendance_pct is not None else None,
        "failed_courses": int(failed or 0),
    } for student, attendance_pct, failed in rows]}}


@router.get("/students")
def get_department_students(
    search: str = "",
    department_id: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HOD", "VC", "ADMINISTRATOR")),
):
    """Paginate the HOD's own student accounts without exposing other departments."""
    if current_user.role.name == "HOD" and not current_user.department_id:
        raise HTTPException(status_code=403, detail="Department assignment required.")
    if current_user.role.name == "HOD":
        if department_id and department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only view your department.")
        department_id = current_user.department_id
    query = db.query(User).join(Role, User.role_id == Role.id).filter(
        Role.name == "STUDENT",
        User.is_active.is_(True),
    )
    if department_id:
        query = query.filter(User.department_id == department_id)
    clean_search = search.strip()
    if clean_search:
        pattern = f"%{clean_search}%"
        query = query.filter(or_(
            User.first_name.ilike(pattern), User.last_name.ilike(pattern),
            User.email.ilike(pattern), User.student_identifier.ilike(pattern),
        ))
    total = query.count()
    students = query.order_by(User.last_name, User.first_name, User.id).offset(offset).limit(limit).all()
    return {"success": True, "data": {
        "total": total,
        "items": [{
            "id": student.id,
            "name": student.full_name,
            "email": student.email,
            "student_identifier": student.student_identifier,
        } for student in students],
    }}


@router.get("/faculty")
def get_department_faculty(
    department_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HOD", "VC", "ADMINISTRATOR")),
):
    """List active department instructors and their saved course assignments."""
    if current_user.role.name == "HOD" and not current_user.department_id:
        raise HTTPException(status_code=403, detail="Department assignment required.")
    if current_user.role.name == "HOD":
        if department_id and department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You can only view your department.")
        department_id = current_user.department_id
    faculty_query = db.query(User).join(Role, User.role_id == Role.id).filter(
        Role.name.in_(("FACULTY", "HOD")),
        User.is_active.is_(True),
    )
    if department_id:
        faculty_query = faculty_query.filter(User.department_id == department_id)
    faculty = faculty_query.order_by(User.last_name, User.first_name).all()
    assignments = db.query(CourseInstructor.faculty_id, Course.course_code).join(
        Course, CourseInstructor.course_id == Course.id
    ).filter(CourseInstructor.faculty_id.in_([member.id for member in faculty])).all()
    courses_by_faculty: dict[str, list[str]] = {}
    for faculty_id, course_code in assignments:
        courses_by_faculty.setdefault(faculty_id, []).append(course_code)
    return {"success": True, "data": [{
        "id": member.id,
        "name": member.full_name,
        "email": member.email,
        "role": member.role.name,
        "course_codes": courses_by_faculty.get(member.id, []),
    } for member in faculty]}


@router.get("/overview")
def get_leadership_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HOD", "VC", "ADMINISTRATOR")),
):
    """Return real counts, scoped to an HOD's own department."""
    is_hod = current_user.role.name == "HOD"
    if is_hod and not current_user.department_id:
        raise HTTPException(status_code=403, detail="Department assignment required.")

    departments_query = db.query(Department.id, Department.name, Department.code, Department.school).filter(
        Department.is_active.is_(True)
    )
    if is_hod:
        departments_query = departments_query.filter(Department.id == current_user.department_id)
    departments = departments_query.order_by(Department.name).all()
    ids = [department.id for department in departments]
    if not ids:
        return {"success": True, "data": {"departments": [], "result_courses": [], "totals": {
            "departments": 0, "students": 0, "faculty": 0, "courses": 0,
            "enrollments": 0, "pending_result_courses": 0,
        }}}

    user_counts = db.query(User.department_id, Role.name, func.count(User.id)).join(
        Role, User.role_id == Role.id
    ).filter(User.department_id.in_(ids), User.is_active.is_(True)).group_by(
        User.department_id, Role.name
    ).all()
    course_counts = db.query(Course.department_id, func.count(Course.id)).filter(
        Course.department_id.in_(ids), Course.is_active.is_(True)
    ).group_by(Course.department_id).all()
    enrollment_counts = db.query(Course.department_id, func.count(Enrollment.id)).join(
        Course, Enrollment.course_id == Course.id
    ).filter(Course.department_id.in_(ids), Enrollment.status == EnrollmentStatus.ACTIVE.value).group_by(
        Course.department_id
    ).all()
    pending_counts = db.query(Course.department_id, func.count(func.distinct(CourseResult.course_id))).join(
        Course, CourseResult.course_id == Course.id
    ).filter(Course.department_id.in_(ids), CourseResult.status == ResultStatus.SUBMITTED).group_by(
        Course.department_id
    ).all()

    users_by_department = {(department_id, role): count for department_id, role, count in user_counts}
    courses_by_department = dict(course_counts)
    enrollments_by_department = dict(enrollment_counts)
    pending_by_department = dict(pending_counts)
    result_groups = db.query(
        CourseResult.course_id,
        CourseResult.semester_id,
        CourseResult.status,
        Course.course_code,
        Course.name,
        Course.department_id,
        func.count(CourseResult.id),
        func.avg(CourseResult.grade_point),
        func.sum(case((CourseResult.academic_status == AcademicStatus.PASS, 1), else_=0)),
    ).join(Course, CourseResult.course_id == Course.id).filter(
        Course.department_id.in_(ids),
        CourseResult.status.in_((ResultStatus.SUBMITTED, ResultStatus.APPROVED, ResultStatus.PUBLISHED)),
    ).group_by(
        CourseResult.course_id, CourseResult.semester_id, CourseResult.status,
        Course.course_code, Course.name, Course.department_id,
    ).all()
    result_courses = [{
        "course_id": course_id,
        "semester_id": semester_id,
        "status": result_status.value,
        "course_code": course_code,
        "course_name": course_name,
        "department_id": department_id,
        "student_count": count,
        "average_gpa": round(float(avg_gpa or 0), 2),
        "pass_rate": round(100 * int(passed or 0) / count, 1) if count else 0,
    } for course_id, semester_id, result_status, course_code, course_name, department_id, count, avg_gpa, passed in result_groups]
    rows = []
    for department in departments:
        rows.append({
            "id": department.id,
            "name": department.name,
            "code": department.code,
            "school": department.school,
            "students": users_by_department.get((department.id, "STUDENT"), 0),
            "faculty": users_by_department.get((department.id, "FACULTY"), 0)
            + users_by_department.get((department.id, "HOD"), 0),
            "courses": courses_by_department.get(department.id, 0),
            "enrollments": enrollments_by_department.get(department.id, 0),
            "pending_result_courses": pending_by_department.get(department.id, 0),
        })

    totals = {key: sum(row[key] for row in rows) for key in (
        "students", "faculty", "courses", "enrollments", "pending_result_courses"
    )}
    totals["departments"] = len(rows)
    return {"success": True, "data": {"departments": rows, "result_courses": result_courses, "totals": totals}}
