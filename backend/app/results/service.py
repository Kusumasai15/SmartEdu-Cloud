"""Academic Results, Gradebook, GPA, and Transcript Service Layer."""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.semester import Semester
from app.models.department import Department
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.lms.service import LMSService
from app.models.assignment import Assignment, AssignmentStatus
from app.models.assignment_submission import AssignmentSubmission, SubmissionStatus
from app.models.exam import Exam
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceSession
from app.models.result import (
    GradeScale,
    GradeScaleItem,
    CourseAssessmentWeight,
    CourseResult,
    ResultComponentScore,
    ResultCorrectionRequest,
    SemesterResult,
    ResultStatus,
    AcademicStatus,
    CorrectionRequestStatus,
    AssessmentComponentType,
)
from app.results.schemas import (
    GradeScaleCreate,
    CourseAssessmentWeightSetRequest,
    CourseGradebookResponse,
    StudentGradebookRow,
    ResultComponentScoreResponse,
    CourseResultResponse,
    ResultReviewRequest,
    ResultCorrectionCreate,
    OfficialStudentTranscriptResponse,
    SemesterTranscriptSection,
    CourseResultAnalytics,
    DepartmentResultAnalytics,
    VCInstitutionResultAnalytics,
)
from app.results.calculations import ResultCalculationEngine


# -------------------------------------------------------------
# GRADE SCALE & CONFIGURATION MANAGEMENT
# -------------------------------------------------------------
def get_or_create_default_grade_scale(db: Session) -> GradeScale:
    """Ensure a standard institutional 10-point grade scale exists."""
    scale = db.query(GradeScale).filter(GradeScale.is_default == True).first()
    if not scale:
        scale = GradeScale(
            name="Standard Institutional 10-Point Scale",
            description="University standard 10-point letter grading scale",
            is_active=True,
            is_default=True,
        )
        db.add(scale)
        db.flush()

        for item_data in ResultCalculationEngine.DEFAULT_GRADE_SCALE:
            item = GradeScaleItem(
                grade_scale_id=scale.id,
                grade=item_data["grade"],
                minimum_percentage=item_data["minimum_percentage"],
                maximum_percentage=item_data["maximum_percentage"],
                grade_point=item_data["grade_point"],
                is_passing=item_data["is_passing"],
                description=item_data["description"],
            )
            db.add(item)
        db.commit()
        db.refresh(scale)
    return scale


def create_grade_scale(db: Session, data: GradeScaleCreate, current_user: User) -> GradeScale:
    """Administrator provisions a custom institutional grade scale."""
    if current_user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can configure grade scales.")

    existing = db.query(GradeScale).filter(GradeScale.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A grade scale with this name already exists.")

    if data.is_default:
        db.query(GradeScale).filter(GradeScale.is_default == True).update({"is_default": False})

    scale = GradeScale(
        name=data.name,
        description=data.description,
        is_active=True,
        is_default=data.is_default,
    )
    db.add(scale)
    db.flush()

    for item_data in data.items:
        item = GradeScaleItem(
            grade_scale_id=scale.id,
            grade=item_data.grade,
            minimum_percentage=item_data.minimum_percentage,
            maximum_percentage=item_data.maximum_percentage,
            grade_point=item_data.grade_point,
            is_passing=item_data.is_passing,
            description=item_data.description,
        )
        db.add(item)

    db.commit()
    db.refresh(scale)
    return scale


# -------------------------------------------------------------
# COURSE ASSESSMENT WEIGHTS
# -------------------------------------------------------------
def set_course_assessment_weights(
    db: Session,
    data: CourseAssessmentWeightSetRequest,
    current_user: User,
) -> List[CourseAssessmentWeight]:
    """Configure assessment component weight distribution (strictly must sum to 100%)."""
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    # Scoping check
    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == data.course_id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to instruct this course.")
    elif current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only configure weights for own department.")
    elif current_user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to configure course weights.")

    # Validate weight sum == 100.0%
    total_weight = sum(item.weight_percentage for item in data.weights)
    if abs(total_weight - 100.0) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total assessment weights must sum to exactly 100%. Current sum: {total_weight}%",
        )

    # Delete existing weights for this course & semester
    db.query(CourseAssessmentWeight).filter(
        CourseAssessmentWeight.course_id == data.course_id,
        CourseAssessmentWeight.semester_id == data.semester_id,
    ).delete()

    created_weights = []
    for item in data.weights:
        w = CourseAssessmentWeight(
            course_id=data.course_id,
            semester_id=data.semester_id,
            component_type=item.component_type,
            weight_percentage=item.weight_percentage,
            minimum_passing_percentage=item.minimum_passing_percentage,
            is_mandatory=item.is_mandatory,
        )
        db.add(w)
        created_weights.append(w)

    db.commit()
    return created_weights


