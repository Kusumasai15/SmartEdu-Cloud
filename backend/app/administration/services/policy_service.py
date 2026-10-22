"""Service for Institutional Policy Management, Versioning, and History."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.administration import (
    SystemPolicy,
    PolicyVersionHistory,
    PolicyCategory,
    PolicyStatus,
    AdminActionType,
)
from app.administration.schemas import (
    SystemPolicyItem,
    SystemPolicyUpdate,
    PolicyVersionItem,
)
from app.administration.services.audit_service import log_admin_audit


def get_or_create_default_policies(db: Session) -> List[SystemPolicy]:
    """Ensure standard default institutional policies exist."""
    defaults = [
        {
            "key": "POLICY_ATTENDANCE_MINIMUM",
            "title": "Minimum Academic Attendance Requirement",
            "description": "Sets the mandatory attendance percentage required for examination eligibility.",
            "category": PolicyCategory.ATTENDANCE,
            "policy_value": {"minimum_attendance_pct": 75.0, "shortage_warning_pct": 80.0, "recovery_allowed": True},
        },
        {
            "key": "POLICY_EXAM_PROCTORING",
            "title": "Online Examination Proctoring Standard",
            "description": "Configures automated face detection, browser lock, and anomaly sensitivity.",
            "category": PolicyCategory.EXAMINATION,
            "policy_value": {"proctoring_enabled": True, "strict_mode": True, "max_tab_switches": 3},
        },
        {
            "key": "POLICY_AI_GOVERNANCE",
            "title": "AI Feature Safety & Human Oversight Policy",
            "description": "Mandates human-in-the-loop review for all AI-assisted drafting and predictions.",
            "category": PolicyCategory.AI_GOVERNANCE,
            "policy_value": {"ai_drafting_enabled": True, "ai_insights_enabled": True, "human_review_mandatory": True},
        },
    ]

    policies = []
    for d in defaults:
        existing = db.query(SystemPolicy).filter(SystemPolicy.key == d["key"]).first()
        if not existing:
            p = SystemPolicy(
                key=d["key"],
                title=d["title"],
                description=d["description"],
                category=d["category"],
                current_version="1.0.0",
                policy_value=d["policy_value"],
                status=PolicyStatus.ACTIVE,
                effective_from=datetime.now(timezone.utc),
            )
            db.add(p)
            db.commit()
            db.refresh(p)
            policies.append(p)
        else:
            policies.append(existing)
    return policies


def list_policies(db: Session, category: Optional[PolicyCategory] = None) -> List[SystemPolicyItem]:
    """List institutional system policies with version history."""
    get_or_create_default_policies(db)
    query = db.query(SystemPolicy)
    if category:
        query = query.filter(SystemPolicy.category == category)

    policies = query.order_by(SystemPolicy.category, SystemPolicy.key).all()
    results = []
    for p in policies:
        v_items = [
            PolicyVersionItem(
                id=v.id,
                version=v.version,
                policy_value=v.policy_value,
                change_reason=v.change_reason,
                changed_by_name=v.author.full_name if v.author else "System Admin",
                created_at=v.created_at,
            )
            for v in p.versions
        ]
        results.append(
            SystemPolicyItem(
                id=p.id,
                key=p.key,
                title=p.title,
                description=p.description,
                category=p.category,
                current_version=p.current_version,
                policy_value=p.policy_value,
                status=p.status,
                effective_from=p.effective_from,
                versions=v_items,
            )
        )
    return results


def update_policy(
    db: Session,
    policy_key: str,
    payload: SystemPolicyUpdate,
    admin_user: User,
) -> SystemPolicyItem:
    """Update institutional policy with version snapshotting and audit logging."""
    p = db.query(SystemPolicy).filter(SystemPolicy.key == policy_key).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")

    # 1. Snapshot previous version into PolicyVersionHistory
    prev_version = p.current_version
    history_entry = PolicyVersionHistory(
        policy_id=p.id,
        version=prev_version,
        policy_value=p.policy_value,
        change_reason=payload.change_reason,
        changed_by=admin_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(history_entry)

    # 2. Increment version number
    try:
        parts = [int(x) for x in prev_version.split(".")]
        parts[-1] += 1
        new_version = ".".join(str(x) for x in parts)
    except Exception:
        new_version = f"{prev_version}.1"

    p.current_version = new_version
    p.policy_value = payload.policy_value
    if payload.title:
        p.title = payload.title
    if payload.description:
        p.description = payload.description
    p.approved_by = admin_user.id

    db.commit()
    db.refresh(p)

    log_admin_audit(
        db,
        actor_user_id=admin_user.id,
        actor_role=admin_user.role.name,
        action=AdminActionType.POLICY_UPDATED,
        resource_type="POLICY",
        resource_id=p.id,
        scope=f"CATEGORY:{p.category}",
        details={
            "key": p.key,
            "previous_version": prev_version,
            "new_version": new_version,
            "change_reason": payload.change_reason,
        },
    )

    return list_policies(db, p.category)[0]
