"""Service layer for Scoped Announcements, Target Resolution, and Acknowledgements."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, insert
from fastapi import HTTPException, status

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.department import Department
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.communication import (
    Announcement,
    AnnouncementAcknowledgement,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementPriority,
    NotificationCategory,
    NotificationPriority,
    Notification,
    NotificationStatus,
    NotificationPreference,
)
from app.communication.schemas import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
)
from app.communication.services.notification_service import send_notification
from app.communication.schemas import NotificationCreate


def create_announcement(
    db: Session,
    author: User,
    payload: AnnouncementCreate,
) -> Announcement:
    """Create and publish a scoped announcement with strict role boundary enforcement."""
    # 1. Authorization checks
    if author.role.name == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to publish announcements.",
        )

    if author.role.name == "FACULTY":
        if payload.scope_type == AnnouncementScope.COURSE:
            if not payload.scope_id:
                first_course = db.query(CourseInstructor).filter(CourseInstructor.faculty_id == author.id).first()
                if first_course:
                    payload.scope_id = first_course.course_id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No course found assigned to this faculty member.",
                    )
            is_assigned = db.query(CourseInstructor).filter(
                CourseInstructor.course_id == payload.scope_id,
                CourseInstructor.faculty_id == author.id,
            ).first()
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to publish announcements for this course.",
                )
        elif payload.scope_type == AnnouncementScope.DEPARTMENT:
            payload.scope_id = author.department_id
        # INSTITUTION / CAMPUS scope is permitted for faculty / class advisors

    elif author.role.name == "HOD":
        if payload.scope_type == AnnouncementScope.INSTITUTION:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD cannot publish institution-wide announcements.",
            )
        if payload.scope_type == AnnouncementScope.DEPARTMENT:
            if payload.scope_id and payload.scope_id != author.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HOD can only publish announcements for their own department.",
                )
            payload.scope_id = author.department_id

    # 2. Date validation
    if payload.expires_at and payload.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be in the future.",
        )

    # 3. Create Announcement
    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        author_id=author.id,
        scope_type=payload.scope_type,
        scope_id=payload.scope_id,
        priority=payload.priority,
        status=AnnouncementStatus.PUBLISHED if payload.publish_now else AnnouncementStatus.DRAFT,
        is_acknowledgement_required=payload.is_acknowledgement_required,
        expires_at=payload.expires_at,
    )
    try:
        db.add(announcement)
        db.flush()
        if announcement.status == AnnouncementStatus.PUBLISHED:
            _dispatch_announcement_notifications(db, announcement)
        db.commit()
        db.refresh(announcement)
    except Exception:
        db.rollback()
        raise

    return announcement


def _dispatch_announcement_notifications(db: Session, announcement: Announcement):
    """Insert scoped notifications in batches in the announcement transaction."""
    recipients = db.query(User.id).outerjoin(
        NotificationPreference, NotificationPreference.user_id == User.id,
    ).filter(
        User.is_active.is_(True), User.id != announcement.author_id,
        or_(NotificationPreference.announcements_enabled.is_(True), NotificationPreference.id.is_(None)),
    )
    if announcement.scope_type == AnnouncementScope.COURSE:
        recipients = recipients.join(Enrollment, Enrollment.student_id == User.id).filter(
            Enrollment.course_id == announcement.scope_id, Enrollment.status == EnrollmentStatus.ACTIVE,
        )
    elif announcement.scope_type == AnnouncementScope.DEPARTMENT:
        recipients = recipients.filter(User.department_id == announcement.scope_id)
    elif announcement.scope_type == AnnouncementScope.INDIVIDUAL:
        recipients = recipients.filter(User.id == announcement.scope_id)
    priority = (
        NotificationPriority.URGENT if announcement.priority == AnnouncementPriority.CRITICAL
        else NotificationPriority.HIGH if announcement.priority == AnnouncementPriority.IMPORTANT
        else NotificationPriority.NORMAL
    )
    # Do not issue one preference query and transaction for every student.
    recipient_ids = [row[0] for row in recipients.distinct().all()]
    for start in range(0, len(recipient_ids), 500):
        db.execute(insert(Notification), [{
            "recipient_id": recipient_id, "category": NotificationCategory.ANNOUNCEMENT,
            "priority": priority, "status": NotificationStatus.UNREAD,
            "title": f"Announcement: {announcement.title}"[:200],
            "message": announcement.content[:200],
            "source_type": "ANNOUNCEMENT", "source_id": announcement.id,
            "action_url": "/", "dedup_key": f"announcement_{announcement.id}_{recipient_id}",
        } for recipient_id in recipient_ids[start:start + 500]])


def list_announcements_for_user(
    db: Session,
    user: User,
    limit: int = 50,
    offset: int = 0,
) -> List[AnnouncementResponse]:
    """Retrieve all published announcements matching user's academic scope."""
    course_ids: List[str] = []
    if user.role.name == "STUDENT":
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()
        course_ids = [e.course_id for e in enrollments]
    elif user.role.name == "FACULTY":
        ci = db.query(CourseInstructor).filter(CourseInstructor.faculty_id == user.id).all()
        course_ids = [c.course_id for c in ci]

    # Build scope filter
    scope_filters = [Announcement.scope_type == AnnouncementScope.INSTITUTION]
    if user.department_id:
        scope_filters.append(
            and_(
                Announcement.scope_type == AnnouncementScope.DEPARTMENT,
                Announcement.scope_id == user.department_id,
            )
        )
    if course_ids:
        scope_filters.append(
            and_(
                Announcement.scope_type == AnnouncementScope.COURSE,
                Announcement.scope_id.in_(course_ids),
            )
        )

    now = datetime.now(timezone.utc)
    announcements = db.query(Announcement).filter(
        Announcement.status == AnnouncementStatus.PUBLISHED,
        Announcement.publish_at <= now,
        or_(Announcement.expires_at == None, Announcement.expires_at > now),
        or_(*scope_filters),
    ).order_by(Announcement.created_at.desc()).offset(offset).limit(limit).all()

    # Format responses with acknowledgement status
    responses: List[AnnouncementResponse] = []
    for a in announcements:
        ack = db.query(AnnouncementAcknowledgement).filter(
            AnnouncementAcknowledgement.announcement_id == a.id,
            AnnouncementAcknowledgement.user_id == user.id,
        ).first()

        scope_name = "Institution-Wide"
        if a.scope_type == AnnouncementScope.COURSE and a.scope_id:
            c = db.query(Course).filter(Course.id == a.scope_id).first()
            if c:
                scope_name = f"{c.course_code} - {c.name}"
        elif a.scope_type == AnnouncementScope.DEPARTMENT and a.scope_id:
            d = db.query(Department).filter(Department.id == a.scope_id).first()
            if d:
                scope_name = d.name

        total_acks = db.query(func.count(AnnouncementAcknowledgement.id)).filter(
            AnnouncementAcknowledgement.announcement_id == a.id,
        ).scalar() or 0

        responses.append(
            AnnouncementResponse(
                id=a.id,
                title=a.title,
                content=a.content,
                author_id=a.author_id,
                author_name=f"{a.author.first_name} {a.author.last_name}",
                author_role=a.author.role.name,
                scope_type=a.scope_type,
                scope_id=a.scope_id,
                scope_name=scope_name,
                priority=a.priority,
                status=a.status,
                is_acknowledgement_required=a.is_acknowledgement_required,
                is_acknowledged=ack is not None,
                total_acknowledgements=total_acks,
                publish_at=a.publish_at,
                expires_at=a.expires_at,
                created_at=a.created_at,
            )
        )

    return responses


