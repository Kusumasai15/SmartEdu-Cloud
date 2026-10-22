"""Service layer for Advanced Timetable Operations, Conflict Validation, Rescheduling & Substitutions."""

from typing import List, Optional
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.timetable import ClassSchedule, ScheduleStatus, DayOfWeek
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.scheduling import (
    ScheduleChangeLog,
    SubstituteFacultyAssignment,
    SubstitutionStatus,
)
from app.scheduling.schemas import (
    TimetableConflictCheckRequest,
    ScheduleRescheduleRequest,
    SubstituteFacultyRequest,
    SubstituteFacultyResponse,
)
from app.scheduling.services.conflict_service import check_timetable_conflicts
from app.communication.services.notification_service import send_notification
from app.communication.schemas import NotificationCreate
from app.models.communication import NotificationCategory, NotificationPriority


def reschedule_class_schedule(
    db: Session,
    schedule_id: str,
    payload: ScheduleRescheduleRequest,
    current_user: User,
) -> ClassSchedule:
    """Reschedule an existing timetable class with conflict validation and audit logging."""
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class schedule not found.")

    # Authorization
    if current_user.role.name not in ["ADMINISTRATOR", "HOD", "FACULTY"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reschedule classes.")
    if current_user.role.name == "FACULTY" and schedule.faculty_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only reschedule your own classes.")

    # Validate conflicts
    report = check_timetable_conflicts(
        db,
        TimetableConflictCheckRequest(
            course_id=schedule.course_id,
            faculty_id=schedule.faculty_id,
            day_of_week=payload.new_day_of_week,
            start_time=payload.new_start_time,
            end_time=payload.new_end_time,
            room=payload.new_room,
            building=schedule.building,
            exclude_schedule_id=schedule.id,
        ),
    )
    if report.is_blocked:
        errs = "; ".join(c.description for c in report.conflicts if c.severity == "BLOCKING")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Scheduling Conflict: {errs}")

    # Audit log
    log_entry = ScheduleChangeLog(
        schedule_id=schedule.id,
        old_day=schedule.day_of_week.value if hasattr(schedule.day_of_week, "value") else str(schedule.day_of_week),
        old_start_time=schedule.start_time,
        old_end_time=schedule.end_time,
        old_room=schedule.room,
        new_day=payload.new_day_of_week.value,
        new_start_time=payload.new_start_time,
        new_end_time=payload.new_end_time,
        new_room=payload.new_room,
        reason=payload.reason.strip(),
        changed_by=current_user.id,
    )
    db.add(log_entry)

    # Apply changes
    schedule.day_of_week = payload.new_day_of_week
    schedule.start_time = payload.new_start_time
    schedule.end_time = payload.new_end_time
    schedule.room = payload.new_room

    db.commit()
    db.refresh(schedule)

    # Notify enrolled students
    c_name = schedule.course.name if schedule.course else "Course"
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == schedule.course_id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    for e in enrollments:
        send_notification(
            db,
            NotificationCreate(
                recipient_id=e.student_id,
                category=NotificationCategory.ACADEMIC,
                priority=NotificationPriority.HIGH,
                title=f"Class Rescheduled: {c_name}",
                message=f"{c_name} has been rescheduled to {payload.new_day_of_week.value} {payload.new_start_time} - {payload.new_end_time} in Room {payload.new_room}. Reason: {payload.reason}",
                source_type="TIMETABLE",
                source_id=schedule.id,
                action_url="/student",
                dedup_key=f"resched_{schedule.id}_{e.student_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
            ),
        )

    return schedule


def assign_substitute_faculty(
    db: Session,
    schedule_id: str,
    payload: SubstituteFacultyRequest,
    current_user: User,
) -> SubstituteFacultyAssignment:
    """Temporarily assign a substitute instructor for a scheduled class session."""
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")

    sub_faculty = db.query(User).filter(User.id == payload.substitute_faculty_id).first()
    if not sub_faculty or sub_faculty.role.name != "FACULTY":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid substitute faculty user.")

    assignment = SubstituteFacultyAssignment(
        schedule_id=schedule.id,
        original_faculty_id=schedule.faculty_id,
        substitute_faculty_id=sub_faculty.id,
        assigned_date=payload.assigned_date,
        status=SubstitutionStatus.ACTIVE,
        reason=payload.reason.strip(),
        approved_by=current_user.id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    # Notify substitute faculty
    c_name = schedule.course.name if schedule.course else "Course"
    send_notification(
        db,
        NotificationCreate(
            recipient_id=sub_faculty.id,
            category=NotificationCategory.WORKFLOW,
            priority=NotificationPriority.HIGH,
            title=f"Substitute Teaching Request: {c_name}",
            message=f"You have been assigned as substitute instructor for {c_name} on {payload.assigned_date} ({schedule.start_time}-{schedule.end_time}).",
            source_type="SUBSTITUTE",
            source_id=assignment.id,
            action_url="/faculty",
            dedup_key=f"sub_fac_{assignment.id}_{sub_faculty.id}",
        ),
    )

    return assignment
