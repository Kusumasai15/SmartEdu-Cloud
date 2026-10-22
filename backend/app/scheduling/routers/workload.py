"""Router for Faculty Workload Analytics and Attendance Shortage Calculations."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.course import CourseInstructor
from app.models.enrollment import Enrollment
from app.scheduling.schemas import (
    FacultyWorkloadMetric,
    StudentAttendanceShortageReport,
)
from app.scheduling.services import workload_service, attendance_intelligence_service

router = APIRouter(prefix="/scheduling-analytics", tags=["Workload & Shortage Analytics"])


@router.get("/workload/me", response_model=FacultyWorkloadMetric)
def get_my_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve personal teaching workload analytics for authenticated faculty."""
    if current_user.role.name != "FACULTY":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workload metrics available for faculty only.")
    return workload_service.calculate_faculty_workload(db, current_user.id)


@router.get("/workload/department/{dept_id}", response_model=List[FacultyWorkloadMetric])
def get_department_workload(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve faculty workload distribution for an academic department."""
    if current_user.role.name == "HOD" and current_user.department_id != dept_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view own department workload.")
    elif current_user.role.name not in ["HOD", "ADMINISTRATOR", "VC"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    return workload_service.list_department_faculty_workloads(db, dept_id)


@router.get("/shortage/me", response_model=StudentAttendanceShortageReport)
def get_my_shortage_and_recovery(
    target_threshold: float = Query(75.0, ge=50.0, le=100.0),
    remaining_sessions: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve deterministic attendance shortage report and recovery guidance for authenticated student."""
    if current_user.role.name != "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can view personal attendance shortage.")
    return attendance_intelligence_service.calculate_student_attendance_shortage_and_recovery(
        db,
        current_user.id,
        target_threshold_pct=target_threshold,
        estimated_remaining_sessions=remaining_sessions,
    )


@router.get("/shortage/students/{student_id}", response_model=StudentAttendanceShortageReport)
def get_student_shortage_and_recovery(
    student_id: str,
    target_threshold: float = Query(75.0, ge=50.0, le=100.0),
    remaining_sessions: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve shortage report for a student (accessible to Faculty, HOD, VC, Admin)."""
    student = db.query(User).filter(User.id == student_id, User.role.has(name="STUDENT")).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    role = current_user.role.name
    allowed = role in ("VC", "ADMINISTRATOR") or (role == "STUDENT" and current_user.id == student_id)
    if role == "HOD":
        allowed = bool(current_user.department_id and student.department_id == current_user.department_id)
    if role == "FACULTY":
        allowed = db.query(Enrollment.id).join(CourseInstructor, Enrollment.course_id == CourseInstructor.course_id).filter(
            Enrollment.student_id == student_id, CourseInstructor.faculty_id == current_user.id,
        ).first() is not None
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot view this student's attendance report.")

    return attendance_intelligence_service.calculate_student_attendance_shortage_and_recovery(
        db,
        student_id,
        target_threshold_pct=target_threshold,
        estimated_remaining_sessions=remaining_sessions,
    )
