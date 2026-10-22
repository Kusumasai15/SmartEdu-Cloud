"""Institutional Governance & Approval Requests Router."""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.administration.schemas import GovernanceSummary, GovernanceRequestItem
from app.administration.services import governance_service

router = APIRouter(prefix="/admin/governance", tags=["Institutional Governance"])


@router.get("/summary", response_model=GovernanceSummary)
def get_governance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Retrieve summarized counts of actionable requests across academic workflows."""
    return governance_service.get_governance_summary(db)


@router.get("/requests", response_model=List[GovernanceRequestItem])
def get_governance_requests(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """List cross-phase governance requests (Result Corrections, Leaves, Approvals)."""
    return governance_service.list_governance_requests(db, limit=limit)
