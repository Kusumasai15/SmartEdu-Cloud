"""REST API Router for Academic Results, Gradebook, GPA, Transcripts & Analytics."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.result import ResultStatus, CorrectionRequestStatus
from app.results import service
from app.results.schemas import (
    GradeScaleCreate,
    GradeScaleResponse,
    CourseAssessmentWeightSetRequest,
    CourseAssessmentWeightResponse,
    CourseGradebookResponse,
    CourseResultResponse,
    ResultReviewRequest,
    ResultCorrectionCreate,
    ResultCorrectionResponse,
    OfficialStudentTranscriptResponse,
    CourseResultAnalytics,
    DepartmentResultAnalytics,
    VCInstitutionResultAnalytics,
)

router = APIRouter(prefix="/results", tags=["Results & Transcripts"])


# -------------------------------------------------------------
# GRADE SCALES & CONFIGURATION
# -------------------------------------------------------------
@router.post("/grade-scales", response_model=GradeScaleResponse, status_code=status.HTTP_201_CREATED)
def create_grade_scale_endpoint(
    data: GradeScaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Administrator creates a custom institutional grade scale."""
    scale = service.create_grade_scale(db, data, current_user)
    return scale


@router.get("/grade-scales/default", response_model=GradeScaleResponse)
def get_default_grade_scale_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve active default institutional grade scale."""
    scale = service.get_or_create_default_grade_scale(db)
    return scale


# -------------------------------------------------------------
# COURSE ASSESSMENT WEIGHTS
# -------------------------------------------------------------
@router.post("/weights", response_model=List[CourseAssessmentWeightResponse])
def set_course_weights_endpoint(
    data: CourseAssessmentWeightSetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Configure assessment component weight distribution (strictly must sum to 100%)."""
    return service.set_course_assessment_weights(db, data, current_user)


# -------------------------------------------------------------
# GRADEBOOK & RESULT LIFECYCLE
# -------------------------------------------------------------
@router.get("/courses/{course_id}/gradebook", response_model=CourseGradebookResponse)
def get_course_gradebook_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve course gradebook with component scores, normalized marks, and missing marks."""
    return service.get_course_gradebook(db, course_id, semester_id, current_user)


@router.post("/courses/{course_id}/calculate", response_model=List[CourseResultResponse])
def calculate_course_results_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute authoritative calculation engine across enrolled students."""
    results = service.calculate_and_save_course_results(db, course_id, semester_id, current_user)
    return results


@router.post("/courses/{course_id}/submit")
def submit_course_results_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty transitions calculated results to SUBMITTED for HOD review."""
    count = service.submit_course_results(db, course_id, semester_id, current_user)
    return {"message": f"Successfully submitted {count} results for HOD review.", "submitted_count": count}


@router.post("/courses/{course_id}/review")
def review_course_results_endpoint(
    course_id: str,
    data: ResultReviewRequest,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HOD reviews submitted course results and APPROVES or REJECTS."""
    count = service.review_course_results(db, course_id, semester_id, data, current_user)
    return {"message": f"Results reviewed. Status: {data.approval_status.value}", "reviewed_count": count}


@router.post("/courses/{course_id}/publish")
def publish_course_results_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish approved course results for student dashboard access."""
    count = service.publish_course_results(db, course_id, semester_id, current_user)
    return {"message": f"Successfully published {count} course results.", "published_count": count}


@router.post("/courses/{course_id}/lock")
def lock_course_results_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lock published results against direct mutation (enforces formal correction workflow)."""
    count = service.lock_course_results(db, course_id, semester_id, current_user)
    return {"message": f"Successfully locked {count} results.", "locked_count": count}


# -------------------------------------------------------------
# RESULT CORRECTIONS
# -------------------------------------------------------------
@router.post("/corrections", response_model=ResultCorrectionResponse, status_code=status.HTTP_201_CREATED)
def request_result_correction_endpoint(
    data: ResultCorrectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty initiates formal audit request to modify a published/locked student result."""
    corr = service.request_result_correction(db, data, current_user)
    return corr


@router.patch("/corrections/{correction_id}", response_model=ResultCorrectionResponse)
def review_result_correction_endpoint(
    correction_id: str,
    data: ResultReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HOD reviews and approves/rejects result correction request."""
    corr = service.review_result_correction(db, correction_id, data, current_user)
    return corr


# -------------------------------------------------------------
# STUDENT OFFICIAL TRANSCRIPTS
# -------------------------------------------------------------
@router.get("/students/me/transcript", response_model=OfficialStudentTranscriptResponse)
def get_my_transcript_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Student retrieves their own official academic transcript."""
    return service.get_student_official_transcript(db, current_user.id, current_user)


@router.get("/students/{student_id}/transcript", response_model=OfficialStudentTranscriptResponse)
def get_student_transcript_endpoint(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HOD/Admin retrieves a student's official academic transcript (IDOR protected)."""
    return service.get_student_official_transcript(db, student_id, current_user)


# -------------------------------------------------------------
# ANALYTICS ENDPOINTS
# -------------------------------------------------------------
@router.get("/courses/{course_id}/analytics", response_model=CourseResultAnalytics)
def get_course_analytics_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve course result analytics, pass rates, and grade distribution."""
    return service.get_course_result_analytics(db, course_id, semester_id, current_user)


@router.get("/hod/departments/{department_id}/analytics", response_model=DepartmentResultAnalytics)
def get_department_analytics_endpoint(
    department_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Department-level result metrics and pending approvals count for HOD."""
    return service.get_department_result_analytics(db, department_id, current_user)


@router.get("/vc/institution/analytics", response_model=VCInstitutionResultAnalytics)
def get_vc_institution_analytics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vice Chancellor institution-wide aggregated performance KPIs."""
    return service.get_vc_institution_result_analytics(db, current_user)
