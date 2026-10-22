"""Academic Intelligence, Risk Engine, and Early-Warning Service Layer."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.semester import Semester
from app.models.department import Department
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.academic_intelligence import (
    AcademicRiskSnapshot,
    RiskConfiguration,
    InsightAlert,
    AcademicRiskLevel,
    PerformanceTrendDirection,
    CourseHealthStatus,
)
from app.intelligence.schemas import (
    StudentPerformanceProfile,
    StudentIntelligenceResponse,
    CourseHealthIntelligence,
    DepartmentIntelligenceResponse,
    AtRiskStudentRosterItem,
    VCInstitutionalIntelligenceResponse,
)
from app.intelligence.calculations import (
    AcademicDataAggregator,
    PerformanceTrendEngine,
    AcademicRiskEngine,
    CourseHealthEngine,
)
from app.intelligence.ai.insight_service import AcademicAIInsightService


# -------------------------------------------------------------
# STUDENT INTELLIGENCE & PERFORMANCE PROFILE
# -------------------------------------------------------------
def get_student_intelligence_profile(
    db: Session,
    student_id: str,
    current_user: User,
    semester_id: Optional[str] = None,
) -> StudentIntelligenceResponse:
    """Retrieve derived academic health profile, explainable risk score, recommendations, and AI study insights."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    # Scoping check: Student self-scope, HOD same department, Admin, VC
    if current_user.role.name == "STUDENT" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own academic intelligence.")
    elif current_user.role.name == "HOD" and student.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view intelligence for own department students.")

    # 1. Aggregate metrics
    metrics = AcademicDataAggregator.aggregate_student_metrics(db, student_id, semester_id)

    # 2. Evaluate performance trend
    trend, trend_desc = PerformanceTrendEngine.evaluate_trend(
        db,
        student_id,
        metrics["current_gpa"],
        metrics["attendance_percentage"],
    )

    # 3. Compute deterministic risk score & explainable factors
    risk_score, risk_level, factors = AcademicRiskEngine.calculate_risk_profile(metrics, trend)

    # 4. Generate deterministic recommendations
    recs = AcademicRiskEngine.generate_recommendations(metrics, factors)

    # 5. Generate AI / Rule-based study advice
    ai_text, is_ai = AcademicAIInsightService.generate_student_study_insights(metrics, trend_desc)

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 6. Academic Standing
    standing = "GOOD_STANDING"
    if metrics["cumulative_gpa"] >= 8.5 and metrics["failed_courses_count"] == 0:
        standing = "DEAN_LIST"
    elif metrics["cumulative_gpa"] < 5.0 or metrics["failed_courses_count"] >= 2:
        standing = "PROBATION"

    # Persist or update risk snapshot
    sem = db.query(Semester).first()
    sem_id = semester_id or (sem.id if sem else "sem_default")

    snapshot = db.query(AcademicRiskSnapshot).filter(
        AcademicRiskSnapshot.student_id == student_id,
        AcademicRiskSnapshot.snapshot_date == today_str,
    ).first()

    factors_serialized = "; ".join([f"{f.factor_name}: {f.reason}" for f in factors])

    if not snapshot:
        snapshot = AcademicRiskSnapshot(
            student_id=student_id,
            semester_id=sem_id,
            risk_score=risk_score,
            risk_level=risk_level,
            performance_trend=trend,
            current_gpa=metrics["current_gpa"],
            cumulative_gpa=metrics["cumulative_gpa"],
            attendance_percentage=metrics["attendance_percentage"],
            assignment_completion_rate=metrics["assignment_completion_rate"],
            exam_average_percentage=metrics["exam_average_percentage"],
            failed_courses_count=metrics["failed_courses_count"],
            primary_risk_factors=factors_serialized,
            snapshot_date=today_str,
        )
        db.add(snapshot)
    else:
        snapshot.risk_score = risk_score
        snapshot.risk_level = risk_level
        snapshot.performance_trend = trend
        snapshot.current_gpa = metrics["current_gpa"]
        snapshot.cumulative_gpa = metrics["cumulative_gpa"]
        snapshot.attendance_percentage = metrics["attendance_percentage"]
        snapshot.assignment_completion_rate = metrics["assignment_completion_rate"]
        snapshot.exam_average_percentage = metrics["exam_average_percentage"]
        snapshot.failed_courses_count = metrics["failed_courses_count"]
        snapshot.primary_risk_factors = factors_serialized

    # 7. Deduplicated Early Warning Alert
    if risk_level in [AcademicRiskLevel.HIGH, AcademicRiskLevel.CRITICAL]:
        dedup = f"risk_alert_{student_id}_{today_str}_{risk_level.value}"
        existing_alert = db.query(InsightAlert).filter(InsightAlert.dedup_key == dedup).first()
        if not existing_alert:
            alert = InsightAlert(
                user_id=student_id,
                alert_type="ACADEMIC_RISK_WARNING",
                title=f"Academic Alert: {risk_level.value} Risk Detected",
                message=f"Your academic risk level has been flagged as {risk_level.value}. Primary reason: {factors[0].reason if factors else 'Multiple metric thresholds'}",
                dedup_key=dedup,
            )
            db.add(alert)

    db.commit()

    dept_name = student.department.name if student.department else "Computer Science"

    profile = StudentPerformanceProfile(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        student_identifier=student.student_identifier or "STU-2026-001",
        department_name=dept_name,
        current_gpa=metrics["current_gpa"],
        cumulative_gpa=metrics["cumulative_gpa"],
        attendance_percentage=metrics["attendance_percentage"],
        assignment_completion_rate=metrics["assignment_completion_rate"],
        exam_average_percentage=metrics["exam_average_percentage"],
        total_courses_registered=metrics["total_courses_registered"],
        total_courses_passed=metrics["total_courses_passed"],
        failed_courses_count=metrics["failed_courses_count"],
        performance_trend=trend,
        trend_description=trend_desc,
        risk_score=risk_score,
        risk_level=risk_level,
        primary_risk_factors=factors,
        academic_standing=standing,
        snapshot_date=today_str,
    )

    return StudentIntelligenceResponse(
        profile=profile,
        recommendations=recs,
        ai_study_insights=ai_text,
        is_ai_generated=is_ai,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    )


