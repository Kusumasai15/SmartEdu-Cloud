"""Assignments & Submissions REST API Router."""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.auth.dependencies import get_current_user, get_current_active_user, require_permission, require_role
from app.models.user import User
from app.models import Assignment, AssignmentSubmission, Course, CourseInstructor, Enrollment, EnrollmentStatus
from app.models.assignment import AssignmentStatus
from app.assignments.schemas import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    SubmissionCreate,
    SubmissionGradePayload,
    SubmissionResponse,
    StudentSubmissionView,
    AssignmentGradingDashboard,
)
from app.assignments.service import assignment_service

router = APIRouter(tags=["Assignments & Submissions"])


@router.get("/assignments/my", response_model=List[AssignmentResponse])
def list_my_assignments(
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List assignments visible to the authenticated user, without client-side fixtures."""
    role = current_user.role.name if current_user.role else ""
    query = db.query(Assignment)
    if role == "STUDENT":
        query = query.join(Enrollment, Enrollment.course_id == Assignment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE.value,
            Assignment.status.in_([AssignmentStatus.PUBLISHED.value, AssignmentStatus.CLOSED.value]),
        )
    elif role == "FACULTY":
        query = query.join(CourseInstructor, CourseInstructor.course_id == Assignment.course_id).filter(
            CourseInstructor.faculty_id == current_user.id,
            Assignment.status != AssignmentStatus.ARCHIVED.value,
        )
    elif role == "HOD":
        query = query.join(Course, Course.id == Assignment.course_id).filter(
            Course.department_id == current_user.department_id,
            Assignment.status != AssignmentStatus.ARCHIVED.value,
        )
    elif role != "ADMINISTRATOR":
        raise HTTPException(status_code=403, detail="Assignment access is not available for this role.")
    return query.order_by(Assignment.due_date.asc()).offset(offset).limit(limit).all()


@router.get("/assignments/my-submissions", response_model=List[SubmissionResponse])
def list_my_submissions(
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STUDENT")),
):
    return (
        db.query(AssignmentSubmission)
        .filter(AssignmentSubmission.student_id == current_user.id)
        .order_by(AssignmentSubmission.submitted_at.desc())
        .offset(offset).limit(limit).all()
    )


@router.get("/assignments/{assignment_id}/submissions", response_model=dict)
def list_assignment_submissions(
    assignment_id: str,
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """Return only submissions for a course the faculty member may inspect."""
    assignment = assignment_service.get_assignment_by_id(db, assignment_id, current_user)
    assignment_service.verify_faculty_course_auth(db, current_user, assignment.course_id)
    query = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id)
    total = query.with_entities(func.count(AssignmentSubmission.id)).scalar() or 0
    rows = query.order_by(AssignmentSubmission.submitted_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "id": row.id,
                "assignment_id": row.assignment_id,
                "student_id": row.student_id,
                "student_name": row.student.full_name,
                "student_identifier": row.student.student_identifier,
                "submitted_at": row.submitted_at,
                "status": row.status,
                "score": row.score,
                "feedback": row.feedback,
                "submission_text": row.submission_text,
                "attachment_url": row.attachment_url,
            }
            for row in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# -------------------------------------------------------------
# ASSIGNMENT ENDPOINTS
# -------------------------------------------------------------

@router.post(
    "/courses/{course_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create coursework assignment",
)
def create_course_assignment(
    course_id: str,
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Author a new assignment for an assigned course."""
    return assignment_service.create_assignment(db, course_id, payload, current_user)


@router.get(
    "/courses/{course_id}/assignments",
    response_model=List[AssignmentResponse],
    summary="List assignments for a course",
)
def list_course_assignments(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List assignments for a course. Filtered by role (students see published only)."""
    return assignment_service.get_course_assignments(db, course_id, current_user)


@router.get(
    "/assignments/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Get assignment details",
)
def get_assignment_item(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch assignment details."""
    return assignment_service.get_assignment_by_id(db, assignment_id, current_user)


@router.patch(
    "/assignments/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Update assignment metadata",
)
def update_assignment_item(
    assignment_id: str,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Update assignment details."""
    return assignment_service.update_assignment(db, assignment_id, payload, current_user)


@router.post(
    "/assignments/{assignment_id}/publish",
    response_model=AssignmentResponse,
    summary="Publish assignment to students",
)
def publish_assignment_item(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Transition assignment to PUBLISHED state."""
    return assignment_service.publish_assignment(db, assignment_id, current_user)


@router.post(
    "/assignments/{assignment_id}/publish-results",
    response_model=AssignmentResponse,
    summary="Release assignment grades and feedback to students",
)
def publish_assignment_results(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Release grades and evaluation feedback to students."""
    return assignment_service.publish_results(db, assignment_id, current_user)


# -------------------------------------------------------------
# STUDENT SUBMISSION ENDPOINTS
# -------------------------------------------------------------

@router.post(
    "/assignments/{assignment_id}/submit",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit student coursework",
)
def submit_student_assignment(
    assignment_id: str,
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("enrollment:view")),
):
    """Submit coursework solution. Student identity is derived strictly from JWT subject."""
    return assignment_service.submit_assignment(db, assignment_id, payload, current_user)


@router.get(
    "/assignments/{assignment_id}/my-submission",
    response_model=StudentSubmissionView,
    summary="Get student's own submission status and results",
)
def get_my_submission_status(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("enrollment:view")),
):
    """Retrieve own submission, evaluation score, and feedback (when released)."""
    return assignment_service.get_student_submission_view(db, assignment_id, current_user)


# -------------------------------------------------------------
# FACULTY EVALUATION & ROSTER ENDPOINTS
# -------------------------------------------------------------

@router.post(
    "/submissions/{submission_id}/grade",
    response_model=SubmissionResponse,
    summary="Grade a student submission",
)
def grade_student_submission(
    submission_id: str,
    payload: SubmissionGradePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Grade student submission and record instructor feedback."""
    return assignment_service.grade_submission(db, submission_id, payload, current_user)


@router.get(
    "/assignments/{assignment_id}/grading-dashboard",
    response_model=AssignmentGradingDashboard,
    summary="Get faculty grading dashboard with student roster and analytics",
)
def get_assignment_grading_dashboard(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """Retrieve full submission roster, evaluation metrics, and score statistics."""
    return assignment_service.get_assignment_grading_dashboard(db, assignment_id, current_user)
