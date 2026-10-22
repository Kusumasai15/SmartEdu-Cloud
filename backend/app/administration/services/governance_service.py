"""Service for Aggregating Institutional Governance & Approval Workflows."""

from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.result import ResultCorrectionRequest, CorrectionRequestStatus, CourseResult, ResultStatus
from app.models.scheduling import StudentLeaveRequest, LeaveStatus, ScheduleChangeLog
from app.administration.schemas import GovernanceSummary, GovernanceRequestItem


def get_governance_summary(db: Session) -> GovernanceSummary:
    """Calculate counts of pending governance requests across all modules."""
    pending_corrections = db.query(func.count(ResultCorrectionRequest.id)).filter(
        ResultCorrectionRequest.status == CorrectionRequestStatus.PENDING
    ).scalar() or 0

    pending_leaves = db.query(func.count(StudentLeaveRequest.id)).filter(
        StudentLeaveRequest.status == LeaveStatus.SUBMITTED
    ).scalar() or 0

    pending_results = db.query(func.count(CourseResult.id)).filter(
        CourseResult.status == ResultStatus.SUBMITTED
    ).scalar() or 0

    schedule_changes = db.query(func.count(ScheduleChangeLog.id)).scalar() or 0

    total = pending_corrections + pending_leaves + pending_results

    return GovernanceSummary(
        pending_result_approvals=pending_results,
        pending_result_corrections=pending_corrections,
        pending_leave_requests=pending_leaves,
        recent_schedule_changes=schedule_changes,
        total_actionable_requests=total,
    )


def list_governance_requests(db: Session, limit: int = 50) -> List[GovernanceRequestItem]:
    """Retrieve combined list of actionable governance requests across the university."""
    items: List[GovernanceRequestItem] = []

    # 1. Result Corrections
    corrections = (
        db.query(ResultCorrectionRequest)
        .order_by(desc(ResultCorrectionRequest.created_at))
        .limit(limit)
        .all()
    )
    for rc in corrections:
        inst_name = rc.requester.full_name if rc.requester else "Faculty"
        items.append(
            GovernanceRequestItem(
                id=rc.id,
                module="RESULTS",
                request_type="Grade Correction Request",
                requester_name=inst_name,
                requester_role="FACULTY",
                department_name=rc.requester.department.name if rc.requester and rc.requester.department else None,
                submitted_at=rc.created_at,
                status=rc.status.value,
                details=f"Correction requested for {rc.student.full_name if rc.student else 'Student'}: {rc.reason}",
            )
        )

    # 2. Student Leaves
    leaves = (
        db.query(StudentLeaveRequest)
        .order_by(desc(StudentLeaveRequest.created_at))
        .limit(limit)
        .all()
    )
    for lv in leaves:
        items.append(
            GovernanceRequestItem(
                id=lv.id,
                module="LEAVE",
                request_type=f"Student Leave ({lv.leave_type.value})",
                requester_name=lv.student.full_name if lv.student else "Student",
                requester_role="STUDENT",
                department_name=lv.student.department.name if lv.student and lv.student.department else None,
                submitted_at=lv.created_at,
                status=lv.status.value,
                details=f"Period: {lv.start_date} to {lv.end_date} - {lv.reason}",
            )
        )

    # Sort combined requests by date desc
    items.sort(key=lambda x: x.submitted_at, reverse=True)
    return items[:limit]
