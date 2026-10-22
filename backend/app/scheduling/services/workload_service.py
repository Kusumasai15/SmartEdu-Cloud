"""Service layer for Faculty Teaching Workload and Session Analytics."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.timetable import ClassSchedule, ScheduleStatus
from app.scheduling.schemas import FacultyWorkloadMetric


def _calculate_hours(start_time: str, end_time: str) -> float:
    """Convert HH:MM start and end times to duration in fractional hours."""
    try:
        sh, sm = map(int, start_time.split(":"))
        eh, em = map(int, end_time.split(":"))
        mins = (eh * 60 + em) - (sh * 60 + sm)
        return max(0.0, mins / 60.0)
    except Exception:
        return 1.0


def calculate_faculty_workload(
    db: Session,
    faculty_id: str,
) -> FacultyWorkloadMetric:
    """Compute deterministic weekly teaching workload metrics for a faculty member."""
    faculty = db.query(User).filter(User.id == faculty_id).first()
    f_name = f"{faculty.first_name} {faculty.last_name}" if faculty else "Faculty"
    d_name = faculty.department.name if faculty and faculty.department else "General"

    schedules = db.query(ClassSchedule).filter(
        ClassSchedule.faculty_id == faculty_id,
        ClassSchedule.status == ScheduleStatus.ACTIVE,
    ).all()

    total_hours = 0.0
    distinct_courses = set()
    for s in schedules:
        distinct_courses.add(s.course_id)
        total_hours += _calculate_hours(s.start_time, s.end_time)

    # Status classification
    if total_hours > 22.0:
        status_str = "OVERLOADED"
    elif total_hours > 16.0:
        status_str = "HIGH"
    else:
        status_str = "NORMAL"

    return FacultyWorkloadMetric(
        faculty_id=faculty_id,
        faculty_name=f_name,
        department_name=d_name,
        total_assigned_courses=len(distinct_courses),
        weekly_teaching_hours=round(total_hours, 1),
        total_weekly_sessions=len(schedules),
        lecture_hours=round(total_hours * 0.7, 1),
        lab_hours=round(total_hours * 0.2, 1),
        tutorial_hours=round(total_hours * 0.1, 1),
        status=status_str,
    )


def list_department_faculty_workloads(
    db: Session,
    department_id: Optional[str] = None,
) -> List[FacultyWorkloadMetric]:
    """Retrieve workload analytics for all faculty in a department or university."""
    query = db.query(User).filter(User.role.has(name="FACULTY"))
    if department_id:
        query = query.filter(User.department_id == department_id)

    faculty_members = query.all()
    return [calculate_faculty_workload(db, f.id) for f in faculty_members]
