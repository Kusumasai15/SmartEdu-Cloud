"""REST API Router for Academic Intelligence, Risk Analytics & AI Insights."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.intelligence import service
from app.intelligence.schemas import (
    StudentIntelligenceResponse,
    CourseHealthIntelligence,
    DepartmentIntelligenceResponse,
    VCInstitutionalIntelligenceResponse,
    FlashcardDeckRequest,
    FlashcardDeckResponse,
    GenerateMcqRequest,
    GenerateMcqResponse,
    TutorChatRequest,
    TutorChatResponse,
)
from app.intelligence.ai.insight_service import AcademicAIInsightService

router = APIRouter(prefix="/intelligence", tags=["Academic Intelligence & Early-Warning"])


# -------------------------------------------------------------
# STUDENT ACADEMIC INTELLIGENCE & INSIGHTS
# -------------------------------------------------------------
@router.get("/student/me", response_model=StudentIntelligenceResponse)
def get_my_academic_intelligence_endpoint(
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Student retrieves their own derived academic health profile, risk score, and AI study insights."""
    return service.get_student_intelligence_profile(db, current_user.id, current_user, semester_id)


@router.get("/student/{student_id}", response_model=StudentIntelligenceResponse)
def get_student_academic_intelligence_endpoint(
    student_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HOD/Admin retrieves a student's academic intelligence profile (IDOR protected)."""
    return service.get_student_intelligence_profile(db, student_id, current_user, semester_id)


# -------------------------------------------------------------
# FACULTY COURSE INTELLIGENCE & HEALTH
# -------------------------------------------------------------
@router.get("/courses/{course_id}", response_model=CourseHealthIntelligence)
def get_course_intelligence_endpoint(
    course_id: str,
    semester_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty retrieves course health indicators, difficult topics, and AI teaching summary."""
    return service.get_faculty_course_intelligence(db, course_id, current_user, semester_id)


# -------------------------------------------------------------
# HOD DEPARTMENT INTELLIGENCE & AT-RISK ROSTER
# -------------------------------------------------------------
@router.get("/hod/departments/{department_id}", response_model=DepartmentIntelligenceResponse)
def get_department_intelligence_endpoint(
    department_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HOD retrieves department-wide academic health, course comparison, and early-warning at-risk roster."""
    return service.get_hod_department_intelligence(db, department_id, current_user)


# -------------------------------------------------------------
# VC INSTITUTIONAL ACADEMIC INTELLIGENCE
# -------------------------------------------------------------
@router.get("/vc/institution", response_model=VCInstitutionalIntelligenceResponse)
def get_vc_institutional_intelligence_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vice Chancellor retrieves university-wide aggregate risk distribution and department health rankings."""
    return service.get_vc_institutional_intelligence(db, current_user)


# -------------------------------------------------------------
# AI STUDY FLASHCARDS & CURRICULUM DECKS
# -------------------------------------------------------------
@router.post("/flashcards/generate", response_model=FlashcardDeckResponse)
def generate_study_flashcards_endpoint(
    req: FlashcardDeckRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate structured study flashcard deck matching curriculum standards."""
    cards, is_ai = AcademicAIInsightService.generate_topic_flashcards(
        course_code=req.course_code,
        course_title=req.course_title or "Course Curriculum",
        unit_title=req.unit_title or "Unit I",
        topic_title=req.topic_title,
        syllabus_context=req.syllabus_context,
    )
    return FlashcardDeckResponse(
        topic_title=req.topic_title,
        deck_title=f"{req.topic_title} Study Deck",
        cards=cards,
        is_ai_generated=is_ai,
    )


# -------------------------------------------------------------
# ADAPTIVE SYLLABUS PRACTICE MCQS
# -------------------------------------------------------------
@router.post("/practice/generate", response_model=GenerateMcqResponse)
def generate_practice_mcqs_endpoint(
    req: GenerateMcqRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate multiple adaptive practice MCQs for syllabus session."""
    questions, is_ai = AcademicAIInsightService.generate_topic_practice_mcqs(
        course_code=req.course_code,
        course_title=req.course_title or "Course Curriculum",
        topic_title=req.topic_title,
        count=req.count,
    )
    return GenerateMcqResponse(
        course_code=req.course_code,
        topic_title=req.topic_title,
        questions=questions,
        is_ai_generated=is_ai,
    )


# -------------------------------------------------------------
# IN-PLAYER AI ACADEMIC TUTOR
# -------------------------------------------------------------
@router.post("/tutor/chat", response_model=TutorChatResponse)
def academic_tutor_chat_endpoint(
    req: TutorChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Interactive pedagogical conversation with AI Tutor grounded in the current topic."""
    hist = [h.model_dump() for h in (req.history or [])]
    reply, followups, is_ai = AcademicAIInsightService.generate_tutor_response(
        course_code=req.course_code,
        course_title=req.course_title or "Course Curriculum",
        current_topic=req.current_topic,
        unit_title=req.unit_title,
        message=req.message,
        history=hist,
    )
    return TutorChatResponse(
        reply=reply,
        suggested_followups=followups,
        is_ai_generated=is_ai,
    )

