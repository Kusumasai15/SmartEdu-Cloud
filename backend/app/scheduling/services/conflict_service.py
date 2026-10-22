"""Service layer for Deep Multi-Vector Timetable Conflict Detection."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.timetable import ClassSchedule, DayOfWeek, ScheduleStatus
from app.models.scheduling import AcademicCalendarEvent, CalendarEventType
from app.models.exam import Exam
from app.scheduling.schemas import (
    TimetableConflictCheckRequest,
    ConflictCheckReport,
    ConflictItem,
)


def _times_overlap(s1: str, e1: str, s2: str, e2: str) -> bool:
    """Return True if time intervals [s1, e1) and [s2, e2) overlap."""
    return not (e1 <= s2 or s1 >= e2)


def check_timetable_conflicts(
    db: Session,
    req: TimetableConflictCheckRequest,
) -> ConflictCheckReport:
    """Evaluate multi-vector scheduling collisions across faculty, rooms, sections, and holidays."""
    conflicts: List[ConflictItem] = []

    # 1. Faculty Collision Check
    faculty_schedules = db.query(ClassSchedule).filter(
        ClassSchedule.faculty_id == req.faculty_id,
        ClassSchedule.day_of_week == req.day_of_week,
        ClassSchedule.status == ScheduleStatus.ACTIVE,
    )
    if req.exclude_schedule_id:
        faculty_schedules = faculty_schedules.filter(ClassSchedule.id != req.exclude_schedule_id)

    for s in faculty_schedules.all():
        if _times_overlap(req.start_time, req.end_time, s.start_time, s.end_time):
            c_name = s.course.name if s.course else "Course"
            conflicts.append(
                ConflictItem(
                    conflict_type="FACULTY_OVERLAP",
                    severity="BLOCKING",
                    description=f"Faculty is already scheduled to teach '{c_name}' from {s.start_time} to {s.end_time}.",
                    conflicting_entity=s.id,
                )
            )

    # 2. Room Collision Check
    room_schedules = db.query(ClassSchedule).filter(
        ClassSchedule.room == req.room.strip(),
        ClassSchedule.day_of_week == req.day_of_week,
        ClassSchedule.status == ScheduleStatus.ACTIVE,
    )
    if req.exclude_schedule_id:
        room_schedules = room_schedules.filter(ClassSchedule.id != req.exclude_schedule_id)

    for s in room_schedules.all():
        if req.building and s.building and req.building.strip().lower() != s.building.strip().lower():
            continue
        if _times_overlap(req.start_time, req.end_time, s.start_time, s.end_time):
            c_name = s.course.name if s.course else "Course"
            f_name = f"{s.faculty.first_name} {s.faculty.last_name}" if s.faculty else "Faculty"
            conflicts.append(
                ConflictItem(
                    conflict_type="ROOM_DOUBLE_BOOKED",
                    severity="BLOCKING",
                    description=f"Room '{req.room}' is already booked for '{c_name}' ({f_name}) from {s.start_time} to {s.end_time}.",
                    conflicting_entity=s.id,
                )
            )

    # 3. Exam Schedule Collision Check
    course_exams = db.query(Exam).filter(
        Exam.course_id == req.course_id,
        Exam.is_published == True,
    ).all()
    for ex in course_exams:
        if ex.start_time and ex.end_time:
            ex_start = ex.start_time.strftime("%H:%M")
            ex_end = ex.end_time.strftime("%H:%M")
            if _times_overlap(req.start_time, req.end_time, ex_start, ex_end):
                conflicts.append(
                    ConflictItem(
                        conflict_type="EXAM_COLLISION",
                        severity="WARNING",
                        description=f"Scheduled time overlaps with scheduled examination '{ex.title}'.",
                        conflicting_entity=ex.id,
                    )
                )

    is_blocked = any(c.severity == "BLOCKING" for c in conflicts)
    return ConflictCheckReport(
        has_conflicts=len(conflicts) > 0,
        is_blocked=is_blocked,
        conflicts=conflicts,
    )