def get_or_init_default_course_weights(db: Session, course_id: str, semester_id: str) -> List[CourseAssessmentWeight]:
    """Retrieve configured weights or initialize standard 40% Assignment + 60% Final Exam defaults."""
    weights = db.query(CourseAssessmentWeight).filter(
        CourseAssessmentWeight.course_id == course_id,
        CourseAssessmentWeight.semester_id == semester_id,
    ).all()

    if not weights:
        # Create standard institutional defaults
        defaults = [
            CourseAssessmentWeight(
                course_id=course_id,
                semester_id=semester_id,
                component_type=AssessmentComponentType.ASSIGNMENT,
                weight_percentage=40.0,
                minimum_passing_percentage=40.0,
                is_mandatory=True,
            ),
            CourseAssessmentWeight(
                course_id=course_id,
                semester_id=semester_id,
                component_type=AssessmentComponentType.FINAL_EXAM,
                weight_percentage=60.0,
                minimum_passing_percentage=40.0,
                is_mandatory=True,
            ),
        ]
        db.add_all(defaults)
        db.commit()
        weights = defaults
    return weights


# -------------------------------------------------------------
# GRADEBOOK & RESULT CALCULATION ENGINE
# -------------------------------------------------------------
def get_course_gradebook(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    current_user: User,
) -> CourseGradebookResponse:
    """Retrieve full course gradebook with component marks, normalized scores, and missing mark indicators."""
    course = LMSService.resolve_course(db, course_id)

    sem_id = semester_id or course.semester_id
    semester = db.query(Semester).filter(Semester.id == sem_id).first()

    # Scoping check
    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == course.id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            is_assigned = (course.department_id == current_user.department_id)
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this course gradebook.")
    elif current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view gradebooks for own department.")

    weights = get_or_init_default_course_weights(db, course.id, sem_id)
    scale = get_or_create_default_grade_scale(db)

    # Active enrolled students
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course.id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    # Pre-fetch existing course results
    existing_results = {
        r.student_id: r for r in db.query(CourseResult).filter(
            CourseResult.course_id == course.id,
        ).all()
    }

    # Fetch course assignments & exams
    assignments = db.query(Assignment).filter(Assignment.course_id == course.id).all()
    exams = db.query(Exam).filter(Exam.course_id == course.id).all()

    roster_rows: List[StudentGradebookRow] = []
    total_missing_marks = 0
    overall_status = ResultStatus.DRAFT

    for enr in enrollments:
        student = enr.student
        components: List[ResultComponentScoreResponse] = []
        missing_count = 0
        total_weighted_percentage = 0.0

        for w in weights:
            comp_type = w.component_type
            raw = 0.0
            max_s = 100.0
            is_miss = False

            if comp_type == AssessmentComponentType.ASSIGNMENT:
                if assignments:
                    # Average score across assignments
                    sub_scores = []
                    for a in assignments:
                        sub = db.query(AssignmentSubmission).filter(
                            AssignmentSubmission.assignment_id == a.id,
                            AssignmentSubmission.student_id == student.id,
                        ).first()
                        if sub and sub.score is not None:
                            sub_scores.append(ResultCalculationEngine.normalize_score(sub.score, a.max_points))
                    if sub_scores:
                        raw = sum(sub_scores) / len(sub_scores)
                    else:
                        is_miss = True
                else:
                    raw = 100.0  # No assignments defined, neutral full credit

            elif comp_type in [AssessmentComponentType.FINAL_EXAM, AssessmentComponentType.MIDTERM, AssessmentComponentType.QUIZ]:
                if exams:
                    exam_scores = []
                    for e in exams:
                        att = db.query(ExamAttempt).filter(
                            ExamAttempt.exam_id == e.id,
                            ExamAttempt.student_id == student.id,
                            ExamAttempt.status == AttemptStatus.SUBMITTED,
                        ).first()
                        if att and att.score is not None:
                            exam_scores.append(ResultCalculationEngine.normalize_score(att.score, e.total_marks))
                    if exam_scores:
                        raw = sum(exam_scores) / len(exam_scores)
                    else:
                        is_miss = True
                else:
                    raw = 100.0

            elif comp_type == AssessmentComponentType.ATTENDANCE:
                att_records = db.query(AttendanceRecord).join(AttendanceRecord.session).filter(
                    AttendanceSession.course_id == course_id,
                    AttendanceRecord.student_id == student.id,
                ).all()
                if att_records:
                    pres = sum(1 for r in att_records if r.status == AttendanceStatus.PRESENT)
                    raw = (pres / len(att_records)) * 100.0
                else:
                    raw = 100.0

            else:
                raw = 100.0

            if is_miss:
                missing_count += 1
                total_missing_marks += 1

            pct = round(raw, 2)
            weighted = ResultCalculationEngine.calculate_weighted_score(pct, w.weight_percentage)
            total_weighted_percentage += weighted

            components.append(
                ResultComponentScoreResponse(
                    id=f"comp_{student.id}_{comp_type.value}",
                    component_type=comp_type,
                    raw_score=pct,
                    max_score=max_s,
                    percentage=pct,
                    weight_percentage=w.weight_percentage,
                    weighted_score=weighted,
                    is_missing=is_miss,
                )
            )

        final_pct = round(total_weighted_percentage, 2)
        letter_grd, gp, is_pass = ResultCalculationEngine.resolve_grade_and_point(final_pct, scale.items)
        acad_status = AcademicStatus.PASS if is_pass else AcademicStatus.FAIL

        res = existing_results.get(student.id)
        current_status = res.status if res else ResultStatus.DRAFT
        if res:
            overall_status = res.status

        roster_rows.append(
            StudentGradebookRow(
                student_id=student.id,
                student_name=f"{student.first_name} {student.last_name}",
                student_email=student.email,
                student_identifier=student.student_identifier,
                components=components,
                final_percentage=final_pct,
                letter_grade=letter_grd,
                grade_point=gp,
                credits_earned=course.credits if is_pass else 0,
                status=current_status,
                academic_status=acad_status,
                missing_components_count=missing_count,
                result_id=res.id if res else None,
            )
        )

    return CourseGradebookResponse(
        course_id=course.id,
        course_code=course.course_code,
        course_name=course.name,
        semester_id=sem_id,
        semester_name=semester.name if semester else "Fall 2026",
        total_enrolled=len(enrollments),
        configured_weights=weights,
        roster=roster_rows,
        overall_status=overall_status,
        total_missing_marks=total_missing_marks,
    )


