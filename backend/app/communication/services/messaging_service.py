"""Service layer for Academic Messaging, Relationship Scoping, and Conversation Management."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.communication import (
    Conversation,
    ConversationParticipant,
    DirectMessage,
    ConversationType,
    NotificationCategory,
    NotificationPriority,
)
from app.communication.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationParticipantResponse,
    DirectMessageCreate,
    DirectMessageResponse,
    NotificationCreate,
)
from app.communication.services.notification_service import send_notification


def validate_academic_relationship(
    db: Session,
    user_a: User,
    user_b: User,
    course_id: Optional[str] = None,
) -> bool:
    """Ensure messaging between two users is grounded in a valid university relationship."""
    # 1. Administrator can communicate with anyone
    if user_a.role.name == "ADMINISTRATOR" or user_b.role.name == "ADMINISTRATOR":
        return True

    # 2. VC can communicate with HOD and Faculty
    if user_a.role.name == "VC" or user_b.role.name == "VC":
        return True

    # 3. HOD can communicate with departmental Faculty and Students
    if user_a.role.name == "HOD":
        return user_b.department_id == user_a.department_id
    if user_b.role.name == "HOD":
        return user_a.department_id == user_b.department_id

    # 4. Student <-> Faculty (Student enrolled in a course taught by faculty)
    if (user_a.role.name == "STUDENT" and user_b.role.name == "FACULTY") or (
        user_a.role.name == "FACULTY" and user_b.role.name == "STUDENT"
    ):
        student_id = user_a.id if user_a.role.name == "STUDENT" else user_b.id
        faculty_id = user_a.id if user_a.role.name == "FACULTY" else user_b.id

        # Check course overlap
        student_courses = [
            e.course_id
            for e in db.query(Enrollment).filter(
                Enrollment.student_id == student_id,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            ).all()
        ]

        if not student_courses:
            return False

        shared_course = db.query(CourseInstructor).filter(
            CourseInstructor.faculty_id == faculty_id,
            CourseInstructor.course_id.in_(student_courses),
        ).first()

        return shared_course is not None

    # 5. Faculty <-> Faculty (Same department)
    if user_a.role.name == "FACULTY" and user_b.role.name == "FACULTY":
        return user_a.department_id == user_b.department_id

    return False


def create_or_get_direct_conversation(
    db: Session,
    current_user: User,
    payload: ConversationCreate,
) -> ConversationResponse:
    """Create a new academic conversation or retrieve an existing thread."""
    recipient = db.query(User).filter(User.id == payload.participant_user_id).first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant user not found.")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot create conversation with yourself.")

    # Validate academic relationship
    is_authorized = validate_academic_relationship(db, current_user, recipient, payload.course_id)
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not share an authorized academic relationship with this user.",
        )

    # Check for existing 1-on-1 direct conversation
    existing_conv_id = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id.in_([current_user.id, recipient.id]))
        .group_by(ConversationParticipant.conversation_id)
        .having(func.count(ConversationParticipant.user_id) == 2)
        .first()
    )

    if existing_conv_id:
        conv = db.query(Conversation).filter(Conversation.id == existing_conv_id[0]).first()
    else:
        conv = Conversation(
            title=payload.title or f"{current_user.first_name} & {recipient.first_name}",
            conversation_type=ConversationType.DIRECT,
            course_id=payload.course_id,
            created_by=current_user.id,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        # Add participants
        p1 = ConversationParticipant(conversation_id=conv.id, user_id=current_user.id)
        p2 = ConversationParticipant(conversation_id=conv.id, user_id=recipient.id)
        db.add_all([p1, p2])
        db.commit()

    # Send initial message if provided
    if payload.initial_message:
        msg = DirectMessage(
            conversation_id=conv.id,
            sender_id=current_user.id,
            body=payload.initial_message,
        )
        db.add(msg)
        db.commit()

        # Notify recipient
        send_notification(
            db,
            NotificationCreate(
                recipient_id=recipient.id,
                category=NotificationCategory.WORKFLOW,
                priority=NotificationPriority.NORMAL,
                title=f"New Message from {current_user.first_name} {current_user.last_name}",
                message=payload.initial_message[:150],
                source_type="MESSAGE",
                source_id=conv.id,
                action_url=f"/messages/{conv.id}",
                dedup_key=f"msg_{conv.id}_{msg.id}",
            ),
        )

    return _format_conversation_response(db, conv, current_user.id)


def list_user_conversations(
    db: Session,
    current_user: User,
) -> List[ConversationResponse]:
    """Retrieve all conversations for the authenticated user."""
    conv_ids = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == current_user.id)
        .all()
    )
    if not conv_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_([c[0] for c in conv_ids]))
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    return [_format_conversation_response(db, c, current_user.id) for c in conversations]


def send_direct_message(
    db: Session,
    conversation_id: str,
    sender: User,
    payload: DirectMessageCreate,
) -> DirectMessageResponse:
    """Post a message to an authorized conversation thread."""
    # Membership check
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == sender.id,
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation.",
        )

    msg = DirectMessage(
        conversation_id=conversation_id,
        sender_id=sender.id,
        body=payload.body.strip(),
    )
    db.add(msg)

    # Update conversation updated_at and participant last_read_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.updated_at = datetime.now(timezone.utc)
    participant.last_read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)

    # Notify other participants
    other_parts = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != sender.id,
    ).all()

    for p in other_parts:
        send_notification(
            db,
            NotificationCreate(
                recipient_id=p.user_id,
                category=NotificationCategory.WORKFLOW,
                priority=NotificationPriority.NORMAL,
                title=f"Message from {sender.first_name} {sender.last_name}",
                message=msg.body[:150],
                source_type="MESSAGE",
                source_id=conversation_id,
                action_url=f"/messages/{conversation_id}",
                dedup_key=f"msg_{msg.id}_{p.user_id}",
            ),
        )

    return DirectMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_name=f"{sender.first_name} {sender.last_name}",
        sender_role=sender.role.name,
        body=msg.body,
        is_edited=msg.is_edited,
        is_deleted=msg.is_deleted,
        created_at=msg.created_at,
    )


def get_conversation_messages(
    db: Session,
    conversation_id: str,
    current_user: User,
    limit: int = 100,
    offset: int = 0,
) -> List[DirectMessageResponse]:
    """Retrieve message history for a conversation and mark thread as read."""
    # Membership check
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id,
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view messages in this conversation.",
        )

    # Update last_read_at
    participant.last_read_at = datetime.now(timezone.utc)
    db.commit()

    messages = (
        db.query(DirectMessage)
        .filter(DirectMessage.conversation_id == conversation_id)
        .order_by(DirectMessage.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    responses = []
    for m in messages:
        sender_name = f"{m.sender.first_name} {m.sender.last_name}" if m.sender else "System"
        sender_role = m.sender.role.name if m.sender and m.sender.role else "USER"
        body_text = "[Message deleted]" if m.is_deleted else m.body
        responses.append(
            DirectMessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                sender_name=sender_name,
                sender_role=sender_role,
                body=body_text,
                is_edited=m.is_edited,
                is_deleted=m.is_deleted,
                created_at=m.created_at,
            )
        )
    return responses


def edit_message(
    db: Session,
    message_id: str,
    current_user: User,
    new_body: str,
) -> DirectMessageResponse:
    """Edit own message within a conversation."""
    msg = db.query(DirectMessage).filter(DirectMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own messages.")

    msg.body = new_body.strip()
    msg.is_edited = True
    msg.edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    return DirectMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        sender_role=current_user.role.name,
        body=msg.body,
        is_edited=msg.is_edited,
        is_deleted=msg.is_deleted,
        created_at=msg.created_at,
    )


def soft_delete_message(
    db: Session,
    message_id: str,
    current_user: User,
) -> DirectMessageResponse:
    """Soft-delete own message."""
    msg = db.query(DirectMessage).filter(DirectMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    if msg.sender_id != current_user.id and current_user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own messages.")

    msg.is_deleted = True
    msg.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    return DirectMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_name=f"{msg.sender.first_name} {msg.sender.last_name}",
        sender_role=msg.sender.role.name,
        body="[Message deleted]",
        is_edited=msg.is_edited,
        is_deleted=True,
        created_at=msg.created_at,
    )


def _format_conversation_response(db: Session, conv: Conversation, current_user_id: str) -> ConversationResponse:
    """Format full conversation DTO with unread counts and participant metadata."""
    # Participants
    part_dtos = []
    my_last_read = datetime.min.replace(tzinfo=timezone.utc)
    for p in conv.participants:
        u = p.user
        if u.id == current_user_id:
            my_last_read = p.last_read_at
        part_dtos.append(
            ConversationParticipantResponse(
                user_id=u.id,
                user_name=f"{u.first_name} {u.last_name}",
                user_email=u.email,
                user_role=u.role.name if u.role else "USER",
                last_read_at=p.last_read_at,
            )
        )

    # Last message
    last_msg = (
        db.query(DirectMessage)
        .filter(DirectMessage.conversation_id == conv.id)
        .order_by(DirectMessage.created_at.desc())
        .first()
    )
    last_dto = None
    if last_msg:
        s_name = f"{last_msg.sender.first_name} {last_msg.sender.last_name}" if last_msg.sender else "User"
        s_role = last_msg.sender.role.name if last_msg.sender and last_msg.sender.role else "USER"
        last_dto = DirectMessageResponse(
            id=last_msg.id,
            conversation_id=last_msg.conversation_id,
            sender_id=last_msg.sender_id,
            sender_name=s_name,
            sender_role=s_role,
            body="[Message deleted]" if last_msg.is_deleted else last_msg.body,
            is_edited=last_msg.is_edited,
            is_deleted=last_msg.is_deleted,
            created_at=last_msg.created_at,
        )

    # Unread count
    unread_cnt = db.query(func.count(DirectMessage.id)).filter(
        DirectMessage.conversation_id == conv.id,
        DirectMessage.sender_id != current_user_id,
        DirectMessage.is_deleted == False,
        DirectMessage.created_at > my_last_read,
    ).scalar() or 0

    course_name = f"{conv.course.course_code} - {conv.course.name}" if conv.course else None

    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        conversation_type=conv.conversation_type,
        course_id=conv.course_id,
        course_name=course_name,
        created_by=conv.created_by,
        participants=part_dtos,
        last_message=last_dto,
        unread_messages_count=unread_cnt,
        updated_at=conv.updated_at,
    )


def search_user_messages(
    db: Session,
    current_user: User,
    query_str: str,
    limit: int = 50,
) -> List[DirectMessageResponse]:
    """Search messages across all conversations the authenticated user is a participant of."""
    if not query_str.strip():
        return []

    # Get all conversation IDs where current_user is a participant
    my_conv_ids = [
        cp.conversation_id
        for cp in db.query(ConversationParticipant).filter(ConversationParticipant.user_id == current_user.id).all()
    ]

    if not my_conv_ids:
        return []

    messages = (
        db.query(DirectMessage)
        .filter(
            DirectMessage.conversation_id.in_(my_conv_ids),
            DirectMessage.is_deleted == False,
            DirectMessage.body.ilike(f"%{query_str.strip()}%"),
        )
        .order_by(DirectMessage.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        DirectMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=f"{m.sender.first_name} {m.sender.last_name}" if m.sender else "User",
            sender_role=m.sender.role.name if m.sender and m.sender.role else "USER",
            body=m.body,
            is_edited=m.is_edited,
            is_deleted=m.is_deleted,
            created_at=m.created_at,
        )
        for m in messages
    ]

