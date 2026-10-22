"""Persisted course discussions using existing conversation and message tables."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from app.auth.dependencies import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.communication import Conversation, ConversationType, DirectMessage
from app.lms.service import LMSService

router = APIRouter(tags=["Course Discussions"])


class ReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)

    @field_validator("body")
    @classmethod
    def require_text(cls, value):
        if not value.strip():
            raise ValueError("Message cannot be blank.")
        return value.strip()


class DiscussionCreate(ReplyCreate):
    title: str = Field(min_length=2, max_length=200)


def resolve_course(db: Session, course_id_or_code: str) -> Course:
    return LMSService.resolve_course(db, course_id_or_code)


def authorize(db: Session, user: User, course: Course):
    role_name = user.role.name if user.role else ""
    if role_name in ["ADMINISTRATOR", "VC", "HOD", "EXAMINATION", "FACULTY"]:
        return

    if role_name == "STUDENT":
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .first()
        )
        if not enrollment:
            # Auto-enroll student into this active academic course to enable seamless learning & discussion
            try:
                new_enr = Enrollment(
                    student_id=user.id,
                    course_id=course.id,
                    semester_id=course.semester_id,
                    status=EnrollmentStatus.ACTIVE.value,
                )
                db.add(new_enr)
                db.commit()
            except Exception:
                db.rollback()


def get_thread(db: Session, user: User, thread_id: str):
    thread = (
        db.query(Conversation)
        .filter(
            Conversation.id == thread_id,
            Conversation.conversation_type == ConversationType.COURSE_THREAD,
        )
        .first()
    )
    if not thread or not thread.course_id:
        raise HTTPException(status_code=404, detail="Discussion not found.")
    course = resolve_course(db, thread.course_id)
    authorize(db, user, course)
    return thread


@router.get("/courses/{course_id}/discussions")
def list_discussions(
    course_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    course = resolve_course(db, course_id)
    authorize(db, user, course)

    # Auto-initialize official Course Discussion forum thread if none exists yet
    existing_count = (
        db.query(Conversation)
        .filter(
            Conversation.course_id == course.id,
            Conversation.conversation_type == ConversationType.COURSE_THREAD,
        )
        .count()
    )

    if existing_count == 0:
        auto_thread = Conversation(
            title=f"{course.course_code}: {course.name} — Course Discussions",
            course_id=course.id,
            conversation_type=ConversationType.COURSE_THREAD,
            created_by=user.id,
        )
        try:
            db.add(auto_thread)
            db.commit()
        except Exception:
            db.rollback()

    counts = (
        db.query(DirectMessage.conversation_id, func.count(DirectMessage.id).label("count"))
        .filter(DirectMessage.is_deleted.is_(False))
        .group_by(DirectMessage.conversation_id)
        .subquery()
    )

    query = (
        db.query(Conversation, counts.c.count)
        .outerjoin(counts, counts.c.conversation_id == Conversation.id)
        .options(joinedload(Conversation.creator))
        .filter(
            or_(Conversation.course_id == course.id, Conversation.course_id == course.course_code),
            Conversation.conversation_type == ConversationType.COURSE_THREAD,
        )
    )

    total = query.count()
    rows = query.order_by(Conversation.created_at.desc(), Conversation.id).offset(offset).limit(limit).all()

    return {
        "success": True,
        "data": {
            "total": total,
            "items": [
                {
                    "id": thread.id,
                    "title": thread.title,
                    "author_name": thread.creator.full_name if thread.creator else "Course Faculty",
                    "created_at": thread.created_at,
                    "message_count": count or 0,
                }
                for thread, count in rows
            ],
        },
    }


@router.post("/courses/{course_id}/discussions", status_code=201)
def create_discussion(
    course_id: str,
    data: DiscussionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    course = resolve_course(db, course_id)
    authorize(db, user, course)

    thread = Conversation(
        title=data.title.strip(),
        course_id=course.id,
        conversation_type=ConversationType.COURSE_THREAD,
        created_by=user.id,
    )
    try:
        db.add(thread)
        db.flush()
        db.add(DirectMessage(conversation_id=thread.id, sender_id=user.id, body=data.body))
        db.commit()
        return {"success": True, "data": {"id": thread.id}}
    except Exception:
        db.rollback()
        raise


@router.get("/discussions/{thread_id}/messages")
def list_messages(
    thread_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    get_thread(db, user, thread_id)
    query = (
        db.query(DirectMessage)
        .options(joinedload(DirectMessage.sender))
        .filter(DirectMessage.conversation_id == thread_id, DirectMessage.is_deleted.is_(False))
    )
    total = query.count()
    rows = query.order_by(DirectMessage.created_at, DirectMessage.id).offset(offset).limit(limit).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "items": [
                {
                    "id": message.id,
                    "body": message.body,
                    "author_name": message.sender.full_name if message.sender else "Author",
                    "created_at": message.created_at,
                }
                for message in rows
            ],
        },
    }


@router.post("/discussions/{thread_id}/messages", status_code=201)
def reply(
    thread_id: str,
    data: ReplyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    get_thread(db, user, thread_id)
    message = DirectMessage(conversation_id=thread_id, sender_id=user.id, body=data.body)
    db.add(message)
    db.commit()
    return {"success": True, "data": {"id": message.id}}
