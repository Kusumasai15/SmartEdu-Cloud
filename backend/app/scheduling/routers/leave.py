"""Router for Student Leave Applications and Approval Workflow."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.scheduling import LeaveStatus
from app.scheduling.schemas import (
    StudentLeaveCreate,
    StudentLeaveReviewRequest,
    StudentLeaveResponse,
)
from app.scheduling.services import leave_service

router = APIRouter(prefix="/leave", tags=["Leave Management"])


@router.get("", response_model=List[StudentLeaveResponse])
def get_leave_requests(
    status_filter: Optional[LeaveStatus] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve student leave requests according to caller role scope."""
    return leave_service.list_leave_requests(
        db,
        current_user=current_user,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=StudentLeaveResponse, status_code=status.HTTP_201_CREATED)
def submit_leave_request(
    payload: StudentLeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a formal student leave request."""
    leave = leave_service.submit_leave_request(db, current_user, payload)
    s_name = f"{current_user.first_name} {current_user.last_name}"
    d_name = current_user.department.name if current_user.department else "General"

    return StudentLeaveResponse(
        id=leave.id,
        student_id=leave.student_id,
        student_name=s_name,
        student_email=current_user.email,
        department_name=d_name,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        reviewer_id=None,
        reviewer_name=None,
        review_notes=None,
        reviewed_at=None,
        created_at=leave.created_at,
    )


@router.patch("/{id}/review", response_model=StudentLeaveResponse)
def review_leave_request(
    id: str,
    payload: StudentLeaveReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a student leave application with attendance synchronization."""
    return leave_service.review_leave_request(db, id, current_user, payload)