# -------------------------------------------------------------
# FACULTY COURSE INTELLIGENCE
# -------------------------------------------------------------
def get_faculty_course_intelligence(
    db: Session,
    course_id: str,
    current_user: User,
    semester_id: Optional[str] = None,
) -> CourseHealthIntelligence:
    """Evaluate course health, difficult modules, and AI teaching insights for faculty."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    # Scoping check
    if current_user.role.name == "FACULTY":
        is_assigned = db.query(CourseInstructor).filter(
            CourseInstructor.course_id == course_id,
            CourseInstructor.faculty_id == current_user.id,
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view intelligence for this course.")
    elif current_user.role.name == "HOD" and course.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view courses in own department.")

    # Evaluate deterministic health
    course_health = CourseHealthEngine.evaluate_course_health(db, course_id, semester_id)

    # Generate AI summary
    summary_text, is_ai = AcademicAIInsightService.generate_course_summary_insights(course_health.model_dump())
    course_health.ai_course_summary = summary_text
    course_health.is_ai_generated = is_ai

    return course_health


# -------------------------------------------------------------
# HOD DEPARTMENT INTELLIGENCE
# -------------------------------------------------------------
def get_hod_department_intelligence(
    db: Session,
    department_id: str,
    current_user: User,
) -> DepartmentIntelligenceResponse:
    """Department-level intelligence, course comparison, and at-risk student roster for HOD."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    if current_user.role.name == "HOD" and current_user.department_id != department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only view own department intelligence.")

    courses = db.query(Course).filter(Course.department_id == department_id).all()
    courses_health = [CourseHealthEngine.evaluate_course_health(db, c.id) for c in courses]

    # Department students
    students = db.query(User).filter(
        User.department_id == department_id,
        User.role.has(name="STUDENT"),
    ).all()

    at_risk_roster: List[AtRiskStudentRosterItem] = []
    critical_count = 0
    high_count = 0
    total_gpa_weighted = 0.0
    total_att_weighted = 0.0

    for s in students:
        metrics = AcademicDataAggregator.aggregate_student_metrics(db, s.id)
        trend, _ = PerformanceTrendEngine.evaluate_trend(db, s.id, metrics["current_gpa"], metrics["attendance_percentage"])
        risk_score, risk_lvl, factors = AcademicRiskEngine.calculate_risk_profile(metrics, trend)

        total_gpa_weighted += metrics["current_gpa"]
        total_att_weighted += metrics["attendance_percentage"]

        if risk_lvl in [AcademicRiskLevel.HIGH, AcademicRiskLevel.CRITICAL]:
            if risk_lvl == AcademicRiskLevel.CRITICAL:
                critical_count += 1
            else:
                high_count += 1

            at_risk_roster.append(
                AtRiskStudentRosterItem(
                    student_id=s.id,
                    student_name=f"{s.first_name} {s.last_name}",
                    student_identifier=s.student_identifier or "STU-2026",
                    risk_level=risk_lvl,
                    risk_score=risk_score,
                    current_gpa=metrics["current_gpa"],
                    attendance_percentage=metrics["attendance_percentage"],
                    primary_reasons=[f.reason for f in factors],
                )
            )

    total_stud = len(students)
    avg_gpa = round(total_gpa_weighted / total_stud, 2) if total_stud > 0 else 8.0
    avg_att = round(total_att_weighted / total_stud, 2) if total_stud > 0 else 90.0
    avg_pass = round(sum(ch.pass_rate for ch in courses_health) / len(courses_health), 1) if courses_health else 85.0

    return DepartmentIntelligenceResponse(
        department_id=dept.id,
        department_name=dept.name,
        total_students=total_stud,
        total_courses=len(courses),
        department_average_gpa=avg_gpa,
        department_pass_rate=avg_pass,
        department_average_attendance=avg_att,
        at_risk_students_count=len(at_risk_roster),
        critical_risk_count=critical_count,
        high_risk_count=high_count,
        at_risk_roster=at_risk_roster,
        courses_health=courses_health,
    )


