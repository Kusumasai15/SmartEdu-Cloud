"""Assignment and Submission Service Layer."""
from datetime import datetime, timezone
import re
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.assignment import Assignment, AssignmentStatus
from app.models.assignment_submission import AssignmentSubmission, SubmissionStatus
from app.models.course import Course, CourseInstructor
from app.models.course_module import CourseModule
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.user import User
from app.core.config import settings
from app.assignments.schemas import (
    AssignmentCreate,
    AssignmentUpdate,
    SubmissionCreate,
    SubmissionGradePayload,
    StudentSubmissionView,
    AssignmentResponse,
    SubmissionResponse,
    FacultySubmissionRosterRow,
    AssignmentGradingDashboard,
)


class AssignmentService:
    """Business logic for coursework assignments, submissions, and grading."""

    # ---------------------------------------------------------
    # AUTHORIZATION HELPERS
    # ---------------------------------------------------------

    def verify_faculty_course_auth(
        self, db: Session, user: User, course_id: str
    ) -> Course:
        """Verify instructor is assigned to course, or is HOD/ADMIN."""
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID '{course_id}' not found.",
            )

        role_name = user.role.name if user.role else ""
        if role_name in ["ADMINISTRATOR", "VC"]:
            return course

        if role_name == "HOD":
            if user.department_id != course.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HOD cannot manage assignments for courses outside their department.",
                )
            return course

        # FACULTY: must be assigned
        assignment = (
            db.query(CourseInstructor)
            .filter(
                CourseInstructor.course_id == course_id,
                CourseInstructor.faculty_id == user.id,
            )
            .first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faculty is not assigned to teach this course.",
            )
        return course

    def verify_student_course_enrollment(
        self, db: Session, user: User, course_id: str
    ) -> Course:
        """Verify student has an active enrollment in the course."""
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID '{course_id}' not found.",
            )

        role_name = user.role.name if user.role else ""
        if role_name in ["ADMINISTRATOR", "VC"]:
            return course

        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.student_id == user.id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .first()
        )
        if not enrollment:
            if course and course.is_active and course.semester_id:
                try:
                    new_enr = Enrollment(
                        student_id=user.id,
                        course_id=course.id,
                        semester_id=course.semester_id,
                        status=EnrollmentStatus.ACTIVE.value,
                    )
                    db.add(new_enr)
                    db.commit()
                    return course
                except Exception:
                    db.rollback()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student is not actively enrolled in this course.",
            )
        return course

    # ---------------------------------------------------------
    # ASSIGNMENT MANAGEMENT (FACULTY)
    # ---------------------------------------------------------

    def create_assignment(
        self,
        db: Session,
        course_id: str,
        payload: AssignmentCreate,
        current_user: User,
    ) -> Assignment:
        """Author a new coursework assignment."""
        course = self.verify_faculty_course_auth(db, current_user, course_id)

        if payload.module_id:
            module = (
                db.query(CourseModule)
                .filter(
                    CourseModule.id == payload.module_id,
                    CourseModule.course_id == course_id,
                )
                .first()
            )
            if not module:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module '{payload.module_id}' does not belong to course '{course_id}'.",
                )

        assignment = Assignment(
            course_id=course_id,
            module_id=payload.module_id,
            title=payload.title,
            description=payload.description,
            instructions=payload.instructions,
            attachment_url=payload.attachment_url,
            max_points=payload.max_points,
            passing_points=payload.passing_points,
            due_date=payload.due_date,
            allow_late_submission=payload.allow_late_submission,
            status=payload.status.value,
            created_by=current_user.id,
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    def get_course_assignments(
        self, db: Session, course_id: str, current_user: User
    ) -> List[Assignment]:
        """List assignments for a course with role-based filtering."""
        role_name = current_user.role.name if current_user.role else ""

        if role_name == "STUDENT":
            self.verify_student_course_enrollment(db, current_user, course_id)
            return (
                db.query(Assignment)
                .filter(
                    Assignment.course_id == course_id,
                    Assignment.status.in_([
                        AssignmentStatus.PUBLISHED.value,
                        AssignmentStatus.CLOSED.value,
                    ]),
                )
                .order_by(Assignment.due_date.asc())
                .all()
            )
        else:
            self.verify_faculty_course_auth(db, current_user, course_id)
            return (
                db.query(Assignment)
                .filter(
                    Assignment.course_id == course_id,
                    Assignment.status != AssignmentStatus.ARCHIVED.value,
                )
                .order_by(Assignment.due_date.asc())
                .all()
            )

    def get_assignment_by_id(
        self, db: Session, assignment_id: str, current_user: User
    ) -> Assignment:
        """Fetch assignment details."""
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment with ID '{assignment_id}' not found.",
            )

        role_name = current_user.role.name if current_user.role else ""
        if role_name == "STUDENT":
            self.verify_student_course_enrollment(db, current_user, assignment.course_id)
            if assignment.status == AssignmentStatus.DRAFT.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This assignment is currently in draft state.",
                )
        else:
            self.verify_faculty_course_auth(db, current_user, assignment.course_id)

        return assignment

    def update_assignment(
        self,
        db: Session,
        assignment_id: str,
        payload: AssignmentUpdate,
        current_user: User,
    ) -> Assignment:
        """Update assignment metadata."""
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment with ID '{assignment_id}' not found.",
            )
        self.verify_faculty_course_auth(db, current_user, assignment.course_id)

        update_data = payload.model_dump(exclude_unset=True)
        if "status" in update_data and isinstance(update_data["status"], AssignmentStatus):
            update_data["status"] = update_data["status"].value

        for field, value in update_data.items():
            setattr(assignment, field, value)

        db.commit()
        db.refresh(assignment)
        return assignment

    def publish_assignment(
        self, db: Session, assignment_id: str, current_user: User
    ) -> Assignment:
        """Publish assignment to make it visible to students."""
        assignment = self.get_assignment_by_id(db, assignment_id, current_user)
        self.verify_faculty_course_auth(db, current_user, assignment.course_id)
        assignment.status = AssignmentStatus.PUBLISHED.value
        db.commit()
        db.refresh(assignment)
        return assignment

    def publish_results(
        self, db: Session, assignment_id: str, current_user: User
    ) -> Assignment:
        """Release grades and evaluation feedback to students."""
        assignment = self.get_assignment_by_id(db, assignment_id, current_user)
        self.verify_faculty_course_auth(db, current_user, assignment.course_id)
        assignment.results_published = True
        db.commit()
        db.refresh(assignment)
        return assignment

    # ---------------------------------------------------------
    # SUBMISSION & GRADING
    # ---------------------------------------------------------

    def submit_assignment(
        self,
        db: Session,
        assignment_id: str,
        payload: SubmissionCreate,
        current_user: User,
    ) -> AssignmentSubmission:
        """Submit student coursework with deadline checks and identity integrity."""
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment with ID '{assignment_id}' not found.",
            )

        self.verify_student_course_enrollment(db, current_user, assignment.course_id)

        if assignment.status != AssignmentStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Assignment is not open for submission (status: {assignment.status}).",
            )

        if not payload.submission_text and not payload.attachment_url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Submission must include either text content or an attachment URL.",
            )
        if payload.attachment_url:
            att = payload.attachment_url.strip()
            if att.startswith("s3://"):
                prefix = f"s3://{settings.AWS_S3_BUCKET}/assignments/{current_user.id}/"
                file_name = att.removeprefix(prefix)
                if not settings.AWS_S3_BUCKET or not att.startswith(prefix) or not re.fullmatch(r"[a-f0-9]{32}(\.[a-z0-9]{1,12})?", file_name):
                    raise HTTPException(status_code=422, detail="The attachment must be an uploaded file owned by the student.")
            elif att.startswith("/api/v1/storage/") or att.startswith("/storage/") or att.startswith("data:"):
                # Direct server storage or embedded data URL
                pass
            else:
                if not att.startswith("http://") and not att.startswith("https://"):
                    att = f"https://{att}"
                    payload.attachment_url = att
                parsed = urlparse(att)
                if parsed.scheme not in ("http", "https") or not parsed.netloc:
                    raise HTTPException(status_code=422, detail="External attachments must use a valid web link.")

        # Check deadline
        now = datetime.now(timezone.utc)
        due_date = assignment.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)

        is_late = now > due_date
        if is_late and not assignment.allow_late_submission:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignment deadline has passed and late submissions are not allowed.",
            )

        # Check if submission already exists (resubmission)
        submission = (
            db.query(AssignmentSubmission)
            .filter(
                AssignmentSubmission.assignment_id == assignment_id,
                AssignmentSubmission.student_id == current_user.id,
            )
            .first()
        )

        if submission:
            submission.submission_text = payload.submission_text
            submission.attachment_url = payload.attachment_url
            submission.submitted_at = now
            submission.is_late = is_late
            submission.status = SubmissionStatus.RESUBMITTED.value
        else:
            submission = AssignmentSubmission(
                assignment_id=assignment_id,
                student_id=current_user.id,
                submission_text=payload.submission_text,
                attachment_url=payload.attachment_url,
                submitted_at=now,
                is_late=is_late,
                status=SubmissionStatus.SUBMITTED.value,
            )
            db.add(submission)

        db.commit()
        db.refresh(submission)
        return submission

    def get_student_submission_view(
        self, db: Session, assignment_id: str, current_user: User
    ) -> StudentSubmissionView:
        """Fetch student's own submission status and results."""
        assignment = self.get_assignment_by_id(db, assignment_id, current_user)

        submission = (
            db.query(AssignmentSubmission)
            .filter(
                AssignmentSubmission.assignment_id == assignment_id,
                AssignmentSubmission.student_id == current_user.id,
            )
            .first()
        )

        now = datetime.now(timezone.utc)
        due_date = assignment.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)

        is_past_due = now > due_date

        sub_resp = None
        if submission:
            sub_dict = {
                "id": submission.id,
                "assignment_id": submission.assignment_id,
                "student_id": submission.student_id,
                "submission_text": submission.submission_text,
                "attachment_url": submission.attachment_url,
                "submitted_at": submission.submitted_at,
                "is_late": submission.is_late,
                "score": submission.score if assignment.results_published else None,
                "feedback": submission.feedback if assignment.results_published else None,
                "graded_by": submission.graded_by if assignment.results_published else None,
                "graded_at": submission.graded_at if assignment.results_published else None,
                "status": submission.status,
                "created_at": submission.created_at,
                "updated_at": submission.updated_at,
            }
            sub_resp = SubmissionResponse(**sub_dict)

        return StudentSubmissionView(
            assignment=AssignmentResponse.model_validate(assignment),
            submission=sub_resp,
            is_submitted=submission is not None,
            is_graded=submission.score is not None if (submission and assignment.results_published) else False,
            is_past_due=is_past_due,
        )

    def grade_submission(
        self,
        db: Session,
        submission_id: str,
        payload: SubmissionGradePayload,
        current_user: User,
    ) -> AssignmentSubmission:
        """Grade a student submission with score validation and evaluator tracking."""
        submission = (
            db.query(AssignmentSubmission)
            .filter(AssignmentSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Submission with ID '{submission_id}' not found.",
            )

        assignment = submission.assignment
        self.verify_faculty_course_auth(db, current_user, assignment.course_id)

        if payload.score > assignment.max_points:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Assigned score ({payload.score}) exceeds maximum points ({assignment.max_points}).",
            )

        submission.score = payload.score
        submission.feedback = payload.feedback
        submission.graded_by = current_user.id
        submission.graded_at = datetime.now(timezone.utc)
        submission.status = SubmissionStatus.GRADED.value

        db.commit()
        db.refresh(submission)
        return submission

    def get_assignment_grading_dashboard(
        self, db: Session, assignment_id: str, current_user: User
    ) -> AssignmentGradingDashboard:
        """Compute real assignment evaluation roster and grade statistics."""
        assignment = self.get_assignment_by_id(db, assignment_id, current_user)
        self.verify_faculty_course_auth(db, current_user, assignment.course_id)

        # Fetch all active enrolled students in this course
        enrollments = (
            db.query(Enrollment)
            .join(User, Enrollment.student_id == User.id)
            .filter(
                Enrollment.course_id == assignment.course_id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .order_by(User.last_name.asc(), User.first_name.asc())
            .all()
        )

        # Fetch all submissions for this assignment
        submissions_map = {
            s.student_id: s
            for s in db.query(AssignmentSubmission)
            .filter(AssignmentSubmission.assignment_id == assignment_id)
            .all()
        }

        roster_rows: List[FacultySubmissionRosterRow] = []
        graded_scores: List[float] = []

        for enr in enrollments:
            student = enr.student
            sub = submissions_map.get(student.id)
            is_sub = sub is not None

            if sub and sub.score is not None:
                graded_scores.append(sub.score)

            roster_rows.append(
                FacultySubmissionRosterRow(
                    submission_id=sub.id if sub else None,
                    student_id=student.id,
                    student_name=f"{student.first_name} {student.last_name}",
                    student_email=student.email,
                    student_identifier=student.student_identifier,
                    submitted_at=sub.submitted_at if sub else None,
                    is_submitted=is_sub,
                    is_late=sub.is_late if sub else False,
                    score=sub.score if sub else None,
                    feedback=sub.feedback if sub else None,
                    status=sub.status if sub else "PENDING",
                )
            )

        total_enrolled = len(enrollments)
        total_submitted = len(submissions_map)
        total_graded = len(graded_scores)

        avg_score = round(sum(graded_scores) / total_graded, 2) if total_graded > 0 else None
        high_score = max(graded_scores) if total_graded > 0 else None
        low_score = min(graded_scores) if total_graded > 0 else None

        return AssignmentGradingDashboard(
            assignment=AssignmentResponse.model_validate(assignment),
            total_enrolled=total_enrolled,
            total_submitted=total_submitted,
            total_graded=total_graded,
            average_score=avg_score,
            highest_score=high_score,
            lowest_score=low_score,
            submissions=roster_rows,
        )


assignment_service = AssignmentService()
