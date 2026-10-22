"""Assessment, Question Bank, Exams, and Proctoring REST API Router."""
from copy import deepcopy
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.auth.dependencies import get_current_user, get_current_active_user, require_permission, require_role
from app.models.user import User
from app.models.exam_attempt import ExamAttempt
from app.models.administration import SystemConfiguration
from app.assessments.schemas import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    TransactionalQuizCreate,
    AnswerSavePayload,
    AnswerResponse,
    ExamAttemptStartResponse,
    ExamAttemptSummaryResponse,
    ProctoringEventCreate,
    ProctoringEventBatchCreate,
    ProctoringEventResponse,
    ReviewAttemptPayload,
    FacultyProctoringDashboard,
)
from app.assessments.service import assessment_service

router = APIRouter(tags=["Assessment & Proctoring Engine"])


# -------------------------------------------------------------
# QUESTION BANK ENDPOINTS
# -------------------------------------------------------------

@router.post(
    "/courses/{course_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create question bank item",
)
def create_course_question(
    course_id: str,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Author a new Question Bank item."""
    return assessment_service.create_question(db, course_id, payload, current_user)


@router.get(
    "/courses/{course_id}/questions",
    response_model=List[QuestionResponse],
    summary="List question bank items for course",
)
def list_course_questions(
    course_id: str,
    module_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """List Question Bank items filtered by module, difficulty, or format."""
    return assessment_service.get_course_questions(
        db, course_id, current_user, module_id, difficulty, question_type
    )


@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    summary="Get question detail",
)
def get_question_item(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """Retrieve full Question detail with answer options."""
    return assessment_service.get_question_by_id(db, question_id, current_user)


# -------------------------------------------------------------
# EXAM & PROCTORING POLICY ENDPOINTS
# -------------------------------------------------------------

@router.post(
    "/courses/{course_id}/exams",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create course exam with proctoring policy",
)
def create_course_exam(
    course_id: str,
    payload: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Author a new exam/quiz with questions and proctoring policy."""
    return assessment_service.create_exam(db, course_id, payload, current_user)


@router.post(
    "/courses/{course_id}/exams/transactional-quiz",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create course exam and questions transactionally",
)
def create_course_transactional_quiz(
    course_id: str,
    payload: TransactionalQuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Author a quiz atomically along with its questions and options."""
    return assessment_service.create_transactional_quiz(db, course_id, payload, current_user)


@router.get(
    "/courses/{course_id}/exams",
    response_model=List[ExamResponse],
    summary="List exams for course",
)
def list_course_exams(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List available exams (students see published only)."""
    return assessment_service.list_course_exams(db, course_id, current_user)


@router.get(
    "/exams/{exam_id}",
    response_model=ExamResponse,
    summary="Get exam detail",
)
def get_exam_item(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch exam details and proctoring policy."""
    return assessment_service.get_exam_by_id(db, exam_id, current_user)


@router.post(
    "/exams/{exam_id}/publish",
    response_model=ExamResponse,
    summary="Publish exam to students",
)
def publish_exam_item(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Publish exam to make it accessible to enrolled students."""
    return assessment_service.publish_exam(db, exam_id, current_user)


@router.post(
    "/exams/{exam_id}/publish-results",
    response_model=ExamResponse,
    summary="Release exam scores & feedback to students",
)
def publish_exam_results(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Release grades and evaluation feedback to students."""
    return assessment_service.publish_results(db, exam_id, current_user)


# -------------------------------------------------------------
# STUDENT ATTEMPT, AUTOSAVE & SUBMISSION
# -------------------------------------------------------------

@router.post(
    "/exams/{exam_id}/start",
    response_model=ExamAttemptStartResponse,
    summary="Start or resume active timed exam attempt",
)
def start_exam_attempt(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("enrollment:view")),
):
    """Initialize or resume an exam attempt with server-side timer."""
    return assessment_service.start_exam_attempt(db, exam_id, current_user)


@router.post(
    "/exam-attempts/{attempt_id}/answers",
    response_model=AnswerResponse,
    summary="Autosave student answer",
)
def autosave_student_answer(
    attempt_id: str,
    payload: AnswerSavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("enrollment:view")),
):
    """Autosave single answer during examination session."""
    return assessment_service.autosave_answer(db, attempt_id, payload, current_user)


@router.post(
    "/exam-attempts/{attempt_id}/submit",
    response_model=ExamAttemptSummaryResponse,
    summary="Submit and evaluate exam attempt",
)
def submit_exam_attempt(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Submit attempt and calculate automatic MCQ/assessment score."""
    return assessment_service.evaluate_and_submit_attempt(db, attempt_id, current_user)


# -------------------------------------------------------------
# PROCTORING SIGNALS & INTEGRITY INGESTION
# -------------------------------------------------------------

@router.post(
    "/exam-attempts/{attempt_id}/events",
    summary="Ingest proctoring signals and update risk score",
)
def ingest_proctoring_events(
    attempt_id: str,
    payload: ProctoringEventBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("enrollment:view")),
):
    """Ingest batched browser security signals (fullscreen exit, tab switch, copy, etc.)."""
    return assessment_service.ingest_proctoring_events(
        db, attempt_id, payload.events, current_user
    )


@router.get(
    "/exam-attempts/{attempt_id}/events",
    response_model=List[ProctoringEventResponse],
    summary="Get chronological timeline of proctoring events",
)
def list_attempt_proctoring_events(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """Audit chronological proctoring events for an exam attempt."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    assessment_service.verify_faculty_course_auth(db, current_user, attempt.exam.course_id)
    return attempt.proctoring_events


# -------------------------------------------------------------
# FACULTY PROCTORING DASHBOARD & MANUAL REVIEW
# -------------------------------------------------------------

@router.get(
    "/exams/{exam_id}/proctoring-dashboard",
    response_model=FacultyProctoringDashboard,
    summary="Get faculty proctoring dashboard and student attempts",
)
def get_faculty_proctoring_dashboard(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """Retrieve roster proctoring overview, risk scores, and completion metrics."""
    return assessment_service.get_faculty_proctoring_dashboard(db, exam_id, current_user)


@router.post(
    "/exam-attempts/{attempt_id}/review",
    summary="Record faculty proctoring review decision",
)
def review_exam_attempt(
    attempt_id: str,
    payload: ReviewAttemptPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:update")),
):
    """Record faculty review: CLEARED, REVIEW_REQUIRED, or VIOLATION_CONFIRMED."""
    return assessment_service.review_attempt_integrity(db, attempt_id, payload, current_user)


# -------------------------------------------------------------
# LIVE INTERACTIVE ASSESSMENT & SYNCHRONIZATION ENGINE
# -------------------------------------------------------------

LIVE_QUIZ_STORE_KEY = "LIVE_QUIZ_SESSIONS"


def _live_quiz_store(db: Session, *, lock: bool = False) -> tuple[SystemConfiguration, Dict[str, Dict[str, Any]]]:
    query = db.query(SystemConfiguration).filter(SystemConfiguration.config_key == LIVE_QUIZ_STORE_KEY)
    record = query.with_for_update().first() if lock else query.first()
    if record is None:
        record = SystemConfiguration(
            config_key=LIVE_QUIZ_STORE_KEY,
            config_value={"sessions": {}, "pins": {}},
            is_sensitive=False,
            description="Durable live assessment sessions and PIN index.",
        )
        db.add(record)
        db.flush()
    value = deepcopy(record.config_value or {})
    return record, {
        "sessions": dict(value.get("sessions") or {}),
        "pins": dict(value.get("pins") or {}),
    }


def _save_live_quiz_store(db: Session, record: SystemConfiguration, store: Dict[str, Any]) -> None:
    record.config_value = store
    flag_modified(record, "config_value")
    db.commit()


@router.post(
    "/assessments/live-session",
    summary="Publish or synchronize live quiz session state",
)
def sync_live_quiz_session(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FACULTY", "HOD", "ADMINISTRATOR", "EXAMINATION")),
):
    """Publish live session state from an authorized assessment host."""
    session_id = payload.get("id") or "default-live-session"
    now_ts = time.time()
    if "created_at" not in payload:
        payload["created_at"] = now_ts
    payload["updated_at"] = now_ts

    record, store = _live_quiz_store(db, lock=True)
    store["sessions"][session_id] = payload
    pin = payload.get("pin")
    if pin:
        store["pins"][str(pin).strip()] = session_id
    _save_live_quiz_store(db, record, store)
    return {"success": True, "session": payload, "data": {"session": payload}}


@router.get(
    "/assessments/live-session",
    summary="Get active live quiz session state",
)
def get_live_quiz_session(
    pin: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve active live quiz session by PIN, session ID, or most recent active broadcast."""
    _, store = _live_quiz_store(db)
    sessions = store["sessions"]
    pins = store["pins"]
    user_role = current_user.role.name if current_user.role else ""
    now_ts = time.time()

    def is_session_expired(s: Dict[str, Any]) -> bool:
        if not s:
            return True
        if s.get("status") == "COMPLETED":
            return True
        # Check start time / creation time (older than 1 hour = 3600 seconds)
        started_at = s.get("questionStartedAt") or s.get("created_at") or s.get("updated_at")
        if started_at:
            started_sec = (started_at / 1000.0) if started_at > 1e11 else float(started_at)
            if (now_ts - started_sec) > 3600:
                return True
        return False

    if not pin and not session_id:
        return {"success": False, "session": None, "data": None}

    if pin and str(pin).strip() in pins:
        sess_id = pins[str(pin).strip()]
        s = sessions.get(sess_id)
        if s:
            if is_session_expired(s):
                s["status"] = "COMPLETED"
            return {"success": True, "session": s, "data": {"session": s}}

    if session_id and session_id in sessions:
        s = sessions.get(session_id)
        if s:
            if is_session_expired(s):
                s["status"] = "COMPLETED"
            return {"success": True, "session": s, "data": {"session": s}}

    return {"success": False, "session": None, "data": None}


@router.post(
    "/assessments/live-session/reset",
    summary="Reset or end active live quiz sessions",
)
@router.delete(
    "/assessments/live-session",
    summary="Reset or end active live quiz sessions",
)
def reset_live_quiz_session(
    pin: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """End and reset active live quiz sessions."""
    record, store = _live_quiz_store(db, lock=True)
    if session_id and session_id in store["sessions"]:
        store["sessions"][session_id]["status"] = "COMPLETED"
    elif pin and str(pin).strip() in store["pins"]:
        sid = store["pins"][str(pin).strip()]
        if sid in store["sessions"]:
            store["sessions"][sid]["status"] = "COMPLETED"
    else:
        for s in store["sessions"].values():
            s["status"] = "COMPLETED"
        store["pins"].clear()
    _save_live_quiz_store(db, record, store)
    return {"success": True, "message": "Live quiz session has been reset."}


@router.post(
    "/assessments/live-session/join",
    summary="Student join live quiz session via PIN",
)
def join_live_quiz_session(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Student joins live quiz session with 6-digit PIN."""
    pin = str(payload.get("pin", "")).strip()
    record, store = _live_quiz_store(db, lock=True)
    sessions = store["sessions"]
    session_id = store["pins"].get(pin)
    if not session_id or session_id not in sessions:
        for sid, sess in sessions.items():
            if str(sess.get("pin", "")).strip() == pin:
                session_id = sid
                break

    if not session_id or session_id not in sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session with entered PIN not found or expired.",
        )

    session = sessions[session_id]
    if not current_user.role or current_user.role.name != "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can join a live assessment.")

    student_id = str(current_user.id)
    student_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
    student_email = current_user.email
    if int((session.get("proctoringViolations") or {}).get(student_id, {}).get("count", 0)) >= 3:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="This assessment attempt was finalized after three integrity violations.")

    joined_list = session.setdefault("joinedStudents", [])
    if not any(s.get("id") == student_id or s.get("email") == student_email for s in joined_list):
        joined_list.append({
            "id": student_id,
            "name": student_name,
            "email": student_email,
            "joinedAt": payload.get("joinedAt", 0),
        })
        sessions[session_id] = session
        _save_live_quiz_store(db, record, store)

    return {"success": True, "session": session, "data": {"session": session}}


@router.post(
    "/assessments/live-session/answer",
    summary="Submit student response to current live quiz question",
)
def submit_live_quiz_answer(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record student option selection and telemetry for active question."""
    session_id = payload.get("sessionId")
    record, store = _live_quiz_store(db, lock=True)
    sessions = store["sessions"]
    if not session_id or session_id not in sessions:
        if sessions:
            session_id = list(sessions.keys())[-1]
        else:
            raise HTTPException(status_code=404, detail="Active live session not found.")

    session = sessions[session_id]
    if not current_user.role or current_user.role.name != "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit live assessment answers.")

    q_id = payload.get("questionId")
    student_id = str(current_user.id)
    if int((session.get("proctoringViolations") or {}).get(student_id, {}).get("count", 0)) >= 3:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="This assessment attempt is locked after three integrity violations.")
    if session.get("status") != "QUESTION_ACTIVE":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This question is not accepting responses.")
    current_index = int(session.get("currentQuestionIndex") or 0)
    questions = session.get("questions") or []
    current_question = questions[current_index] if 0 <= current_index < len(questions) else None
    if not current_question or current_question.get("id") != q_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The submitted question is not currently active.")
    selected_option = payload.get("selectedOption")
    if not isinstance(selected_option, int) or selected_option < 0 or selected_option >= len(current_question.get("options") or []):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A valid answer option is required.")

    responses = session.setdefault("responses", {})
    q_responses = responses.setdefault(q_id, {})
    q_responses[student_id] = {
        "selectedOption": selected_option,
        "timeTakenSeconds": payload.get("timeTakenSeconds", 1),
        "submittedAt": payload.get("submittedAt", 0),
        "isCorrect": selected_option == current_question.get("correctOption"),
    }
    sessions[session_id] = session
    _save_live_quiz_store(db, record, store)

    return {"success": True, "session": session, "data": {"session": session}}


@router.post(
    "/assessments/live-session/violation",
    summary="Record proctoring violation incident during live assessment",
)
def record_live_quiz_violation(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record tab switch, blur, or security violation incident."""
    session_id = payload.get("sessionId")
    record, store = _live_quiz_store(db, lock=True)
    sessions = store["sessions"]
    if not session_id or session_id not in sessions:
        if sessions:
            session_id = list(sessions.keys())[-1]
        else:
            raise HTTPException(status_code=404, detail="Active session not found.")

    session = sessions[session_id]
    if not current_user.role or current_user.role.name != "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can report assessment integrity events.")
    student_id = str(current_user.id)
    student_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()

    violations = session.setdefault("proctoringViolations", {})
    violation_record = violations.setdefault(student_id, {"count": 0, "studentName": student_name})
    violation_record["count"] = violation_record.get("count", 0) + 1
    violation_record["lastViolationAt"] = payload.get("timestamp", 0)
    violation_record["studentName"] = student_name
    sessions[session_id] = session
    _save_live_quiz_store(db, record, store)

    return {"success": True, "session": session, "data": {"session": session, "count": violation_record["count"]}}


# -------------------------------------------------------------
# SCHEDULED PROCTORED EXAMS & ASSESSMENTS ENGINE
# -------------------------------------------------------------

SCHEDULED_EXAM_STORE_KEY = "SCHEDULED_ASSESSMENTS"


def _scheduled_exam_store(db: Session, *, lock: bool = False) -> tuple[SystemConfiguration, Dict[str, Dict[str, Any]]]:
    query = db.query(SystemConfiguration).filter(SystemConfiguration.config_key == SCHEDULED_EXAM_STORE_KEY)
    record = query.with_for_update().first() if lock else query.first()
    if record is None:
        record = SystemConfiguration(
            config_key=SCHEDULED_EXAM_STORE_KEY,
            config_value={"exams": {}},
            is_sensitive=False,
            description="Durable scheduled assessment definitions and student attempts.",
        )
        db.add(record)
        db.flush()
    value = deepcopy(record.config_value or {})
    return record, dict(value.get("exams") or {})


def _save_scheduled_exam_store(db: Session, record: SystemConfiguration, exams: Dict[str, Any]) -> None:
    record.config_value = {"exams": exams}
    flag_modified(record, "config_value")
    db.commit()


@router.post(
    "/assessments/scheduled-exams",
    summary="Create or update a scheduled proctored exam/quiz for a class cohort",
)
def create_or_update_scheduled_exam(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FACULTY", "HOD", "ADMINISTRATOR", "EXAMINATION")),
):
    """Faculty creates or schedules a proctored exam with custom/AI MCQs, time window, and class cohort."""
    exam_id = payload.get("id") or f"exam-{int(payload.get('createdAt') or 1000)}"
    payload["id"] = exam_id
    payload.setdefault("attempts", {})
    payload.setdefault("resultsReleased", False)
    payload.setdefault("status", "UPCOMING")
    record, exams = _scheduled_exam_store(db, lock=True)
    exams[exam_id] = payload
    _save_scheduled_exam_store(db, record, exams)
    return {"success": True, "exam": payload}


@router.get(
    "/assessments/scheduled-exams",
    summary="List scheduled proctored exams for courses and class cohorts",
)
def list_scheduled_exams(
    course_code: Optional[str] = None,
    class_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve scheduled exams, optionally filtered by course or student class."""
    _, exam_store = _scheduled_exam_store(db)
    exams = list(exam_store.values())
    if course_code:
        exams = [e for e in exams if e.get("courseCode") == course_code]
    if class_name:
        exams = [e for e in exams if not e.get("targetClass") or e.get("targetClass") == "All Enrolled Sections" or class_name in e.get("targetClass", "")]
    user_role = current_user.role.name if current_user.role else ""
    if user_role == "STUDENT":
        student_class = current_user.class_name or ""
        exams = [
            exam for exam in exams
            if not exam.get("targetClass")
            or exam.get("targetClass") == "All Enrolled Sections"
            or student_class in exam.get("targetClass", "")
        ]
        safe_exams = []
        for exam in exams:
            safe_exam = deepcopy(exam)
            student_attempt = (safe_exam.pop("attempts", {}) or {}).get(str(current_user.id))
            if student_attempt:
                safe_exam["studentAttempt"] = student_attempt
            if not safe_exam.get("resultsReleased", False):
                for question in safe_exam.get("questions", []):
                    question.pop("correctIndex", None)
                    question.pop("explanation", None)
            safe_exams.append(safe_exam)
        exams = safe_exams
    return {"success": True, "exams": exams}


@router.get(
    "/assessments/scheduled-exams/{exam_id}",
    summary="Get scheduled exam details with student view protection",
)
def get_scheduled_exam_detail(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch exam details. Strips correct answers and explanations for students if exam window is still active."""
    _, exams = _scheduled_exam_store(db)
    if exam_id not in exams:
        raise HTTPException(status_code=404, detail="Scheduled exam not found.")

    exam = exams[exam_id]
    user_role = getattr(current_user.role, "name", str(current_user.role)).upper() if hasattr(current_user, "role") else "STUDENT"

    # If student, check if results are released or exam window concluded
    is_faculty = "FACULTY" in user_role or "HOD" in user_role or "ADMIN" in user_role
    if not is_faculty and not exam.get("resultsReleased", False):
        safe_exam = dict(exam)
        safe_questions = []
        for q in exam.get("questions", []):
            q_copy = dict(q)
            q_copy.pop("correctIndex", None)
            q_copy.pop("explanation", None)
            safe_questions.append(q_copy)
        safe_exam["questions"] = safe_questions
        return {"success": True, "exam": safe_exam}

    return {"success": True, "exam": exam}


@router.post(
    "/assessments/scheduled-exams/{exam_id}/submit",
    summary="Submit student attempt for a scheduled proctored exam",
)
def submit_scheduled_exam_attempt(
    exam_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STUDENT")),
):
    """Submit attempt with anti-cheat security strikes and calculate score."""
    record, exams = _scheduled_exam_store(db, lock=True)
    if exam_id not in exams:
        raise HTTPException(status_code=404, detail="Scheduled exam not found.")

    exam = exams[exam_id]
    student_id = str(current_user.id)
    student_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
    student_roll = current_user.student_identifier or current_user.id
    answers = payload.get("answers", {})

    # Evaluate score
    questions = exam.get("questions", [])
    correct_count = 0
    total_points = exam.get("maxMarks", 100)
    pts_per_q = total_points / max(1, len(questions))

    for q in questions:
        q_id = str(q.get("id"))
        if str(answers.get(q_id)) == str(q.get("correctIndex")):
            correct_count += 1

    final_score = round(correct_count * pts_per_q)

    attempt_record = {
        "studentId": student_id,
        "studentName": student_name,
        "studentRoll": student_roll,
        "answers": answers,
        "score": final_score,
        "maxScore": total_points,
        "correctCount": correct_count,
        "totalQuestions": len(questions),
        "submittedAt": payload.get("submittedAt", 0),
        "timeTakenSeconds": payload.get("timeTakenSeconds", 0),
        "strikes": payload.get("strikes", 0),
        "proctoringViolations": payload.get("proctoringViolations", []),
        "status": "DISQUALIFIED" if payload.get("strikes", 0) >= 3 else "SUBMITTED",
        "randomizedQuestionOrder": payload.get("randomizedQuestionOrder", []),
    }

    attempts = exam.setdefault("attempts", {})
    if student_id in attempts:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This assessment attempt has already been submitted.")
    attempts[student_id] = attempt_record
    exams[exam_id] = exam
    _save_scheduled_exam_store(db, record, exams)

    return {
        "success": True,
        "attempt": attempt_record,
        "resultsReleased": exam.get("resultsReleased", False),
    }


@router.post(
    "/assessments/scheduled-exams/{exam_id}/release-results",
    summary="Release exam results and explanations to students",
)
def release_scheduled_exam_results(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FACULTY", "HOD", "ADMINISTRATOR", "EXAMINATION")),
):
    """Faculty releases scores, answer breakdown, and explanations."""
    record, exams = _scheduled_exam_store(db, lock=True)
    if exam_id not in exams:
        raise HTTPException(status_code=404, detail="Scheduled exam not found.")

    exam = exams[exam_id]
    exam["resultsReleased"] = True
    exams[exam_id] = exam
    _save_scheduled_exam_store(db, record, exams)
    return {"success": True, "exam": exam}


@router.patch(
    "/assessments/scheduled-exams/{exam_id}",
    summary="Update an existing scheduled assessment",
)
def update_scheduled_exam(
    exam_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FACULTY", "HOD", "ADMINISTRATOR", "EXAMINATION")),
):
    record, exams = _scheduled_exam_store(db, lock=True)
    if exam_id not in exams:
        raise HTTPException(status_code=404, detail="Scheduled exam not found.")
    protected_fields = {"id", "attempts"}
    exam = {**exams[exam_id], **{key: value for key, value in payload.items() if key not in protected_fields}}
    exams[exam_id] = exam
    _save_scheduled_exam_store(db, record, exams)
    return {"success": True, "exam": exam}


@router.delete(
    "/assessments/scheduled-exams/{exam_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a scheduled assessment that has no submitted attempts",
)
def delete_scheduled_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HOD", "ADMINISTRATOR", "EXAMINATION")),
):
    record, exams = _scheduled_exam_store(db, lock=True)
    exam = exams.get(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Scheduled exam not found.")
    if exam.get("attempts"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An assessment with submitted attempts cannot be deleted. Cancel or archive it instead.",
        )
    del exams[exam_id]
    _save_scheduled_exam_store(db, record, exams)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
