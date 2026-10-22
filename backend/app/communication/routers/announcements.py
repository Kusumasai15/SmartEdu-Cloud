"""REST API Router for Scoped Announcements & Acknowledgements."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.communication.schemas import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementAcknowledgementResponse,
    AIDraftRequest,
    AIDraftResponse,
    AISummarizeRequest,
    AISummarizeResponse,
    AIToneImproveRequest,
    AIToneImproveResponse,
)
from app.communication.services import announcement_service
from app.communication.services.ai_draft_service import AIDraftService

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("", response_model=List[AnnouncementResponse])
def get_my_announcements(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve published announcements scoped to the authenticated user."""
    return announcement_service.list_announcements_for_user(
        db,
        current_user,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_new_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish a scoped announcement (Course, Department, or Institution)."""
    announcement = announcement_service.create_announcement(db, current_user, payload)
    return announcement_service.get_announcement_by_id(db, announcement.id, current_user)


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement_detail(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a single announcement."""
    return announcement_service.get_announcement_by_id(db, announcement_id, current_user)


@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
def edit_announcement_endpoint(
    announcement_id: str,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit announcement content or priority (author or admin only)."""
    return announcement_service.update_announcement(db, announcement_id, current_user, payload)


@router.post("/{announcement_id}/archive", response_model=AnnouncementResponse)
def archive_announcement_endpoint(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive an announcement (author or admin only)."""
    return announcement_service.archive_announcement(db, announcement_id, current_user)


@router.post("/{announcement_id}/acknowledge", response_model=AnnouncementAcknowledgementResponse)
def acknowledge_announcement_endpoint(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge receipt and reading of a mandatory announcement."""
    ack = announcement_service.acknowledge_announcement(db, announcement_id, current_user.id)
    return AnnouncementAcknowledgementResponse(
        announcement_id=ack.announcement_id,
        user_id=ack.user_id,
        acknowledged_at=ack.acknowledged_at,
    )


@router.post("/ai-draft", response_model=AIDraftResponse)
def generate_announcement_draft_endpoint(
    payload: AIDraftRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate an AI draft announcement for review and editing."""
    if current_user.role.name == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students cannot draft announcements.")
    return AIDraftService.generate_announcement_draft(payload)


@router.post("/ai-summarize", response_model=AISummarizeResponse)
def summarize_announcement_endpoint(
    payload: AISummarizeRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a concise AI summary of an announcement."""
    return AIDraftService.summarize_announcement(payload)


@router.post("/ai-tone", response_model=AIToneImproveResponse)
def improve_announcement_tone_endpoint(
    payload: AIToneImproveRequest,
    current_user: User = Depends(get_current_user),
):
    """Improve text tone to match professional university standards."""
    return AIDraftService.improve_tone(payload)