def calculate_and_save_course_results(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    current_user: User,
) -> List[CourseResult]:
    """Execute authoritative calculation engine across all enrolled students and persist CourseResult entities."""
    gradebook = get_course_gradebook(db, course_id, semester_id, current_user)
    course = db.query(Course).filter(Course.id == course_id).first()
    sem_id = semester_id or course.semester_id
    scale = get_or_create_default_grade_scale(db)

    results: List[CourseResult] = []
    for row in gradebook.roster:
        existing = db.query(CourseResult).filter(
            CourseResult.student_id == row.student_id,
            CourseResult.course_id == course_id,
            CourseResult.semester_id == sem_id,
        ).first()

        if existing and existing.status in [ResultStatus.PUBLISHED, ResultStatus.LOCKED]:
            # Locked results cannot be directly recalculated without formal correction
            results.append(existing)
            continue

        if not existing:
            res = CourseResult(
                student_id=row.student_id,
                course_id=course_id,
                semester_id=sem_id,
                final_percentage=row.final_percentage,
                letter_grade=row.letter_grade,
                grade_point=row.grade_point,
                credits_earned=course.credits if row.academic_status == AcademicStatus.PASS else 0,
                status=ResultStatus.CALCULATED,
                academic_status=row.academic_status,
                submitted_by=current_user.id,
            )
            db.add(res)
            db.flush()
        else:
            res = existing
            res.final_percentage = row.final_percentage
            res.letter_grade = row.letter_grade
            res.grade_point = row.grade_point
            res.credits_earned = course.credits if row.academic_status == AcademicStatus.PASS else 0
            res.status = ResultStatus.CALCULATED
            res.academic_status = row.academic_status

        # Update component breakdown records
        db.query(ResultComponentScore).filter(ResultComponentScore.result_id == res.id).delete()
        for comp in row.components:
            cs = ResultComponentScore(
                result_id=res.id,
                component_type=comp.component_type,
                raw_score=comp.raw_score,
                max_score=comp.max_score,
                percentage=comp.percentage,
                weight_percentage=comp.weight_percentage,
                weighted_score=comp.weighted_score,
                is_missing=comp.is_missing,
            )
            db.add(cs)

        results.append(res)

    db.commit()
    return results


