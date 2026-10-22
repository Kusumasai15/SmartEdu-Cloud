"""Internal Academic Event Bus for event-driven notification dispatch."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.communication import (
    NotificationCategory,
    NotificationPriority,
)
from app.communication.schemas import NotificationCreate
from app.communication.services.notification_service import send_notification


class AcademicEventBus:
    """Dispatches event-driven notifications across university workflows."""

    @staticmethod
    def emit_assignment_published(
        db: Session,
        course_id: str,
        assignment_id: str,
        assignment_title: str,
        due_date_str: Optional[str] = None,
    ):
        """Notify all enrolled students when a new assignment is published."""
        course = db.query(Course).filter(Course.id == course_id).first()
        course_name = course.name if course else "Course"

        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()

        due_txt = f" Due: {due_date_str}." if due_date_str else ""
        for e in enrollments:
            send_notification(
                db,
                NotificationCreate(
                    recipient_id=e.student_id,
                    category=NotificationCategory.ASSIGNMENT,
                    priority=NotificationPriority.NORMAL,
                    title=f"New Assignment: {assignment_title}",
                    message=f"A new assignment has been published in {course_name}.{due_txt}",
                    source_type="ASSIGNMENT",
                    source_id=assignment_id,
                    action_url=f"/courses/{course_id}",
                    dedup_key=f"assign_pub_{assignment_id}_{e.student_id}",
                ),
            )

    @staticmethod
    def emit_results_published(
        db: Session,
        course_id: str,
        semester_name: str,
    ):
        """Notify enrolled students when official course results are published."""
        course = db.query(Course).filter(Course.id == course_id).first()
        course_name = course.name if course else "Course"

        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()

        for e in enrollments:
            send_notification(
                db,
                NotificationCreate(
                    recipient_id=e.student_id,
                    category=NotificationCategory.RESULT,
                    priority=NotificationPriority.HIGH,
                    title=f"Official Results Published: {course_name}",
                    message=f"Final academic results for {course_name} ({semester_name}) are now published and available on your transcript.",
                    source_type="RESULT",
                    source_id=course_id,
                    action_url="/student",
                    dedup_key=f"res_pub_{course_id}_{e.student_id}",
                ),
            )

    @staticmethod
    def emit_attendance_warning(
        db: Session,
        student_id: str,
        course_name: str,
        attendance_pct: float,
    ):
        """Notify student when attendance drops below the 75% threshold."""
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        send_notification(
            db,
            NotificationCreate(
                recipient_id=student_id,
                category=NotificationCategory.ATTENDANCE,
                priority=NotificationPriority.HIGH if attendance_pct < 65.0 else NotificationPriority.NORMAL,
                title="Attendance Threshold Alert",
                message=f"Your overall attendance in {course_name} is currently {attendance_pct:.1f}%, below the required 75% criteria.",
                source_type="ATTENDANCE",
                action_url="/student",
                dedup_key=f"att_warn_{student_id}_{today_str}",
            ),
        )

    @staticmethod
    def emit_academic_risk_alert(
        db: Session,
        student_id: str,
        risk_level: str,
        primary_reason: str,
    ):
        """Notify student and advisor when risk level reaches HIGH or CRITICAL."""
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        send_notification(
            db,
            NotificationCreate(
                recipient_id=student_id,
                category=NotificationCategory.ACADEMIC,
                priority=NotificationPriority.URGENT if risk_level == "CRITICAL" else NotificationPriority.HIGH,
                title=f"Academic Advisory: {risk_level} Risk Flagged",
                message=f"An early-warning indicator has flagged your academic profile. Factor: {primary_reason}",
                source_type="RISK_ENGINE",
                action_url="/student",
                dedup_key=f"risk_notif_{student_id}_{today_str}_{risk_level}",
            ),
        )
