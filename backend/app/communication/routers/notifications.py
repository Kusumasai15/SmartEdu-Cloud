"""REST API Router for Notifications and User Preferences."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.communication import NotificationCategory
from app.communication.schemas import (
    NotificationResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    UnreadCountResponse,
)
from app.communication.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    category: Optional[NotificationCategory] = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve in-app notifications for the authenticated user."""
    return notification_service.list_user_notifications(
        db,
        current_user.id,
        category=category,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fast unread counters for notifications and messages."""
    un_notifs, un_msgs = notification_service.get_user_unread_counts(db, current_user.id)
    return UnreadCountResponse(
        unread_notifications_count=un_notifs,
        unread_messages_count=un_msgs,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read (ownership verified)."""
    return notification_service.mark_notification_read(db, notification_id, current_user.id)


@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications as read for authenticated user."""
    updated = notification_service.mark_all_notifications_read(db, current_user.id)
    return {"message": "All notifications marked as read.", "count": updated}


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve notification channel and category preferences."""
    return notification_service.get_or_create_preferences(db, current_user.id)


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification category preferences."""
    return notification_service.update_user_preferences(db, current_user.id, payload)
