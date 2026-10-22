"""Attendance, Timetable & Academic Engagement Service Layer."""

from typing import List, Optional, Dict, Any, Tuple
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.department import Department
from app.models.timetable import ClassSchedule, DayOfWeek, ScheduleStatus
from app.models.attendance import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrection,
    AttendanceSessionStatus,
    AttendanceStatus,
    CorrectionStatus,
)
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.exam import Exam
from app.models.exam_attempt import ExamAttempt
from app.models.communication import NotificationCategory, NotificationPriority
from app.communication.schemas import NotificationCreate
from app.communication.services.notification_service import send_notification
from app.attendance.schemas import (
    ClassScheduleCreate,
    ClassScheduleUpdate,
    AttendanceSessionCreate,
    BulkAttendanceMarkRequest,
    AttendanceCorrectionCreate,
    AttendanceCorrectionReviewRequest,
    StudentAttendanceDashboard,
    CourseAttendanceSummary,
    FacultyAttendanceAnalytics,
    HODDepartmentAttendanceAnalytics,
    VCInstitutionAttendanceAnalytics,
    AcademicEngagementScore,
)


def _times_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
    """Check if time range 1 overlaps with time range 2 (HH:MM strings)."""
    return max(start1, start2) < min(end1, end2)


def require_course_staff_access(db: Session, course_id: str, user: User) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    role = user.role.name
    allowed = role in ("ADMINISTRATOR", "VC")
    if role == "HOD":
        allowed = bool(user.department_id and course.department_id == user.department_id)
    elif role == "FACULTY":
        allowed = db.query(CourseInstructor.id).filter(
            CourseInstructor.course_id == course_id, CourseInstructor.faculty_id == user.id,
        ).first() is not None
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot access attendance for this course.")
    return course


# -------------------------------------------------------------
# TIMETABLE ENGINE & CONFLICT DETECTION
# -------------------------------------------------------------
def create_class_schedule(db: Session, data: ClassScheduleCreate, current_user: User) -> ClassSchedule:
    # 1. Course existence check
    course = db.query(Course).filter(Course.id == data.course_id, Course.is_active == True).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found or inactive.")

    # 2. RBAC & Faculty Assignment Scoping
    if current_user.role.name == "FACULTY":
        if current_user.id != data.faculty_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty cannot schedule classes for other instructors.")
        # Verify assigned to course
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == data.course_id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to instruct this course.")
    elif current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD cannot schedule classes for other departments.")
    elif current_user.role.name not in ["ADMINISTRATOR", "VC"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to create class schedules.")

    if data.start_time >= data.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Schedule start_time must be strictly before end_time.")

    # 3. CONFLICT CHECKS
    existing_schedules = db.query(ClassSchedule).filter(
        ClassSchedule.day_of_week == data.day_of_week,
        ClassSchedule.status == ScheduleStatus.ACTIVE,
        ClassSchedule.week_number == str(data.week_number),
    ).all()

    for s in existing_schedules:
        if _times_overlap(data.start_time, data.end_time, s.start_time, s.end_time):
            # Conflict A: Same Faculty double-booked
            if s.faculty_id == data.faculty_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Faculty conflict: Instructor is already scheduled for course '{s.course.course_code}' in room '{s.room}' at {s.start_time}-{s.end_time}.",
                )
            # Conflict B: Same Room double-booked
            if s.room.strip().lower() == data.room.strip().lower() and (
                not s.building or not data.building or s.building.strip().lower() == data.building.strip().lower()
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Room conflict: Room '{data.room}' is already booked for course '{s.course.course_code}' at {s.start_time}-{s.end_time}.",
                )
            # Conflict C: Same Course + Section double-booked
            if s.course_id == data.course_id and (s.section_name or "").strip().lower() == (data.section_name or "").strip().lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Section conflict: Section '{data.section_name}' for course '{course.course_code}' already has a class at {s.start_time}-{s.end_time}.",
                )

    schedule = ClassSchedule(
        course_id=data.course_id,
        faculty_id=data.faculty_id,
        section_name=data.section_name,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room=data.room,
        building=data.building,
        academic_period=data.academic_period or "Current term",
        week_number=str(data.week_number),
        lecture_title=data.lecture_title,
        session_type=data.session_type,
        status=ScheduleStatus.ACTIVE,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def get_schedules_for_user(db: Session, current_user: User) -> List[ClassSchedule]:
    if current_user.role.name == "STUDENT":
        # Enrolled courses
        enrolled_course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            ).all()
        ]
        return db.query(ClassSchedule).filter(
            ClassSchedule.course_id.in_(enrolled_course_ids),
            ClassSchedule.status == ScheduleStatus.ACTIVE,
        ).all()

    elif current_user.role.name == "FACULTY":
        taught_course_ids = [
            ci.course_id for ci in db.query(CourseInstructor).filter(
                CourseInstructor.faculty_id == current_user.id
            ).all()
        ]
        query = db.query(ClassSchedule).filter(ClassSchedule.status == ScheduleStatus.ACTIVE)
        if taught_course_ids:
            query = query.filter(
                or_(
                    ClassSchedule.faculty_id == current_user.id,
                    ClassSchedule.course_id.in_(taught_course_ids),
                )
            )
        else:
            query = query.filter(ClassSchedule.faculty_id == current_user.id)
        return query.all()

    elif current_user.role.name == "HOD":
        dept_course_ids = [
            c.id for c in db.query(Course).filter(Course.department_id == current_user.department_id).all()
        ]
        dept_faculty_ids = [
            u.id for u in db.query(User).filter(User.department_id == current_user.department_id).all()
        ]
        conditions = []
        if dept_course_ids:
            conditions.append(ClassSchedule.course_id.in_(dept_course_ids))
        if dept_faculty_ids:
            conditions.append(ClassSchedule.faculty_id.in_(dept_faculty_ids))

        schedules = []
        if conditions:
            schedules = db.query(ClassSchedule).filter(
                or_(*conditions),
                ClassSchedule.status == ScheduleStatus.ACTIVE,
            ).all()

        return schedules

    else:
        # VC and Administrator: all active schedules
        return db.query(ClassSchedule).filter(ClassSchedule.status == ScheduleStatus.ACTIVE).all()


