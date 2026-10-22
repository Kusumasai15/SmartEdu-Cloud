"""REST API Router for Academic Messaging & Conversations."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.communication.schemas import (
    ConversationCreate,
    ConversationResponse,
    DirectMessageCreate,
    DirectMessageResponse,
)
from app.communication.services import messaging_service

router = APIRouter(prefix="/messages", tags=["Academic Messaging"])


@router.get("/conversations", response_model=List[ConversationResponse])
def get_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all authorized academic conversations for current user."""
    return messaging_service.list_user_conversations(db, current_user)


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def start_or_get_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initiate an academic conversation with an authorized counterpart."""
    return messaging_service.create_or_get_direct_conversation(db, current_user, payload)


@router.get("/conversations/{conversation_id}/messages", response_model=List[DirectMessageResponse])
def get_messages_in_conversation(
    conversation_id: str,
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve message history for a conversation thread and mark as read."""
    return messaging_service.get_conversation_messages(
        db,
        conversation_id,
        current_user,
        limit=limit,
        offset=offset,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=DirectMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message_to_conversation(
    conversation_id: str,
    payload: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a direct message within an authorized academic conversation."""
    return messaging_service.send_direct_message(db, conversation_id, current_user, payload)


@router.get("/search", response_model=List[DirectMessageResponse])
def search_messages_endpoint(
    q: str = Query(..., min_length=1, description="Search query term"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search messages across all conversations the user is a participant of."""
    return messaging_service.search_user_messages(db, current_user, q, limit=limit)


@router.patch("/{message_id}", response_model=DirectMessageResponse)
def edit_direct_message(
    message_id: str,
    body: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit own message."""
    return messaging_service.edit_message(db, message_id, current_user, body)


@router.delete("/{message_id}", response_model=DirectMessageResponse)
def delete_direct_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete own message."""
    return messaging_service.soft_delete_message(db, message_id, current_user)
