"""Router for Academic Calendar Milestones and Holidays."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.scheduling import CalendarEventType
from app.scheduling.schemas import CalendarEventCreate, CalendarEventResponse
from app.scheduling.services import calendar_service

router = APIRouter(prefix="/calendar", tags=["Academic Calendar & Holidays"])


@router.get("", response_model=List[CalendarEventResponse])
def get_calendar_events(
    semester_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    event_type: Optional[CalendarEventType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve academic calendar events and holidays matching filters."""
    return calendar_service.list_calendar_events(
        db,
        semester_id=semester_id,
        department_id=department_id,
        event_type=event_type,
    )


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
def create_calendar_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new academic calendar event or holiday."""
    event = calendar_service.create_calendar_event(db, payload, current_user)
    return CalendarEventResponse(
        id=event.id,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        start_date=event.start_date,
        end_date=event.end_date,
        semester_id=event.semester_id,
        semester_name=event.semester.name if event.semester else None,
        department_id=event.department_id,
        department_name=event.department.name if event.department else "University-Wide",
        is_instructional_day=event.is_instructional_day,
        created_by=event.created_by,
        created_at=event.created_at,
    )
