"""Service layer for Notifications, Deduplication, and User Preferences."""

from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.user import User
from app.models.communication import (
    Notification,
    NotificationPreference,
    ConversationParticipant,
    DirectMessage,
    NotificationCategory,
    NotificationPriority,
    NotificationStatus,
)
from app.communication.schemas import (
    NotificationCreate,
    NotificationPreferenceUpdate,
)


def get_or_create_preferences(db: Session, user_id: str) -> NotificationPreference:
    """Retrieve or initialize default notification preferences for a user."""
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not pref:
        pref = NotificationPreference(
            user_id=user_id,
            email_enabled=False,
            academic_alerts=True,
            assignment_reminders=True,
            exam_notifications=True,
            result_notifications=True,
            announcements_enabled=True,
            ai_insights_enabled=True,
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def send_notification(
    db: Session,
    payload: NotificationCreate,
) -> Optional[Notification]:
    """Dispatch a notification with preference validation and deduplication."""
    # 1. Check user preferences
    prefs = get_or_create_preferences(db, payload.recipient_id)
    if payload.category == NotificationCategory.ACADEMIC and not prefs.academic_alerts:
        return None
    if payload.category == NotificationCategory.ASSIGNMENT and not prefs.assignment_reminders:
        return None
    if payload.category in [NotificationCategory.EXAM, NotificationCategory.QUIZ] and not prefs.exam_notifications:
        return None
    if payload.category == NotificationCategory.RESULT and not prefs.result_notifications:
        return None
    if payload.category == NotificationCategory.ANNOUNCEMENT and not prefs.announcements_enabled:
        return None
    if payload.category == NotificationCategory.AI_INSIGHT and not prefs.ai_insights_enabled:
        return None

    # 2. Deduplication check
    if payload.dedup_key:
        existing = db.query(Notification).filter(
            Notification.recipient_id == payload.recipient_id,
            Notification.dedup_key == payload.dedup_key,
        ).first()
        if existing:
            return existing

    # 3. Create Notification
    notif = Notification(
        recipient_id=payload.recipient_id,
        category=payload.category,
        priority=payload.priority,
        status=NotificationStatus.UNREAD,
        title=payload.title,
        message=payload.message,
        source_type=payload.source_type,
        source_id=payload.source_id,
        action_url=payload.action_url,
        dedup_key=payload.dedup_key,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def list_user_notifications(
    db: Session,
    user_id: str,
    category: Optional[NotificationCategory] = None,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[Notification]:
    """List notifications for a user with category and unread filters."""
    query = db.query(Notification).filter(Notification.recipient_id == user_id)
    if category:
        query = query.filter(Notification.category == category)
    if unread_only:
        query = query.filter(Notification.status == NotificationStatus.UNREAD)

    return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()


def get_user_unread_counts(db: Session, user_id: str) -> Tuple[int, int]:
    """Return tuple of (unread_notifications_count, unread_messages_count)."""
    # 1. Unread notifications
    un_notifs = db.query(func.count(Notification.id)).filter(
        Notification.recipient_id == user_id,
        Notification.status == NotificationStatus.UNREAD,
    ).scalar() or 0

    # 2. Unread messages
    parts = db.query(ConversationParticipant).filter(ConversationParticipant.user_id == user_id).all()
    un_msgs = 0
    for p in parts:
        cnt = db.query(func.count(DirectMessage.id)).filter(
            DirectMessage.conversation_id == p.conversation_id,
            DirectMessage.sender_id != user_id,
            DirectMessage.is_deleted == False,
            DirectMessage.created_at > p.last_read_at,
        ).scalar() or 0
        un_msgs += cnt

    return un_notifs, un_msgs


def mark_notification_read(
    db: Session,
    notification_id: str,
    user_id: str,
) -> Notification:
    """Mark a specific notification as read (ownership verified)."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == user_id,
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.status = NotificationStatus.READ
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_notifications_read(
    db: Session,
    user_id: str,
) -> int:
    """Mark all unread notifications for a user as read."""
    now = datetime.now(timezone.utc)
    updated = db.query(Notification).filter(
        Notification.recipient_id == user_id,
        Notification.status == NotificationStatus.UNREAD,
    ).update(
        {"status": NotificationStatus.READ, "read_at": now},
        synchronize_session=False,
    )
    db.commit()
    return updated


def update_user_preferences(
    db: Session,
    user_id: str,
    payload: NotificationPreferenceUpdate,
) -> NotificationPreference:
    """Update notification category preferences for a user."""
    pref = get_or_create_preferences(db, user_id)
    if payload.email_enabled is not None:
        pref.email_enabled = payload.email_enabled
    if payload.academic_alerts is not None:
        pref.academic_alerts = payload.academic_alerts
    if payload.assignment_reminders is not None:
        pref.assignment_reminders = payload.assignment_reminders
    if payload.exam_notifications is not None:
        pref.exam_notifications = payload.exam_notifications
    if payload.result_notifications is not None:
        pref.result_notifications = payload.result_notifications
    if payload.announcements_enabled is not None:
        pref.announcements_enabled = payload.announcements_enabled
    if payload.ai_insights_enabled is not None:
        pref.ai_insights_enabled = payload.ai_insights_enabled

    db.commit()
    db.refresh(pref)
    return pref