def get_announcement_by_id(
    db: Session,
    announcement_id: str,
    user: User,
) -> AnnouncementResponse:
    """Retrieve single announcement with scope check."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")

    ack = db.query(AnnouncementAcknowledgement).filter(
        AnnouncementAcknowledgement.announcement_id == announcement.id,
        AnnouncementAcknowledgement.user_id == user.id,
    ).first()

    scope_name = "Institution-Wide"
    if announcement.scope_type == AnnouncementScope.COURSE and announcement.scope_id:
        c = db.query(Course).filter(Course.id == announcement.scope_id).first()
        if c:
            scope_name = f"{c.course_code} - {c.name}"
    elif announcement.scope_type == AnnouncementScope.DEPARTMENT and announcement.scope_id:
        d = db.query(Department).filter(Department.id == announcement.scope_id).first()
        if d:
            scope_name = d.name

    total_acks = db.query(func.count(AnnouncementAcknowledgement.id)).filter(
        AnnouncementAcknowledgement.announcement_id == announcement.id,
    ).scalar() or 0

    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        author_id=announcement.author_id,
        author_name=f"{announcement.author.first_name} {announcement.author.last_name}",
        author_role=announcement.author.role.name,
        scope_type=announcement.scope_type,
        scope_id=announcement.scope_id,
        scope_name=scope_name,
        priority=announcement.priority,
        status=announcement.status,
        is_acknowledgement_required=announcement.is_acknowledgement_required,
        is_acknowledged=ack is not None,
        total_acknowledgements=total_acks,
        publish_at=announcement.publish_at,
        expires_at=announcement.expires_at,
        created_at=announcement.created_at,
    )


def update_announcement(
    db: Session,
    announcement_id: str,
    user: User,
    payload: AnnouncementUpdate,
) -> AnnouncementResponse:
    """Edit announcement (author or admin only)."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")

    if announcement.author_id != user.id and user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own announcements.")

    if payload.title is not None:
        announcement.title = payload.title.strip()
    if payload.content is not None:
        announcement.content = payload.content.strip()
    if payload.priority is not None:
        announcement.priority = payload.priority
    if payload.is_acknowledgement_required is not None:
        announcement.is_acknowledgement_required = payload.is_acknowledgement_required
    if payload.expires_at is not None:
        announcement.expires_at = payload.expires_at

    db.commit()
    db.refresh(announcement)
    return get_announcement_by_id(db, announcement.id, user)


def archive_announcement(
    db: Session,
    announcement_id: str,
    user: User,
) -> AnnouncementResponse:
    """Archive an announcement (author or admin only)."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")

    if announcement.author_id != user.id and user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only archive your own announcements.")

    announcement.status = AnnouncementStatus.ARCHIVED
    db.commit()
    db.refresh(announcement)
    return get_announcement_by_id(db, announcement.id, user)


def acknowledge_announcement(
    db: Session,
    announcement_id: str,
    user_id: str,
) -> AnnouncementAcknowledgement:
    """Record user acknowledgement for a mandatory announcement."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")

    existing_ack = db.query(AnnouncementAcknowledgement).filter(
        AnnouncementAcknowledgement.announcement_id == announcement_id,
        AnnouncementAcknowledgement.user_id == user_id,
    ).first()
    if existing_ack:
        return existing_ack

    ack = AnnouncementAcknowledgement(
        announcement_id=announcement_id,
        user_id=user_id,
        acknowledged_at=datetime.now(timezone.utc),
    )
    db.add(ack)
    db.commit()
    db.refresh(ack)
    return ack
