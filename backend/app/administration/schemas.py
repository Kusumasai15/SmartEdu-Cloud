"""Pydantic v2 Schemas for Administration, Governance, Security & System Control."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.administration import (
    AdminActionType,
    SecurityEventSeverity,
    PolicyCategory,
    PolicyStatus,
)


# -------------------------------------------------------------
# DASHBOARD SCHEMAS
# -------------------------------------------------------------
class AdminDashboardStats(BaseModel):
    total_students: int
    total_faculty: int
    total_hods: int
    total_administrators: int
    total_courses: int
    total_departments: int
    active_academic_year: str
    active_semester_name: str
    active_exams_count: int
    pending_governance_count: int
    failed_logins_count: int
    active_sessions_count: int
    system_health_status: str  # "HEALTHY" | "DEGRADED" | "DOWN"


# -------------------------------------------------------------
# USER ADMINISTRATION SCHEMAS
# -------------------------------------------------------------
class AdminUserItem(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    role_name: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    student_identifier: Optional[str] = None
    faculty_identifier: Optional[str] = None
    class_name: Optional[str] = None
    academic_year: Optional[str] = None
    is_active: bool
    account_status: str  # "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED"
    created_at: datetime
    active_sessions_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminUserStatusUpdate(BaseModel):
    is_active: bool
    status_reason: Optional[str] = None


class AdminUserDetail(AdminUserItem):
    recent_security_events: List[Dict[str, Any]] = []
    recent_audit_actions: List[Dict[str, Any]] = []


# -------------------------------------------------------------
# AUDIT CENTER SCHEMAS
# -------------------------------------------------------------
class AdminAuditEventItem(BaseModel):
    id: str
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: str
    action: AdminActionType
    resource_type: str
    resource_id: Optional[str] = None
    scope: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# SECURITY CENTER SCHEMAS
# -------------------------------------------------------------
class SecurityEventItem(BaseModel):
    id: str
    event_type: str
    severity: SecurityEventSeverity
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActiveSessionItem(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: str
    role_name: str
    created_at: datetime
    expires_at: datetime
    is_revoked: bool


# -------------------------------------------------------------
# POLICY MANAGEMENT SCHEMAS
# -------------------------------------------------------------
class PolicyVersionItem(BaseModel):
    id: str
    version: str
    policy_value: Dict[str, Any]
    change_reason: Optional[str] = None
    changed_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemPolicyItem(BaseModel):
    id: str
    key: str
    title: str
    description: Optional[str] = None
    category: PolicyCategory
    current_version: str
    policy_value: Dict[str, Any]
    status: PolicyStatus
    effective_from: datetime
    versions: List[PolicyVersionItem] = []

    model_config = ConfigDict(from_attributes=True)


class SystemPolicyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    policy_value: Dict[str, Any]
    change_reason: str = Field(..., min_length=3, description="Audit justification for policy revision")


# -------------------------------------------------------------
# GOVERNANCE ENGINE SCHEMAS
# -------------------------------------------------------------
class GovernanceSummary(BaseModel):
    pending_result_approvals: int
    pending_result_corrections: int
    pending_leave_requests: int
    recent_schedule_changes: int
    total_actionable_requests: int


class GovernanceRequestItem(BaseModel):
    id: str
    module: str  # "RESULTS", "LEAVE", "TIMETABLE", "ACADEMIC"
    request_type: str
    requester_name: str
    requester_role: str
    department_name: Optional[str] = None
    submitted_at: datetime
    status: str
    details: str


# -------------------------------------------------------------
# SYSTEM HEALTH & AI MONITORING SCHEMAS
# -------------------------------------------------------------
class ServiceHealthItem(BaseModel):
    service_name: str
    status: str  # "HEALTHY" | "DEGRADED" | "DOWN"
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class SystemHealthResponse(BaseModel):
    overall_status: str
    checked_at: datetime
    services: List[ServiceHealthItem]


class AIAdminStatusResponse(BaseModel):
    is_configured: bool
    model_name: str
    total_draft_requests: int
    total_summaries_generated: int
    total_fallbacks_triggered: int
    total_errors: int
    human_review_enforced: bool = True
    safety_disclaimer: str