# -------------------------------------------------------------
# VC INSTITUTIONAL INTELLIGENCE
# -------------------------------------------------------------
def get_vc_institutional_intelligence(
    db: Session,
    current_user: User,
) -> VCInstitutionalIntelligenceResponse:
    """Vice Chancellor university-wide academic risk distribution and departmental rankings."""
    if current_user.role.name not in ["VC", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VC or Administrator access required.")

    departments = db.query(Department).all()
    dept_rankings = []
    total_students = 0
    total_at_risk = 0
    total_gpa_weighted = 0.0
    total_pass_weighted = 0.0
    total_att_weighted = 0.0
    risk_distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}

    for d in departments:
        ana = get_hod_department_intelligence(db, d.id, current_user)
        dept_rankings.append({
            "department_id": d.id,
            "department_name": d.name,
            "department_code": d.code,
            "average_gpa": ana.department_average_gpa,
            "pass_rate": ana.department_pass_rate,
            "average_attendance": ana.department_average_attendance,
            "at_risk_count": ana.at_risk_students_count,
            "total_courses": ana.total_courses,
        })
        total_students += ana.total_students
        total_at_risk += ana.at_risk_students_count
        total_gpa_weighted += (ana.department_average_gpa * ana.total_students)
        total_pass_weighted += (ana.department_pass_rate * ana.total_students)
        total_att_weighted += (ana.department_average_attendance * ana.total_students)

        risk_distribution["CRITICAL"] += ana.critical_risk_count
        risk_distribution["HIGH"] += ana.high_risk_count
        risk_distribution["MEDIUM"] += max(0, ana.at_risk_students_count - ana.high_risk_count - ana.critical_risk_count)
        risk_distribution["LOW"] += max(0, ana.total_students - ana.at_risk_students_count)

    inst_gpa = round(total_gpa_weighted / total_students, 2) if total_students > 0 else 0.0
    inst_pass = round(total_pass_weighted / total_students, 2) if total_students > 0 else 0.0
    inst_att = round(total_att_weighted / total_students, 2) if total_students > 0 else 0.0

    return VCInstitutionalIntelligenceResponse(
        institution_average_gpa=inst_gpa,
        institution_pass_rate=inst_pass,
        institution_average_attendance=inst_att,
        total_students=total_students,
        total_at_risk_students=total_at_risk,
        risk_distribution=risk_distribution,
        department_health_rankings=dept_rankings,
        institutional_trends={},
    )
