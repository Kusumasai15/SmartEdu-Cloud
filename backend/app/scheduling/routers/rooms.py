"""Router for Academic Room and Resource Inventory."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.scheduling import RoomType
from app.scheduling.schemas import AcademicRoomCreate, AcademicRoomResponse
from app.scheduling.services import room_service

router = APIRouter(prefix="/rooms", tags=["Rooms & Resources"])


@router.get("", response_model=List[AcademicRoomResponse])
def get_rooms(
    building: Optional[str] = Query(None),
    room_type: Optional[RoomType] = Query(None),
    min_capacity: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve physical rooms with filtering options."""
    return room_service.list_rooms(
        db,
        building=building,
        room_type=room_type,
        min_capacity=min_capacity,
    )


@router.post("", response_model=AcademicRoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: AcademicRoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new room in the physical resource catalog."""
    room = room_service.create_room(db, payload, current_user)
    return AcademicRoomResponse.model_validate(room)


@router.put("/{room_id}", response_model=AcademicRoomResponse)
def update_room(room_id: str, payload: AcademicRoomCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return AcademicRoomResponse.model_validate(room_service.update_room(db, room_id, payload, current_user))


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room_service.delete_room(db, room_id, current_user)
