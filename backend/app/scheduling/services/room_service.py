"""Service layer for Academic Room and Resource Inventory Management."""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.scheduling import AcademicRoom, RoomType
from app.models.timetable import ClassSchedule
from app.scheduling.schemas import AcademicRoomCreate, AcademicRoomResponse


ROOM_CATEGORIES = {"LECTURE_HALL", "LABORATORY", "CLASSROOM", "SEMINAR_HALL", "AUDITORIUM"}
ROOM_STATUSES = {"AVAILABLE", "MAINTENANCE", "RESERVED"}


def _require_admin(current_user: User) -> None:
    if current_user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can manage the room inventory.")


def _validate_details(payload: AcademicRoomCreate) -> None:
    if not payload.building.strip() or not payload.room_number.strip():
        raise HTTPException(status_code=422, detail="Building and room number are required.")
    if payload.room_category and payload.room_category not in ROOM_CATEGORIES:
        raise HTTPException(status_code=422, detail="Unsupported room category.")
    if payload.operational_status not in ROOM_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported room status.")


def _apply_details(room: AcademicRoom, payload: AcademicRoomCreate) -> None:
    room.building = payload.building.strip()
    room.floor = (payload.floor or "").strip() or None
    room.room_number = payload.room_number.strip()
    room.display_name = (payload.display_name or "").strip() or None
    room.room_category = payload.room_category or payload.room_type.value
    room.facilities = [value.strip() for value in payload.facilities if value.strip()]
    room.operational_status = payload.operational_status
    room.capacity = payload.capacity
    room.room_type = payload.room_type
    room.has_projector = payload.has_projector
    room.has_recording = payload.has_recording


def create_room(
    db: Session,
    payload: AcademicRoomCreate,
    current_user: User,
) -> AcademicRoom:
    """Create a new room in the physical resource inventory."""
    _require_admin(current_user)
    _validate_details(payload)

    existing = db.query(AcademicRoom).filter(
        AcademicRoom.building == payload.building.strip(),
        AcademicRoom.room_number == payload.room_number.strip(),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room {payload.room_number} in {payload.building} already exists.",
        )

    room = AcademicRoom(is_active=True)
    _apply_details(room, payload)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def update_room(db: Session, room_id: str, payload: AcademicRoomCreate, current_user: User) -> AcademicRoom:
    _require_admin(current_user)
    _validate_details(payload)
    room = db.query(AcademicRoom).filter(AcademicRoom.id == room_id, AcademicRoom.is_active.is_(True)).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    duplicate = db.query(AcademicRoom).filter(
        AcademicRoom.id != room_id,
        AcademicRoom.building == payload.building.strip(),
        AcademicRoom.room_number == payload.room_number.strip(),
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="That room number already exists in this building.")
    _apply_details(room, payload)
    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room_id: str, current_user: User) -> None:
    _require_admin(current_user)
    room = db.query(AcademicRoom).filter(AcademicRoom.id == room_id, AcademicRoom.is_active.is_(True)).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    booked = db.query(ClassSchedule.id).filter(ClassSchedule.room == room.room_number, ClassSchedule.building == room.building).first()
    if booked:
        raise HTTPException(status_code=409, detail="This room is used by a timetable entry and cannot be deleted.")
    db.delete(room)
    db.commit()


def list_rooms(
    db: Session,
    building: Optional[str] = None,
    room_type: Optional[RoomType] = None,
    min_capacity: Optional[int] = None,
) -> List[AcademicRoomResponse]:
    """Retrieve rooms with filtering options."""
    query = db.query(AcademicRoom).filter(AcademicRoom.is_active == True)
    if building:
        query = query.filter(AcademicRoom.building == building)
    if room_type:
        query = query.filter(AcademicRoom.room_type == room_type)
    if min_capacity:
        query = query.filter(AcademicRoom.capacity >= min_capacity)

    rooms = query.order_by(AcademicRoom.building.asc(), AcademicRoom.room_number.asc()).all()
    return [AcademicRoomResponse.model_validate(r) for r in rooms]