# -------------------------------------------------------------
# LIFECYCLE: SUBMIT, REVIEW, PUBLISH & LOCK
# -------------------------------------------------------------
def submit_course_results(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    current_user: User,
) -> int:
    """Faculty transitions calculated results to SUBMITTED for departmental HOD review."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sem_id = semester_id or course.semester_id

    # Check assignment
    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == course_id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to submit results for this course.")

    # Ensure results exist in CALCULATED status
    results = db.query(CourseResult).filter(
        CourseResult.course_id == course_id,
        CourseResult.semester_id == sem_id,
        CourseResult.status.in_([ResultStatus.DRAFT, ResultStatus.CALCULATED]),
    ).all()

    if not results:
        # Run calculation first
        results = calculate_and_save_course_results(db, course_id, sem_id, current_user)

    now_iso = datetime.now(timezone.utc).isoformat()
    for r in results:
        r.status = ResultStatus.SUBMITTED
        r.submitted_by = current_user.id
        r.submitted_at = now_iso

    db.commit()
    return len(results)


def review_course_results(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    data: ResultReviewRequest,
    current_user: User,
) -> int:
    """HOD reviews submitted course results and approves or returns them."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sem_id = semester_id or course.semester_id

    if current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only review results for own department.")
    elif current_user.role.name not in ["ADMINISTRATOR", "VC"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to review course results.")

    results = db.query(CourseResult).filter(
        CourseResult.course_id == course_id,
        CourseResult.semester_id == sem_id,
        CourseResult.status == ResultStatus.SUBMITTED,
    ).all()

    if not results:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No submitted results found pending review.")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = ResultStatus.APPROVED if data.approval_status == CorrectionRequestStatus.APPROVED else ResultStatus.DRAFT

    for r in results:
        r.status = new_status
        r.approved_by = current_user.id
        r.approved_at = now_iso
        r.review_notes = data.review_notes

    db.commit()
    return len(results)


def publish_course_results(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    current_user: User,
) -> int:
    """Publish approved results so students can officially view them on dashboards."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sem_id = semester_id or course.semester_id

    if current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only publish results for own department.")
    elif current_user.role.name not in ["ADMINISTRATOR", "VC"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to publish course results.")

    results = db.query(CourseResult).filter(
        CourseResult.course_id == course_id,
        CourseResult.semester_id == sem_id,
        CourseResult.status == ResultStatus.APPROVED,
    ).all()

    if not results:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No approved results available to publish.")

    for r in results:
        r.status = ResultStatus.PUBLISHED

    # Also update semester result summary for each student
    for r in results:
        _update_student_semester_result(db, r.student_id, sem_id)

    db.commit()
    return len(results)


def lock_course_results(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    current_user: User,
) -> int:
    """Lock published course results against all direct modifications (enforces formal correction workflow)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sem_id = semester_id or course.semester_id

    if current_user.role.name not in ["ADMINISTRATOR", "HOD"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HOD or Administrator can lock results.")

    results = db.query(CourseResult).filter(
        CourseResult.course_id == course_id,
        CourseResult.semester_id == sem_id,
        CourseResult.status == ResultStatus.PUBLISHED,
    ).all()

    for r in results:
        r.status = ResultStatus.LOCKED

    db.commit()
    return len(results)


# -------------------------------------------------------------
# RESULT CORRECTION WORKFLOW
# -------------------------------------------------------------
def request_result_correction(
    db: Session,
    data: ResultCorrectionCreate,
    current_user: User,
) -> ResultCorrectionRequest:
    """Faculty initiates formal audit request to modify a published or locked student result."""
    result = db.query(CourseResult).filter(CourseResult.id == data.result_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result record not found.")

    course = result.course
    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == course.id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to request corrections for this course.")

    corr = ResultCorrectionRequest(
        result_id=result.id,
        student_id=result.student_id,
        course_id=result.course_id,
        original_grade=result.letter_grade,
        original_percentage=result.final_percentage,
        requested_grade=data.requested_grade,
        requested_percentage=data.requested_percentage,
        reason=data.reason,
        requested_by=current_user.id,
        requested_at=datetime.now(timezone.utc).isoformat(),
        status=CorrectionRequestStatus.PENDING,
    )
    db.add(corr)
    db.commit()
    db.refresh(corr)
    return corr


def review_result_correction(
    db: Session,
    correction_id: str,
    data: ResultReviewRequest,
    current_user: User,
) -> ResultCorrectionRequest:
    """HOD reviews and approves/rejects a result correction request."""
    corr = db.query(ResultCorrectionRequest).filter(ResultCorrectionRequest.id == correction_id).first()
    if not corr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction request not found.")

    course = corr.course
    if current_user.role.name == "HOD":
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only review corrections for own department.")
    elif current_user.role.name != "ADMINISTRATOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HOD or Administrator can review corrections.")

    corr.status = data.approval_status
    corr.reviewed_by = current_user.id
    corr.reviewed_at = datetime.now(timezone.utc).isoformat()
    corr.review_notes = data.review_notes

    # If APPROVED, apply modification to the authoritative CourseResult
    if data.approval_status == CorrectionRequestStatus.APPROVED:
        result = corr.course_result
        scale = get_or_create_default_grade_scale(db)
        letter_grd, gp, is_pass = ResultCalculationEngine.resolve_grade_and_point(corr.requested_percentage, scale.items)

        result.final_percentage = corr.requested_percentage
        result.letter_grade = letter_grd
        result.grade_point = gp
        result.credits_earned = course.credits if is_pass else 0
        result.academic_status = AcademicStatus.PASS if is_pass else AcademicStatus.FAIL

        # Recalculate student semester GPA
        _update_student_semester_result(db, result.student_id, result.semester_id)

    db.commit()
    db.refresh(corr)
    return corr


# -------------------------------------------------------------
# STUDENT TRANSCRIPT & GPA COMPILATION
# -------------------------------------------------------------
def get_student_official_transcript(
    db: Session,
    student_id: str,
    current_user: User,
) -> OfficialStudentTranscriptResponse:
    """Compile official student academic transcript containing finalized semester results and CGPA."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    # Scoping check: Student self-scope, HOD same department, Admin, VC
    if current_user.role.name == "STUDENT" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own transcript.")
    elif current_user.role.name == "HOD":
        if student.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view transcripts for own department students.")

    # Query all published and locked results
    results = db.query(CourseResult).filter(
        CourseResult.student_id == student_id,
        CourseResult.status.in_([ResultStatus.PUBLISHED, ResultStatus.LOCKED]),
    ).all()

    # Group by semester
    semesters_map: Dict[str, List[CourseResult]] = {}
    for r in results:
        semesters_map.setdefault(r.semester_id, []).append(r)

    all_course_entries = []
    semester_sections: List[SemesterTranscriptSection] = []
    total_passed = 0
    total_failed = 0

    # Fetch all semesters in chronological order
    semesters = db.query(Semester).order_by(Semester.start_date).all()
    for sem in semesters:
        sem_results = semesters_map.get(sem.id, [])
        if not sem_results:
            continue

        sem_entries = []
        for r in sem_results:
            is_pass = r.academic_status == AcademicStatus.PASS
            sem_entries.append({
                "credits": r.course.credits,
                "grade_point": r.grade_point,
                "is_passing": is_pass,
            })
            all_course_entries.append({
                "credits": r.course.credits,
                "grade_point": r.grade_point,
                "is_passing": is_pass,
            })
            if is_pass:
                total_passed += 1
            else:
                total_failed += 1

        sem_gpa, reg_cr, earn_cr = ResultCalculationEngine.calculate_gpa(sem_entries)

        # Convert to CourseResultResponse
        course_res_dtos = []
        for r in sem_results:
            course_res_dtos.append(
                CourseResultResponse(
                    id=r.id,
                    student_id=r.student_id,
                    student_name=f"{student.first_name} {student.last_name}",
                    student_identifier=student.student_identifier,
                    course_id=r.course_id,
                    course_code=r.course.course_code,
                    course_name=r.course.name,
                    semester_id=r.semester_id,
                    semester_name=sem.name,
                    final_percentage=r.final_percentage,
                    letter_grade=r.letter_grade,
                    grade_point=r.grade_point,
                    credits_earned=r.credits_earned,
                    status=r.status,
                    academic_status=r.academic_status,
                    submitted_by=r.submitted_by,
                    submitted_at=r.submitted_at,
                    approved_by=r.approved_by,
                    approved_at=r.approved_at,
                    review_notes=r.review_notes,
                    component_scores=[],
                    created_at=r.created_at,
                )
            )

        semester_sections.append(
            SemesterTranscriptSection(
                semester_id=sem.id,
                semester_name=sem.name,
                academic_year=sem.academic_year,
                total_credits_registered=reg_cr,
                total_credits_earned=earn_cr,
                semester_gpa=sem_gpa,
                courses=course_res_dtos,
            )
        )

    cgpa, total_reg_cr, total_earn_cr = ResultCalculationEngine.calculate_cgpa(all_course_entries)
    standing = ResultCalculationEngine.determine_academic_standing(cgpa, total_failed)

    dept_name = student.department.name if student.department else "Computer Science & Engineering"

    return OfficialStudentTranscriptResponse(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        student_email=student.email,
        student_identifier=student.student_identifier or "STU-2026-001",
        department_name=dept_name,
        program="Bachelor of Technology (B.Tech)",
        cumulative_gpa=cgpa,
        total_credits_registered=total_reg_cr,
        total_credits_earned=total_earn_cr,
        total_courses_passed=total_passed,
        total_courses_failed=total_failed,
        academic_standing=standing,
        semesters=semester_sections,
        issued_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    )


# -------------------------------------------------------------
# ANALYTICS & STATS HELPERS
# -------------------------------------------------------------
def get_course_result_analytics(
    db: Session,
    course_id: str,
    semester_id: Optional[str],
    current_user: User,
) -> CourseResultAnalytics:
    """Generate course result statistics, pass rates, and grade distribution histogram."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sem_id = semester_id or course.semester_id

    results = db.query(CourseResult).filter(
        CourseResult.course_id == course_id,
        CourseResult.semester_id == sem_id,
        CourseResult.status.in_([ResultStatus.PUBLISHED, ResultStatus.LOCKED, ResultStatus.APPROVED]),
    ).all()

    total = len(results)
    if total == 0:
        return CourseResultAnalytics(
            course_id=course.id,
            course_name=course.name,
            course_code=course.course_code,
            total_students=0,
            pass_percentage=0.0,
            fail_percentage=0.0,
            average_percentage=0.0,
            average_gpa=0.0,
            grade_distribution={},
            at_risk_students_count=0,
        )

    passed = sum(1 for r in results if r.academic_status == AcademicStatus.PASS)
    failed = total - passed
    avg_pct = round(sum(r.final_percentage for r in results) / total, 2)
    avg_gp = round(sum(r.grade_point for r in results) / total, 2)

    dist: Dict[str, int] = {}
    at_risk = 0
    for r in results:
        dist[r.letter_grade] = dist.get(r.letter_grade, 0) + 1
        if r.grade_point < 5.0 or r.academic_status == AcademicStatus.FAIL:
            at_risk += 1

    return CourseResultAnalytics(
        course_id=course.id,
        course_name=course.name,
        course_code=course.course_code,
        total_students=total,
        pass_percentage=round((passed / total) * 100.0, 2),
        fail_percentage=round((failed / total) * 100.0, 2),
        average_percentage=avg_pct,
        average_gpa=avg_gp,
        grade_distribution=dist,
        at_risk_students_count=at_risk,
    )


def get_department_result_analytics(
    db: Session,
    department_id: str,
    current_user: User,
) -> DepartmentResultAnalytics:
    """Department-level result metrics and pending approvals count."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    if current_user.role.name == "HOD" and current_user.department_id != department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view own department analytics.")

    courses = db.query(Course).filter(Course.department_id == department_id).all()
    courses_analytics = [get_course_result_analytics(db, c.id, None, current_user) for c in courses]

    pending_approvals = db.query(CourseResult).join(CourseResult.course).filter(
        Course.department_id == department_id,
        CourseResult.status == ResultStatus.SUBMITTED,
    ).count()

    total_evaluated = sum(ca.total_students for ca in courses_analytics)
    avg_gpa = round(sum(ca.average_gpa * ca.total_students for ca in courses_analytics) / total_evaluated, 2) if total_evaluated > 0 else 0.0
    avg_pass = round(sum(ca.pass_percentage * ca.total_students for ca in courses_analytics) / total_evaluated, 2) if total_evaluated > 0 else 0.0

    return DepartmentResultAnalytics(
        department_id=dept.id,
        department_name=dept.name,
        total_students=total_evaluated,
        total_courses=len(courses),
        department_average_gpa=avg_gpa,
        department_pass_rate=avg_pass,
        pending_approvals_count=pending_approvals,
        courses_analytics=courses_analytics,
    )


def get_vc_institution_result_analytics(
    db: Session,
    current_user: User,
) -> VCInstitutionResultAnalytics:
    """Vice Chancellor institution-wide aggregated performance KPIs."""
    if current_user.role.name not in ["VC", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VC or Administrator access required.")

    departments = db.query(Department).all()
    dept_rankings = []
    total_evaluated = 0
    total_gpa_weighted = 0.0
    total_pass_weighted = 0.0
    total_at_risk = 0
    overall_dist: Dict[str, int] = {}

    for d in departments:
        ana = get_department_result_analytics(db, d.id, current_user)
        dept_rankings.append({
            "department_id": d.id,
            "department_name": d.name,
            "department_code": d.code,
            "average_gpa": ana.department_average_gpa,
            "pass_rate": ana.department_pass_rate,
            "total_courses": ana.total_courses,
        })
        total_evaluated += ana.total_students
        total_gpa_weighted += (ana.department_average_gpa * ana.total_students)
        total_pass_weighted += (ana.department_pass_rate * ana.total_students)
        for ca in ana.courses_analytics:
            total_at_risk += ca.at_risk_students_count
            for gr, count in ca.grade_distribution.items():
                overall_dist[gr] = overall_dist.get(gr, 0) + count

    inst_gpa = round(total_gpa_weighted / total_evaluated, 2) if total_evaluated > 0 else 0.0
    inst_pass = round(total_pass_weighted / total_evaluated, 2) if total_evaluated > 0 else 0.0

    return VCInstitutionResultAnalytics(
        institution_average_gpa=inst_gpa,
        institution_pass_rate=inst_pass,
        total_students_evaluated=total_evaluated,
        total_courses_completed=db.query(Course).count(),
        total_at_risk_students=total_at_risk,
        department_rankings=dept_rankings,
        grade_distribution_overall=overall_dist,
    )


# -------------------------------------------------------------
# INTERNAL HELPER
# -------------------------------------------------------------
def _update_student_semester_result(db: Session, student_id: str, semester_id: str) -> SemesterResult:
    """Internal helper to aggregate semester GPA and credits earned."""
    results = db.query(CourseResult).filter(
        CourseResult.student_id == student_id,
        CourseResult.semester_id == semester_id,
        CourseResult.status.in_([ResultStatus.PUBLISHED, ResultStatus.LOCKED]),
    ).all()

    entries = [
        {"credits": r.course.credits, "grade_point": r.grade_point, "is_passing": r.academic_status == AcademicStatus.PASS}
        for r in results
    ]
    gpa, reg_cr, earn_cr = ResultCalculationEngine.calculate_gpa(entries)

    sem_res = db.query(SemesterResult).filter(
        SemesterResult.student_id == student_id,
        SemesterResult.semester_id == semester_id,
    ).first()

    if not sem_res:
        sem_res = SemesterResult(
            student_id=student_id,
            semester_id=semester_id,
            total_credits_registered=reg_cr,
            total_credits_earned=earn_cr,
            gpa=gpa,
            status="FINALIZED",
        )
        db.add(sem_res)
    else:
        sem_res.total_credits_registered = reg_cr
        sem_res.total_credits_earned = earn_cr
        sem_res.gpa = gpa
        sem_res.status = "FINALIZED"

    db.flush()
    return sem_res
