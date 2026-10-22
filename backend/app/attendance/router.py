"""FastAPI REST Router for Attendance, Timetable, Corrections & Engagement."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
import io
import csv

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.timetable import ClassSchedule, ScheduleStatus
from app.models.attendance import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrection,
    CorrectionStatus,
)
from app.attendance.schemas import (
    ClassScheduleCreate,
    ClassScheduleResponse,
    AttendanceSessionCreate,
    AttendanceSessionResponse,
    AttendanceSessionDetailResponse,
    BulkAttendanceMarkRequest,
    AttendanceCorrectionCreate,
    AttendanceCorrectionReviewRequest,
    AttendanceCorrectionResponse,
    StudentAttendanceDashboard,
    FacultyAttendanceAnalytics,
    HODDepartmentAttendanceAnalytics,
    VCInstitutionAttendanceAnalytics,
    AcademicEngagementScore,
)
from app.attendance import service

router = APIRouter(prefix="", tags=["Attendance & Timetable"])


# -------------------------------------------------------------
# TIMETABLE ENDPOINTS
# -------------------------------------------------------------
@router.post("/timetable/schedules", response_model=ClassScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule_endpoint(
    data: ClassScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = service.create_class_schedule(db, data, current_user)
    return ClassScheduleResponse(
        id=schedule.id,
        course_id=schedule.course_id,
        course_code=schedule.course.course_code if schedule.course else None,
        course_name=schedule.course.name if schedule.course else None,
        faculty_id=schedule.faculty_id,
        faculty_name=f"{schedule.faculty.first_name} {schedule.faculty.last_name}" if schedule.faculty else None,
        section_name=schedule.section_name,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        room=schedule.room,
        building=schedule.building,
        academic_period=schedule.academic_period,
        status=schedule.status,
        created_at=schedule.created_at,
    )


@router.get("/timetable/my-schedules", response_model=List[ClassScheduleResponse])
def get_my_schedules_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedules = service.get_schedules_for_user(db, current_user)
    return [
        ClassScheduleResponse(
            id=s.id,
            course_id=s.course_id,
            course_code=s.course.course_code if s.course else None,
            course_name=s.course.name if s.course else None,
            faculty_id=s.faculty_id,
            faculty_name=f"{s.faculty.first_name} {s.faculty.last_name}" if s.faculty else None,
            section_name=s.section_name,
            day_of_week=s.day_of_week,
            start_time=s.start_time,
            end_time=s.end_time,
            room=s.room,
            building=s.building,
            academic_period=s.academic_period,
            status=s.status,
            created_at=s.created_at,
        )
        for s in schedules
    ]


@router.delete("/timetable/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule_endpoint(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class schedule not found.")

    role = current_user.role.name
    if role == "FACULTY" and schedule.faculty_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only remove your own classes.")
    if role == "HOD":
        course_department_id = schedule.course.department_id if schedule.course else None
        if not current_user.department_id or course_department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only remove classes in your department.")
    elif role not in ("FACULTY", "ADMINISTRATOR", "VC"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove class schedules.")

    db.delete(schedule)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/timetable/schedules/{schedule_id}/cancel", response_model=ClassScheduleResponse)
def cancel_schedule_endpoint(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a class while retaining its record for audit and attendance history."""
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class schedule not found.")

    role = current_user.role.name
    if role == "FACULTY" and schedule.faculty_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel your own classes.")
    if role == "HOD":
        course_department_id = schedule.course.department_id if schedule.course else None
        if not current_user.department_id or course_department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel classes in your department.")
    elif role not in ("FACULTY", "ADMINISTRATOR", "VC"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel class schedules.")

    if schedule.status == ScheduleStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Completed classes cannot be cancelled.")
    schedule.status = ScheduleStatus.CANCELLED
    db.commit()
    db.refresh(schedule)
    return ClassScheduleResponse(
        id=schedule.id,
        course_id=schedule.course_id,
        course_code=schedule.course.course_code if schedule.course else None,
        course_name=schedule.course.name if schedule.course else None,
        faculty_id=schedule.faculty_id,
        faculty_name=f"{schedule.faculty.first_name} {schedule.faculty.last_name}" if schedule.faculty else None,
        section_name=schedule.section_name,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        room=schedule.room,
        building=schedule.building,
        academic_period=schedule.academic_period,
        week_number=int(schedule.week_number or 1),
        lecture_title=schedule.lecture_title,
        session_type=schedule.session_type,
        status=schedule.status,
        created_at=schedule.created_at,
    )


# -------------------------------------------------------------
# ATTENDANCE SESSION ENDPOINTS
# -------------------------------------------------------------
@router.post("/attendance/sessions", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session_endpoint(
    data: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = service.create_attendance_session(db, data, current_user)
    return AttendanceSessionResponse(
        id=sess.id,
        course_id=sess.course_id,
        course_code=sess.course.course_code if sess.course else None,
        course_name=sess.course.name if sess.course else None,
        faculty_id=sess.faculty_id,
        faculty_name=f"{sess.faculty.first_name} {sess.faculty.last_name}" if sess.faculty else None,
        schedule_id=sess.schedule_id,
        session_date=sess.session_date,
        start_time=sess.start_time,
        end_time=sess.end_time,
        topic_covered=sess.topic_covered,
        status=sess.status,
        created_at=sess.created_at,
        updated_at=sess.updated_at,
    )


@router.get("/courses/{course_id}/attendance-sessions", response_model=List[AttendanceSessionResponse])
def get_course_sessions_endpoint(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service.require_course_staff_access(db, course_id, current_user)
    sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course_id).order_by(AttendanceSession.session_date.desc()).all()
    res = []
    for s in sessions:
        records = s.records
        pres = sum(1 for r in records if r.status == "PRESENT")
        ab = sum(1 for r in records if r.status == "ABSENT")
        lt = sum(1 for r in records if r.status == "LATE")
        exc = sum(1 for r in records if r.status == "EXCUSED")
        res.append(
            AttendanceSessionResponse(
                id=s.id,
                course_id=s.course_id,
                course_code=s.course.course_code if s.course else None,
                course_name=s.course.name if s.course else None,
                faculty_id=s.faculty_id,
                faculty_name=f"{s.faculty.first_name} {s.faculty.last_name}" if s.faculty else None,
                schedule_id=s.schedule_id,
                session_date=s.session_date,
                start_time=s.start_time,
                end_time=s.end_time,
                topic_covered=s.topic_covered,
                status=s.status,
                total_records=len(records),
                present_count=pres,
                absent_count=ab,
                late_count=lt,
                excused_count=exc,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return res


@router.get("/attendance/sessions/{session_id}", response_model=AttendanceSessionDetailResponse)
def get_session_detail_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    service.require_course_staff_access(db, s.course_id, current_user)
    records = s.records
    pres = sum(1 for r in records if r.status == "PRESENT")
    ab = sum(1 for r in records if r.status == "ABSENT")
    lt = sum(1 for r in records if r.status == "LATE")
    exc = sum(1 for r in records if r.status == "EXCUSED")

    record_responses = [
        {
            "id": r.id,
            "session_id": r.session_id,
            "student_id": r.student_id,
            "student_name": f"{r.student.first_name} {r.student.last_name}" if r.student else None,
            "student_email": r.student.email if r.student else None,
            "student_identifier": r.student.student_identifier if r.student else None,
            "status": r.status,
            "minutes_late": r.minutes_late,
            "remarks": r.remarks,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }
        for r in records
    ]

    return AttendanceSessionDetailResponse(
        id=s.id,
        course_id=s.course_id,
        course_code=s.course.course_code if s.course else None,
        course_name=s.course.name if s.course else None,
        faculty_id=s.faculty_id,
        faculty_name=f"{s.faculty.first_name} {s.faculty.last_name}" if s.faculty else None,
        schedule_id=s.schedule_id,
        session_date=s.session_date,
        start_time=s.start_time,
        end_time=s.end_time,
        topic_covered=s.topic_covered,
        status=s.status,
        total_records=len(records),
        present_count=pres,
        absent_count=ab,
        late_count=lt,
        excused_count=exc,
        created_at=s.created_at,
        updated_at=s.updated_at,
        records=record_responses,
    )


@router.get("/attendance/sessions/{session_id}/catch-up")
def get_absence_catch_up_context(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return only the missed lesson context to the absent student."""
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == current_user.id,
        AttendanceRecord.status == "ABSENT",
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No absent attendance record was found for this student.")
    session = record.session
    return {
        "session_id": session.id,
        "course_id": session.course_id,
        "course_code": session.course.course_code if session.course else "",
        "course_name": session.course.name if session.course else "",
        "topic": session.topic_covered or "",
        "faculty_name": f"{session.faculty.first_name} {session.faculty.last_name or ''}".strip() if session.faculty else "",
        "session_date": session.session_date,
    }


@router.post("/attendance/sessions/{session_id}/records")
def mark_attendance_endpoint(
    session_id: str,
    data: BulkAttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.bulk_mark_attendance(db, session_id, data, current_user)


@router.post("/attendance/sessions/{session_id}/close", response_model=AttendanceSessionResponse)
def close_session_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = service.close_attendance_session(db, session_id, current_user)
    return AttendanceSessionResponse(
        id=sess.id,
        course_id=sess.course_id,
        course_code=sess.course.course_code if sess.course else None,
        course_name=sess.course.name if sess.course else None,
        faculty_id=sess.faculty_id,
        faculty_name=f"{sess.faculty.first_name} {sess.faculty.last_name}" if sess.faculty else None,
        schedule_id=sess.schedule_id,
        session_date=sess.session_date,
        start_time=sess.start_time,
        end_time=sess.end_time,
        topic_covered=sess.topic_covered,
        status=sess.status,
        created_at=sess.created_at,
        updated_at=sess.updated_at,
    )


# -------------------------------------------------------------
# ATTENDANCE CORRECTIONS ENDPOINTS
# -------------------------------------------------------------
@router.post("/attendance/corrections", response_model=AttendanceCorrectionResponse, status_code=status.HTTP_201_CREATED)
def create_correction_endpoint(
    data: AttendanceCorrectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = service.request_attendance_correction(db, data, current_user)
    record = c.record
    session = record.session
    return AttendanceCorrectionResponse(
        id=c.id,
        record_id=c.record_id,
        session_id=session.id,
        session_date=session.session_date,
        course_code=session.course.course_code if session.course else None,
        course_name=session.course.name if session.course else None,
        student_id=record.student_id,
        student_name=f"{record.student.first_name} {record.student.last_name}" if record.student else None,
        original_status=c.original_status,
        requested_status=c.requested_status,
        reason=c.reason,
        requested_by=c.requested_by,
        requester_name=f"{c.requester.first_name} {c.requester.last_name}" if c.requester else None,
        requested_at=c.requested_at,
        approval_status=c.approval_status,
        created_at=c.created_at,
    )


@router.get("/hod/attendance/pending-corrections", response_model=List[AttendanceCorrectionResponse])
def get_pending_corrections_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name not in ["HOD", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    query = db.query(AttendanceCorrection).filter(AttendanceCorrection.approval_status == CorrectionStatus.PENDING)
    if current_user.role.name == "HOD":
        query = query.join(AttendanceRecord).join(AttendanceSession).join(AttendanceSession.course).filter(
            AttendanceSession.course.has(department_id=current_user.department_id)
        )

    corrections = query.order_by(AttendanceCorrection.created_at.desc()).all()
    res = []
    for c in corrections:
        rec = c.record
        sess = rec.session
        res.append(
            AttendanceCorrectionResponse(
                id=c.id,
                record_id=c.record_id,
                session_id=sess.id,
                session_date=sess.session_date,
                course_code=sess.course.course_code if sess.course else None,
                course_name=sess.course.name if sess.course else None,
                student_id=rec.student_id,
                student_name=f"{rec.student.first_name} {rec.student.last_name}" if rec.student else None,
                original_status=c.original_status,
                requested_status=c.requested_status,
                reason=c.reason,
                requested_by=c.requested_by,
                requester_name=f"{c.requester.first_name} {c.requester.last_name}" if c.requester else None,
                requested_at=c.requested_at,
                reviewed_by=c.reviewed_by,
                reviewer_name=f"{c.reviewer.first_name} {c.reviewer.last_name}" if c.reviewer else None,
                reviewed_at=c.reviewed_at,
                review_notes=c.review_notes,
                approval_status=c.approval_status,
                created_at=c.created_at,
            )
        )
    return res


@router.patch("/attendance/corrections/{correction_id}", response_model=AttendanceCorrectionResponse)
def review_correction_endpoint(
    correction_id: str,
    data: AttendanceCorrectionReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = service.review_attendance_correction(db, correction_id, data, current_user)
    rec = c.record
    sess = rec.session
    return AttendanceCorrectionResponse(
        id=c.id,
        record_id=c.record_id,
        session_id=sess.id,
        session_date=sess.session_date,
        course_code=sess.course.course_code if sess.course else None,
        course_name=sess.course.name if sess.course else None,
        student_id=rec.student_id,
        student_name=f"{rec.student.first_name} {rec.student.last_name}" if rec.student else None,
        original_status=c.original_status,
        requested_status=c.requested_status,
        reason=c.reason,
        requested_by=c.requested_by,
        requester_name=f"{c.requester.first_name} {c.requester.last_name}" if c.requester else None,
        requested_at=c.requested_at,
        reviewed_by=c.reviewed_by,
        reviewer_name=f"{c.reviewer.first_name} {c.reviewer.last_name}" if c.reviewer else None,
        reviewed_at=c.reviewed_at,
        review_notes=c.review_notes,
        approval_status=c.approval_status,
        created_at=c.created_at,
    )


# -------------------------------------------------------------
# STUDENT DASHBOARD & ANALYTICS ENDPOINTS
# -------------------------------------------------------------
@router.get("/students/me/attendance", response_model=StudentAttendanceDashboard)
def get_my_attendance_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name != "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can access self attendance dashboard.")
    return service.get_student_attendance_dashboard(db, current_user.id, current_user)


@router.get("/students/{student_id}/attendance", response_model=StudentAttendanceDashboard)
def get_student_attendance_endpoint(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_student_attendance_dashboard(db, student_id, current_user)


@router.get("/students/{student_id}/engagement-score", response_model=AcademicEngagementScore)
def get_student_engagement_score_endpoint(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.calculate_academic_engagement_score(db, student_id, current_user)


# -------------------------------------------------------------
# FACULTY, HOD & VC ANALYTICS ENDPOINTS
# -------------------------------------------------------------
@router.get("/courses/{course_id}/attendance-analytics", response_model=FacultyAttendanceAnalytics)
def get_course_attendance_analytics_endpoint(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_faculty_attendance_analytics(db, course_id, current_user)


@router.get("/hod/attendance/analytics", response_model=HODDepartmentAttendanceAnalytics)
def get_hod_attendance_analytics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_hod_department_attendance_analytics(db, current_user)


@router.get("/vc/attendance/analytics", response_model=VCInstitutionAttendanceAnalytics)
def get_vc_attendance_analytics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_vc_attendance_analytics(db, current_user)


# -------------------------------------------------------------
# ATTENDANCE CSV EXPORT ENDPOINT
# -------------------------------------------------------------
@router.get("/courses/{course_id}/attendance/export-csv")
def export_course_attendance_csv_endpoint(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name not in ["FACULTY", "HOD", "ADMINISTRATOR", "VC"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to export attendance data.")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    records = db.query(AttendanceRecord).join(AttendanceSession).filter(AttendanceSession.course_id == course_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Session Date", "Course Code", "Student ID", "Student Name", "Student Email", "Status", "Minutes Late", "Remarks"])

    for r in records:
        writer.writerow([
            r.session.session_date.isoformat(),
            course.course_code,
            r.student.student_identifier or r.student_id,
            f"{r.student.first_name} {r.student.last_name}",
            r.student.email,
            r.status,
            r.minutes_late,
            r.remarks or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{course.course_code}.csv"},
    )
