"""Service layer for Student Leave Requests and Attendance Integration."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.scheduling import StudentLeaveRequest, LeaveStatus
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.scheduling.schemas import (
    StudentLeaveCreate,
    StudentLeaveReviewRequest,
    StudentLeaveResponse,
)
from app.communication.services.notification_service import send_notification
from app.communication.schemas import NotificationCreate
from app.models.communication import NotificationCategory, NotificationPriority


def submit_leave_request(
    db: Session,
    current_user: User,
    payload: StudentLeaveCreate,
) -> StudentLeaveRequest:
    """Submit a formal student leave request with date overlap prevention."""
    if payload.start_date > payload.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave start date cannot be after end date.",
        )

    # Overlap validation: check if student has any pending or approved leave during this window
    overlapping = db.query(StudentLeaveRequest).filter(
        StudentLeaveRequest.student_id == current_user.id,
        StudentLeaveRequest.status.in_([LeaveStatus.SUBMITTED, LeaveStatus.UNDER_REVIEW, LeaveStatus.APPROVED]),
        or_(
            and_(
                StudentLeaveRequest.start_date <= payload.end_date,
                StudentLeaveRequest.end_date >= payload.start_date,
            )
        ),
    ).first()
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have a leave request from {overlapping.start_date} to {overlapping.end_date}.",
        )

    req = StudentLeaveRequest(
        student_id=current_user.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status=LeaveStatus.SUBMITTED,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify Department HOD if available
    if current_user.department_id:
        hod_users = db.query(User).filter(
            User.department_id == current_user.department_id,
            User.role.has(name="HOD"),
        ).all()
        for hod in hod_users:
            send_notification(
                db,
                NotificationCreate(
                    recipient_id=hod.id,
                    category=NotificationCategory.WORKFLOW,
                    priority=NotificationPriority.NORMAL,
                    title=f"Leave Request: {current_user.first_name} {current_user.last_name}",
                    message=f"Leave application submitted ({payload.start_date} to {payload.end_date}): {payload.reason[:100]}",
                    source_type="LEAVE",
                    source_id=req.id,
                    action_url="/hod",
                    dedup_key=f"leave_sub_{req.id}_{hod.id}",
                ),
            )

    return req


def list_leave_requests(
    db: Session,
    current_user: User,
    status_filter: Optional[LeaveStatus] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[StudentLeaveResponse]:
    """Retrieve leave requests matching the caller's role scope."""
    query = db.query(StudentLeaveRequest)

    if current_user.role.name == "STUDENT":
        query = query.filter(StudentLeaveRequest.student_id == current_user.id)
    elif current_user.role.name == "HOD":
        if current_user.department_id:
            dept_students = db.query(User.id).filter(User.department_id == current_user.department_id).subquery()
            query = query.filter(StudentLeaveRequest.student_id.in_(dept_students))
    elif current_user.role.name not in ["ADMINISTRATOR", "VC"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view leave applications.")

    if status_filter:
        query = query.filter(StudentLeaveRequest.status == status_filter)

    leaves = query.order_by(StudentLeaveRequest.created_at.desc()).offset(offset).limit(limit).all()

    responses = []
    for l in leaves:
        s_name = f"{l.student.first_name} {l.student.last_name}" if l.student else "Student"
        s_email = l.student.email if l.student else ""
        d_name = l.student.department.name if l.student and l.student.department else "General"
        r_name = f"{l.reviewer.first_name} {l.reviewer.last_name}" if l.reviewer else None

        responses.append(
            StudentLeaveResponse(
                id=l.id,
                student_id=l.student_id,
                student_name=s_name,
                student_email=s_email,
                department_name=d_name,
                leave_type=l.leave_type,
                start_date=l.start_date,
                end_date=l.end_date,
                reason=l.reason,
                status=l.status,
                reviewer_id=l.reviewer_id,
                reviewer_name=r_name,
                review_notes=l.review_notes,
                reviewed_at=l.reviewed_at,
                created_at=l.created_at,
            )
        )
    return responses


def review_leave_request(
    db: Session,
    leave_id: str,
    reviewer: User,
    payload: StudentLeaveReviewRequest,
) -> StudentLeaveResponse:
    """Review, approve, or reject a student leave request with attendance synchronization."""
    if reviewer.role.name not in ["HOD", "ADMINISTRATOR", "FACULTY"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only academic reviewers can process leave applications.",
        )

    leave = db.query(StudentLeaveRequest).filter(StudentLeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found.")

    leave.status = payload.status
    leave.reviewer_id = reviewer.id
    leave.review_notes = payload.review_notes
    leave.reviewed_at = datetime.now(timezone.utc)

    # Attendance Integration: If approved, mark overlapping attendance sessions as EXCUSED
    if payload.status == LeaveStatus.APPROVED:
        # Find attendance sessions in the leave date range
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.session_date >= leave.start_date,
            AttendanceSession.session_date <= leave.end_date,
        ).all()

        session_ids = [s.id for s in sessions]
        if session_ids:
            records = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id.in_(session_ids),
                AttendanceRecord.student_id == leave.student_id,
                AttendanceRecord.status == AttendanceStatus.ABSENT,
            ).all()

            for rec in records:
                rec.status = AttendanceStatus.EXCUSED
                rec.remarks = f"Excused via approved leave ({leave.leave_type.value})"

    db.commit()
    db.refresh(leave)

    # Notify student
    send_notification(
        db,
        NotificationCreate(
            recipient_id=leave.student_id,
            category=NotificationCategory.WORKFLOW,
            priority=NotificationPriority.NORMAL,
            title=f"Leave Request {payload.status.value}",
            message=f"Your leave request for {leave.start_date} to {leave.end_date} was {payload.status.value.lower()}.",
            source_type="LEAVE",
            source_id=leave.id,
            action_url="/student",
            dedup_key=f"leave_rev_{leave.id}_{payload.status.value}",
        ),
    )

    s_name = f"{leave.student.first_name} {leave.student.last_name}" if leave.student else "Student"
    s_email = leave.student.email if leave.student else ""
    d_name = leave.student.department.name if leave.student and leave.student.department else "General"
    r_name = f"{reviewer.first_name} {reviewer.last_name}"

    return StudentLeaveResponse(
        id=leave.id,
        student_id=leave.student_id,
        student_name=s_name,
        student_email=s_email,
        department_name=d_name,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        reviewer_id=leave.reviewer_id,
        reviewer_name=r_name,
        review_notes=leave.review_notes,
        reviewed_at=leave.reviewed_at,
        created_at=leave.created_at,
    )