# -------------------------------------------------------------
# ATTENDANCE SESSION MANAGEMENT & MARKING
# -------------------------------------------------------------
def create_attendance_session(db: Session, data: AttendanceSessionCreate, current_user: User) -> AttendanceSession:
    require_course_staff_access(db, data.course_id, current_user)
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == data.course_id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to instruct this course.")
    elif current_user.role.name not in ["ADMINISTRATOR", "HOD"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to create attendance sessions.")

    session = AttendanceSession(
        course_id=data.course_id,
        faculty_id=current_user.id,
        schedule_id=data.schedule_id,
        session_date=data.session_date,
        start_time=data.start_time,
        end_time=data.end_time,
        topic_covered=data.topic_covered,
        status=AttendanceSessionStatus.OPEN,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def bulk_mark_attendance(db: Session, session_id: str, data: BulkAttendanceMarkRequest, current_user: User) -> Dict[str, Any]:
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")

    require_course_staff_access(db, session.course_id, current_user)

    if session.status == AttendanceSessionStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is CLOSED. Historical attendance is locked and requires an approved AttendanceCorrection request to modify.",
        )

    # Scoping check
    if current_user.role.name == "FACULTY":
        if session.faculty_id != current_user.id:
            # Check if co-instructor
            is_assigned = db.query(CourseInstructor).filter(
                CourseInstructor.course_id == session.course_id,
                CourseInstructor.faculty_id == current_user.id,
            ).first()
            if not is_assigned:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to mark attendance for this session.")
    elif current_user.role.name not in ["ADMINISTRATOR", "HOD"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to mark attendance.")

    # Valid enrolled students
    enrolled_student_ids = set(
        e.student_id for e in db.query(Enrollment).filter(
            Enrollment.course_id == session.course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()
    )

    records_saved = 0
    for item in data.records:
        if item.student_id not in enrolled_student_ids:
            continue  # Skip un-enrolled students

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == item.student_id,
        ).first()

        if record:
            record.status = item.status
            record.minutes_late = item.minutes_late
            record.remarks = item.remarks
        else:
            record = AttendanceRecord(
                session_id=session_id,
                student_id=item.student_id,
                status=item.status,
                minutes_late=item.minutes_late,
                remarks=item.remarks,
            )
            db.add(record)
        records_saved += 1

    db.commit()
    absent_student_ids = [
        item.student_id for item in data.records
        if item.student_id in enrolled_student_ids and item.status == AttendanceStatus.ABSENT
    ]
    notifications_sent = 0
    for student_id in absent_student_ids:
        notification = send_notification(
            db,
            NotificationCreate(
                recipient_id=student_id,
                category=NotificationCategory.ATTENDANCE,
                priority=NotificationPriority.HIGH,
                title=f"Attendance update: {session.course.course_code}",
                message=(
                    f"You were marked absent for {session.course.name}"
                    f"{f' - {session.topic_covered}' if session.topic_covered else ''}. "
                    "Open the missed-class study page to review the recorded topic and generate flashcards."
                ),
                source_type="ATTENDANCE",
                source_id=session.id,
                action_url=f"/student?catchUpSession={session.id}",
                dedup_key=f"attendance-absence:{session.id}:{student_id}",
            ),
        )
        if notification is not None:
            notifications_sent += 1

    return {
        "message": "Attendance records saved successfully.",
        "records_saved": records_saved,
        "absence_notifications_sent": notifications_sent,
    }


def close_attendance_session(db: Session, session_id: str, current_user: User) -> AttendanceSession:
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")

    require_course_staff_access(db, session.course_id, current_user)

    if current_user.role.name == "FACULTY" and session.faculty_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to close this session.")
    elif current_user.role.name not in ["FACULTY", "ADMINISTRATOR", "HOD"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    session.status = AttendanceSessionStatus.CLOSED
    db.commit()
    db.refresh(session)
    return session


# -------------------------------------------------------------
# ATTENDANCE CORRECTION WORKFLOW
# -------------------------------------------------------------
def request_attendance_correction(db: Session, data: AttendanceCorrectionCreate, current_user: User) -> AttendanceCorrection:
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == data.record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")

    session = record.session
    if current_user.role.name == "FACULTY":
        if session.faculty_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot request correction for another instructor's session.")
    elif current_user.role.name not in ["FACULTY", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to request attendance correction.")

    correction = AttendanceCorrection(
        record_id=data.record_id,
        original_status=record.status,
        requested_status=data.requested_status,
        reason=data.reason,
        requested_by=current_user.id,
        requested_at=datetime.now(timezone.utc).isoformat(),
        approval_status=CorrectionStatus.PENDING,
    )
    db.add(correction)
    db.commit()
    db.refresh(correction)
    return correction


def review_attendance_correction(
    db: Session,
    correction_id: str,
    data: AttendanceCorrectionReviewRequest,
    current_user: User,
) -> AttendanceCorrection:
    correction = db.query(AttendanceCorrection).filter(AttendanceCorrection.id == correction_id).first()
    if not correction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction request not found.")

    record = correction.record
    course = record.session.course

    # Scoping check: HOD of course's department or Administrator
    if current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only review corrections for their own department.")
    elif current_user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HOD or Administrator can approve/reject attendance corrections.")

    if correction.approval_status != CorrectionStatus.PENDING:
        raise HTTPException(status_code=409, detail="This correction has already been reviewed.")
    if data.approval_status not in (CorrectionStatus.APPROVED, CorrectionStatus.REJECTED):
        raise HTTPException(status_code=422, detail="Choose approve or reject.")
    correction.approval_status = data.approval_status
    correction.reviewed_by = current_user.id
    correction.reviewed_at = datetime.now(timezone.utc).isoformat()
    correction.review_notes = data.review_notes

    # If APPROVED, apply change to underlying AttendanceRecord
    if data.approval_status == CorrectionStatus.APPROVED:
        record.status = correction.requested_status

    db.commit()
    db.refresh(correction)
    return correction


# -------------------------------------------------------------
# ATTENDANCE CALCULATION ENGINE & ANALYTICS
# -------------------------------------------------------------
def calculate_attendance_metrics(
    records: List[AttendanceRecord],
    late_counts_as_present: bool = True,
    exclude_excused_from_total: bool = True,
) -> Tuple[int, int, int, int, int, float, str]:
    """Authoritative attendance percentage calculation formula."""
    total = len(records)
    present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
    excused = sum(1 for r in records if r.status == AttendanceStatus.EXCUSED)

    applicable_total = total - (excused if exclude_excused_from_total else 0)
    if applicable_total <= 0:
        pct = 100.0 if total > 0 else 0.0
    else:
        earned = present + (late if late_counts_as_present else 0)
        pct = round((earned / applicable_total) * 100.0, 1)

    if pct >= 75.0:
        threshold_status = "GOOD"
    elif pct >= 65.0:
        threshold_status = "WARNING"
    else:
        threshold_status = "CRITICAL"

    return total, present, absent, late, excused, pct, threshold_status


def get_student_attendance_dashboard(db: Session, student_id: str, current_user: User) -> StudentAttendanceDashboard:
    # IDOR Protection
    if current_user.role.name == "STUDENT" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own attendance records.")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    # Get active enrollments
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    course_summaries: List[CourseAttendanceSummary] = []
    all_student_records: List[AttendanceRecord] = []

    for enr in enrollments:
        records = db.query(AttendanceRecord).join(AttendanceSession).filter(
            AttendanceSession.course_id == enr.course_id,
            AttendanceRecord.student_id == student_id,
        ).all()
        all_student_records.extend(records)

        tot, pres, ab, lt, exc, pct, th_status = calculate_attendance_metrics(records)
        alert_msg = None
        if th_status == "CRITICAL":
            alert_msg = f"Critical attendance alert: Your attendance ({pct}%) is below the mandatory 65% requirement."
        elif th_status == "WARNING":
            alert_msg = f"Attendance warning: Your attendance ({pct}%) is below the 75% threshold."

        course_summaries.append(
            CourseAttendanceSummary(
                course_id=enr.course.id,
                course_code=enr.course.course_code,
                course_name=enr.course.name,
                total_sessions=tot,
                present_count=pres,
                absent_count=ab,
                late_count=lt,
                excused_count=exc,
                attendance_percentage=pct,
                threshold_status=th_status,
                alert_message=alert_msg,
            )
        )

    tot_all, pres_all, ab_all, lt_all, exc_all, overall_pct, overall_status = calculate_attendance_metrics(all_student_records)

    return StudentAttendanceDashboard(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        overall_percentage=overall_pct,
        overall_status=overall_status,
        total_sessions=tot_all,
        total_present=pres_all,
        total_absent=ab_all,
        total_late=lt_all,
        total_excused=exc_all,
        courses=course_summaries,
    )


def get_faculty_attendance_analytics(db: Session, course_id: str, current_user: User) -> FacultyAttendanceAnalytics:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == course_id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized course access.")

    sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course_id).all()
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    student_pcts = []
    below_warning = 0
    below_critical = 0

    for enr in enrollments:
        records = db.query(AttendanceRecord).join(AttendanceSession).filter(
            AttendanceSession.course_id == course_id,
            AttendanceRecord.student_id == enr.student_id,
        ).all()
        _, _, _, _, _, pct, _ = calculate_attendance_metrics(records)
        student_pcts.append(pct)
        if pct < 65.0:
            below_critical += 1
        elif pct < 75.0:
            below_warning += 1

    avg_pct = round(sum(student_pcts) / len(student_pcts), 1) if student_pcts else 0.0

    return FacultyAttendanceAnalytics(
        course_id=course.id,
        course_name=course.name,
        course_code=course.course_code,
        total_sessions_conducted=len(sessions),
        total_enrolled_students=len(enrollments),
        average_attendance_percentage=avg_pct,
        students_below_warning=below_warning,
        students_below_critical=below_critical,
    )


def get_hod_department_attendance_analytics(db: Session, current_user: User) -> HODDepartmentAttendanceAnalytics:
    if current_user.role.name != "HOD" or not current_user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HODs can view department analytics.")

    dept = db.query(Department).filter(Department.id == current_user.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    courses = db.query(Course).filter(Course.department_id == dept.id, Course.is_active == True).all()
    courses_summary: List[FacultyAttendanceAnalytics] = []
    all_pcts = []
    total_below_warn = 0
    total_below_crit = 0

    for c in courses:
        ana = get_faculty_attendance_analytics(db, c.id, current_user)
        courses_summary.append(ana)
        all_pcts.append(ana.average_attendance_percentage)
        total_below_warn += ana.students_below_warning
        total_below_crit += ana.students_below_critical

    # Pending corrections
    pending_corrections = db.query(AttendanceCorrection).join(AttendanceRecord).join(AttendanceSession).join(Course).filter(
        Course.department_id == dept.id,
        AttendanceCorrection.approval_status == CorrectionStatus.PENDING,
    ).count()

    dept_avg = round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else 0.0

    return HODDepartmentAttendanceAnalytics(
        department_id=dept.id,
        department_name=dept.name,
        total_courses=len(courses),
        total_students=len(courses_summary),
        average_attendance_percentage=dept_avg,
        total_below_warning=total_below_warn,
        total_below_critical=total_below_crit,
        pending_corrections_count=pending_corrections,
        courses_summary=courses_summary,
    )


def get_vc_institution_attendance_analytics(db: Session, current_user: User) -> VCInstitutionAttendanceAnalytics:
    if current_user.role.name not in ["VC", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only VC or Administrator can view institution analytics.")

    departments = db.query(Department).filter(Department.is_active == True).all()
    dept_breakdown = []
    inst_pcts = []
    total_below_thresh = 0
    total_sessions = db.query(AttendanceSession).count()
    total_students = db.query(User).join(User.role).filter(User.role.has(name="STUDENT")).count()

    for d in departments:
        courses = db.query(Course).filter(Course.department_id == d.id).all()
        dept_course_pcts = []
        for c in courses:
            ana = get_faculty_attendance_analytics(db, c.id, current_user)
            dept_course_pcts.append(ana.average_attendance_percentage)
            total_below_thresh += (ana.students_below_warning + ana.students_below_critical)

        avg_d = round(sum(dept_course_pcts) / len(dept_course_pcts), 1) if dept_course_pcts else 0.0
        if dept_course_pcts:
            inst_pcts.append(avg_d)

        dept_breakdown.append({
            "department_id": d.id,
            "department_name": d.name,
            "department_code": d.code,
            "average_attendance": avg_d,
            "total_courses": len(courses),
        })

    inst_avg = round(sum(inst_pcts) / len(inst_pcts), 1) if inst_pcts else 0.0

    return VCInstitutionAttendanceAnalytics(
        institution_average_percentage=inst_avg,
        total_departments=len(departments),
        total_students=total_students,
        total_below_threshold=total_below_thresh,
        total_sessions_conducted=total_sessions,
        department_breakdown=dept_breakdown,
    )


def calculate_academic_engagement_score(db: Session, student_id: str, current_user: User) -> AcademicEngagementScore:
    if current_user.role.name == "STUDENT" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own engagement score.")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    # 1. Attendance Rate (40% weight)
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    _, _, _, _, _, att_rate, _ = calculate_attendance_metrics(records)

    # 2. Assignment Submission Rate (35% weight)
    enrolled_course_ids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.student_id == student_id).all()]
    total_assignments = db.query(Assignment).filter(Assignment.course_id.in_(enrolled_course_ids)).count()
    submitted_assignments = db.query(AssignmentSubmission).filter(AssignmentSubmission.student_id == student_id).count()
    assign_rate = round((submitted_assignments / total_assignments) * 100.0, 1) if total_assignments > 0 else 100.0

    # 3. Exam Participation Rate (25% weight)
    total_exams = db.query(Exam).filter(Exam.course_id.in_(enrolled_course_ids), Exam.is_published == True).count()
    attempted_exams = db.query(ExamAttempt).filter(ExamAttempt.student_id == student_id).count()
    exam_rate = round((attempted_exams / total_exams) * 100.0, 1) if total_exams > 0 else 100.0

    # Composite Score
    engagement = round((att_rate * 0.40) + (assign_rate * 0.35) + (exam_rate * 0.25), 1)

    if engagement >= 80.0:
        rating = "HIGH"
    elif engagement >= 60.0:
        rating = "MODERATE"
    else:
        rating = "NEEDS_ATTENTION"

    return AcademicEngagementScore(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        engagement_percentage=engagement,
        attendance_rate=att_rate,
        assignment_rate=assign_rate,
        exam_participation_rate=exam_rate,
        rating=rating,
    )
