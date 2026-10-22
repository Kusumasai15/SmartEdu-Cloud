"""Deterministic Attendance Shortage Detection and Mathematical Recovery Projection Engine."""

import math
from typing import List
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.scheduling.schemas import (
    CourseAttendanceShortage,
    StudentAttendanceShortageReport,
)


def calculate_student_attendance_shortage_and_recovery(
    db: Session,
    student_id: str,
    target_threshold_pct: float = 75.0,
    estimated_remaining_sessions: int = 10,
) -> StudentAttendanceShortageReport:
    """Calculate deterministic shortage indicators and future session recovery requirements."""
    student = db.query(User).filter(User.id == student_id).first()
    s_name = f"{student.first_name} {student.last_name}" if student else "Student"

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    course_shortages: List[CourseAttendanceShortage] = []
    total_conducted_all = 0
    total_attended_all = 0

    for enr in enrollments:
        course = enr.course
        if not course:
            continue

        records = (
            db.query(AttendanceRecord)
            .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
            .filter(
                AttendanceSession.course_id == course.id,
                AttendanceRecord.student_id == student_id,
            )
            .all()
        )

        conducted = len(records)
        attended = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED])

        total_conducted_all += conducted
        total_attended_all += attended

        pct = (attended / conducted * 100.0) if conducted > 0 else 100.0
        is_shortage = pct < target_threshold_pct and conducted >= 2

        # Recovery Math:
        # (attended + x) / (conducted + remaining) >= (target / 100)
        # x >= (target / 100) * (conducted + remaining) - attended
        target_fraction = target_threshold_pct / 100.0
        required_total = math.ceil(target_fraction * (conducted + estimated_remaining_sessions))
        needed = max(0, required_total - attended)

        if needed <= estimated_remaining_sessions:
            recovery_possible = True
            guidance = f"To reach {target_threshold_pct:.0f}%, you must attend at least {needed} of the next {estimated_remaining_sessions} scheduled sessions."
        else:
            recovery_possible = False
            guidance = f"Shortage critical. Even attending all next {estimated_remaining_sessions} sessions will reach {((attended + estimated_remaining_sessions)/(conducted + estimated_remaining_sessions)*100):.1f}%."

        course_shortages.append(
            CourseAttendanceShortage(
                course_id=course.id,
                course_code=course.course_code,
                course_name=course.name,
                total_sessions_conducted=conducted,
                sessions_attended=attended,
                current_attendance_pct=round(pct, 1),
                is_shortage=is_shortage,
                required_threshold_pct=target_threshold_pct,
                estimated_remaining_sessions=estimated_remaining_sessions,
                minimum_sessions_to_attend=needed,
                recovery_possible=recovery_possible,
                recovery_guidance=guidance,
            )
        )

    overall_pct = (total_attended_all / total_conducted_all * 100.0) if total_conducted_all > 0 else 100.0
    has_any = any(cs.is_shortage for cs in course_shortages)

    return StudentAttendanceShortageReport(
        student_id=student_id,
        student_name=s_name,
        overall_attendance_pct=round(overall_pct, 1),
        has_any_shortage=has_any,
        shortage_courses=course_shortages,
    )
