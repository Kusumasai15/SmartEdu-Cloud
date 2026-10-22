"""Router for Timetable Conflict Validation, Rescheduling, and Substitute Faculty."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.scheduling.schemas import (
    TimetableConflictCheckRequest,
    ConflictCheckReport,
    ScheduleRescheduleRequest,
    SubstituteFacultyRequest,
    SubstituteFacultyResponse,
)
from app.attendance.schemas import ClassScheduleResponse
from app.scheduling.services import conflict_service, timetable_service

router = APIRouter(prefix="/timetable-advanced", tags=["Advanced Timetable & Conflicts"])


@router.post("/conflict-check", response_model=ConflictCheckReport)
def check_conflicts(
    payload: TimetableConflictCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Perform multi-vector conflict detection for a proposed schedule."""
    return conflict_service.check_timetable_conflicts(db, payload)


@router.post("/schedules/{id}/reschedule", response_model=ClassScheduleResponse)
def reschedule_schedule(
    id: str,
    payload: ScheduleRescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reschedule an existing class schedule with conflict checks and student notification."""
    s = timetable_service.reschedule_class_schedule(db, id, payload, current_user)
    return ClassScheduleResponse(
        id=s.id,
        course_id=s.course_id,
        course_code=s.course.course_code if s.course else None,
        course_name=s.course.name if s.course else None,
        faculty_id=s.faculty_id,
        faculty_name=f"{s.faculty.first_name} {s.faculty.last_name}" if s.faculty else None,
        section_name=s.section_name,
        day_of_week=s.day_of_week,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        building=s.building,
        academic_period=s.academic_period,
        status=s.status,
        created_at=s.created_at,
    )


@router.post("/schedules/{id}/substitute", response_model=SubstituteFacultyResponse, status_code=status.HTTP_201_CREATED)
def assign_substitute(
    id: str,
    payload: SubstituteFacultyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a temporary substitute faculty for a scheduled class session."""
    sub = timetable_service.assign_substitute_faculty(db, id, payload, current_user)
    c_code = sub.schedule.course.course_code if sub.schedule and sub.schedule.course else "COURSE"
    c_name = sub.schedule.course.name if sub.schedule and sub.schedule.course else "Course"
    orig_name = f"{sub.original_faculty.first_name} {sub.original_faculty.last_name}" if sub.original_faculty else "Faculty"
    sub_name = f"{sub.substitute_faculty.first_name} {sub.substitute_faculty.last_name}" if sub.substitute_faculty else "Substitute"

    return SubstituteFacultyResponse(
        id=sub.id,
        schedule_id=sub.schedule_id,
        course_code=c_code,
        course_name=c_name,
        original_faculty_name=orig_name,
        substitute_faculty_name=sub_name,
        assigned_date=sub.assigned_date,
        status=sub.status,
        reason=sub.reason,
        created_at=sub.created_at,
    )
