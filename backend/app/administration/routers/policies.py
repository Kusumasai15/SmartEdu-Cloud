"""Institutional System Policies Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.models.administration import PolicyCategory
from app.administration.schemas import SystemPolicyItem, SystemPolicyUpdate
from app.administration.services import policy_service

router = APIRouter(prefix="/admin/policies", tags=["System Policies"])


@router.get("", response_model=List[SystemPolicyItem])
def get_system_policies(
    category: Optional[PolicyCategory] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Retrieve institutional policies with full version histories."""
    return policy_service.list_policies(db, category=category)


@router.patch("/{policy_key}", response_model=SystemPolicyItem)
def update_system_policy(
    policy_key: str,
    payload: SystemPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Update institutional policy with version snapshotting and audit trail."""
    return policy_service.update_policy(db, policy_key, payload, current_user)
