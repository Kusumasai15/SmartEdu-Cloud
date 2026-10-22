"""Service layer for Academic Calendar Milestones and Official Holiday Management."""

from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.scheduling import AcademicCalendarEvent, CalendarEventType
from app.models.semester import Semester
from app.models.department import Department
from app.scheduling.schemas import CalendarEventCreate, CalendarEventResponse


def create_calendar_event(
    db: Session,
    payload: CalendarEventCreate,
    current_user: User,
) -> AcademicCalendarEvent:
    """Create a new academic milestone or holiday with date validation."""
    if payload.start_date > payload.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event start date cannot be after end date.",
        )

    # Scoping check: HOD can only manage department events
    if current_user.role.name == "HOD":
        if payload.department_id and payload.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only create events for their own department.",
            )
        payload.department_id = current_user.department_id
    elif current_user.role.name not in ["ADMINISTRATOR", "VC"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Academic Administrators or HODs can schedule calendar events.",
        )

    event = AcademicCalendarEvent(
        event_type=payload.event_type,
        title=payload.title,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        semester_id=payload.semester_id,
        department_id=payload.department_id,
        is_instructional_day=payload.is_instructional_day,
        created_by=current_user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_calendar_events(
    db: Session,
    semester_id: Optional[str] = None,
    department_id: Optional[str] = None,
    event_type: Optional[CalendarEventType] = None,
) -> List[CalendarEventResponse]:
    """Retrieve all matching academic calendar events."""
    query = db.query(AcademicCalendarEvent)
    if semester_id:
        query = query.filter(AcademicCalendarEvent.semester_id == semester_id)
    if department_id:
        query = query.filter(
            or_(
                AcademicCalendarEvent.department_id == department_id,
                AcademicCalendarEvent.department_id.is_(None),
            )
        )
    if event_type:
        query = query.filter(AcademicCalendarEvent.event_type == event_type)

    events = query.order_by(AcademicCalendarEvent.start_date.asc()).all()

    responses = []
    for e in events:
        responses.append(
            CalendarEventResponse(
                id=e.id,
                event_type=e.event_type,
                title=e.title,
                description=e.description,
                start_date=e.start_date,
                end_date=e.end_date,
                semester_id=e.semester_id,
                semester_name=e.semester.name if e.semester else None,
                department_id=e.department_id,
                department_name=e.department.name if e.department else "University-Wide",
                is_instructional_day=e.is_instructional_day,
                created_by=e.created_by,
                created_at=e.created_at,
            )
        )
    return responses


def is_date_holiday(db: Session, target_date: date) -> Optional[AcademicCalendarEvent]:
    """Check if a specific calendar date falls inside an official holiday."""
    return db.query(AcademicCalendarEvent).filter(
        AcademicCalendarEvent.event_type == CalendarEventType.HOLIDAY,
        AcademicCalendarEvent.start_date <= target_date,
        AcademicCalendarEvent.end_date >= target_date,
    ).first()
