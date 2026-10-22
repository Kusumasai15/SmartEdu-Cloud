"""Comprehensive Automated Tests for Phase 07: Question Bank, Exams, Timed Attempts, and Proctoring."""
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal, Base, engine
from tests.fixtures import seed_database
from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.question import Question, QuestionOption, QuestionType, DifficultyLevel
from app.models.exam import Exam, ExamType, ProctoringMode
from app.models.exam_attempt import ExamAttempt, AttemptStatus, ReviewStatus
from app.models.proctoring_event import ProctoringEvent, EventSeverity, ProctoringEventType

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    """Ensure database schema exists and has standard seed data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def get_auth_token(email: str, password: str = "DevPassword123!") -> str:
    """Helper to login and retrieve access token."""
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["data"]["access_token"]


def test_live_quiz_session_is_durable_and_shared_between_roles():
    faculty_token = get_auth_token("faculty1@smartedu.local")
    student_token = get_auth_token("student1@smartedu.local")
    faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    session = {
        "id": "live-session-persistence-test",
        "pin": "483921",
        "title": "Database Persistence Test",
        "status": "LOBBY",
        "joinedStudents": [],
        "responses": {},
        "proctoringViolations": {},
    }

    created = client.post("/api/v1/assessments/live-session", json=session, headers=faculty_headers)
    assert created.status_code == 200

    joined = client.post(
        "/api/v1/assessments/live-session/join",
        json={"pin": "483921"},
        headers=student_headers,
    )
    assert joined.status_code == 200
    assert len(joined.json()["session"]["joinedStudents"]) == 1

    loaded = client.get(
        "/api/v1/assessments/live-session?session_id=live-session-persistence-test",
        headers=faculty_headers,
    )
    assert loaded.status_code == 200
    assert len(loaded.json()["session"]["joinedStudents"]) == 1


def test_question_bank_crud_and_scoping():
    """Test faculty can author question bank items and unassigned faculty is blocked."""
    faculty_token = get_auth_token("faculty1@smartedu.local")
    student_token = get_auth_token("student1@smartedu.local")

    db: Session = SessionLocal()
    try:
        # Find CS101 course
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        # 1. Faculty creates MCQ Single item
        q_payload = {
            "question_type": "MCQ_SINGLE",
            "difficulty": "EASY",
            "question_text": "What is the time complexity of searching in a balanced BST?",
            "points": 2.0,
            "negative_points": 0.5,
            "explanation": "Binary search trees have logarithmic height.",
            "options": [
                {"option_text": "O(1)", "is_correct": False, "display_order": 1},
                {"option_text": "O(log N)", "is_correct": True, "display_order": 2},
                {"option_text": "O(N)", "is_correct": False, "display_order": 3},
                {"option_text": "O(N log N)", "is_correct": False, "display_order": 4},
            ],
        }
        resp = client.post(
            f"/api/v1/courses/{course.id}/questions",
            json=q_payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["question_text"] == q_payload["question_text"]
        assert len(data["options"]) == 4

        # 2. Student cannot create questions (403 Forbidden)
        resp_stu = client.post(
            f"/api/v1/courses/{course.id}/questions",
            json=q_payload,
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_stu.status_code == 403

        # 3. Faculty lists course questions
        resp_list = client.get(
            f"/api/v1/courses/{course.id}/questions",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_list.status_code == 200
        assert len(resp_list.json()) >= 1
    finally:
        db.close()


def test_exam_creation_and_draft_protection():
    """Test faculty can create exam with proctoring policy and draft exams are hidden from students."""
    faculty_token = get_auth_token("faculty1@smartedu.local")
    student_token = get_auth_token("student1@smartedu.local")

    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        # Create Question in DB
        q = Question(
            course_id=course.id,
            question_type=QuestionType.MCQ_SINGLE.value,
            difficulty=DifficultyLevel.EASY.value,
            question_text="Which data structure operates on LIFO principle?",
            points=5.0,
        )
        db.add(q)
        db.commit()
        db.refresh(q)

        # 1. Faculty creates draft exam
        exam_payload = {
            "title": "CS101 Midterm Proctored Exam",
            "description": "Proctored assessment covering fundamental data structures.",
            "exam_type": "MIDTERM",
            "duration_minutes": 45,
            "total_marks": 50.0,
            "passing_marks": 20.0,
            "max_attempts": 1,
            "is_published": False,
            "question_ids": [q.id],
            "proctoring_policy": {
                "proctoring_mode": "STRICT_PROCTORED",
                "fullscreen_required": True,
                "camera_required": True,
                "tab_switch_detection": True,
                "copy_paste_prevention": True,
            },
        }
        resp = client.post(
            f"/api/v1/courses/{course.id}/exams",
            json=exam_payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp.status_code == 201, resp.text
        exam_id = resp.json()["id"]
        assert resp.json()["proctoring_policy"]["proctoring_mode"] == "STRICT_PROCTORED"

        # 2. Student cannot see draft exam in list or details
        resp_stu_list = client.get(
            f"/api/v1/courses/{course.id}/exams",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_stu_list.status_code == 200
        assert not any(e["id"] == exam_id for e in resp_stu_list.json())

        resp_stu_get = client.get(
            f"/api/v1/exams/{exam_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_stu_get.status_code == 403

        # 3. Faculty publishes exam
        resp_pub = client.post(
            f"/api/v1/exams/{exam_id}/publish",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_pub.status_code == 200
        assert resp_pub.json()["is_published"] is True

        # 4. Student can now see published exam
        resp_stu_get2 = client.get(
            f"/api/v1/exams/{exam_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_stu_get2.status_code == 200
    finally:
        db.close()


def test_exam_attempt_autosave_and_evaluation():
    """Test student attempt lifecycle, autosave answers, and automatic grading."""
    faculty_token = get_auth_token("faculty1@smartedu.local")
    student_token = get_auth_token("student1@smartedu.local")

    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        # Setup Question 1: MCQ Single
        q1 = Question(
            course_id=course.id,
            question_type=QuestionType.MCQ_SINGLE.value,
            difficulty=DifficultyLevel.EASY.value,
            question_text="Is Python dynamically typed?",
            points=10.0,
        )
        db.add(q1)
        db.flush()

        opt1_yes = QuestionOption(question_id=q1.id, option_text="Yes", is_correct=True, display_order=1)
        opt1_no = QuestionOption(question_id=q1.id, option_text="No", is_correct=False, display_order=2)
        db.add_all([opt1_yes, opt1_no])

        # Setup Question 2: True/False
        q2 = Question(
            course_id=course.id,
            question_type=QuestionType.TRUE_FALSE.value,
            difficulty=DifficultyLevel.EASY.value,
            question_text="HTTP is a stateful protocol.",
            points=10.0,
        )
        db.add(q2)
        db.flush()

        opt2_true = QuestionOption(question_id=q2.id, option_text="True", is_correct=False, display_order=1)
        opt2_false = QuestionOption(question_id=q2.id, option_text="False", is_correct=True, display_order=2)
        db.add_all([opt2_true, opt2_false])
        db.commit()

        # Create and publish exam
        exam_payload = {
            "title": "Quick CS101 Evaluation Quiz",
            "exam_type": "QUIZ",
            "duration_minutes": 30,
            "total_marks": 20.0,
            "passing_marks": 10.0,
            "is_published": True,
            "question_ids": [q1.id, q2.id],
        }
        resp_exam = client.post(
            f"/api/v1/courses/{course.id}/exams",
            json=exam_payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        exam_id = resp_exam.json()["id"]

        # 1. Student starts attempt
        resp_start = client.post(
            f"/api/v1/exams/{exam_id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_start.status_code == 200, resp_start.text
        attempt_data = resp_start.json()
        attempt_id = attempt_data["attempt_id"]
        assert len(attempt_data["questions"]) == 2
        assert "expires_at" in attempt_data

        # Verify answers have no correct indicator in student view
        for q in attempt_data["questions"]:
            for opt in q["options"]:
                assert "is_correct" not in opt

        # 2. Student autosaves answer for Q1 (correct) and Q2 (correct)
        ans1_payload = {
            "question_id": q1.id,
            "selected_option_ids": [opt1_yes.id],
        }
        resp_ans1 = client.post(
            f"/api/v1/exam-attempts/{attempt_id}/answers",
            json=ans1_payload,
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_ans1.status_code == 200

        ans2_payload = {
            "question_id": q2.id,
            "selected_option_ids": [opt2_false.id],
        }
        resp_ans2 = client.post(
            f"/api/v1/exam-attempts/{attempt_id}/answers",
            json=ans2_payload,
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_ans2.status_code == 200

        # 3. Student submits exam
        resp_sub = client.post(
            f"/api/v1/exam-attempts/{attempt_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_sub.status_code == 200
        sub_data = resp_sub.json()
        assert sub_data["status"] == "EVALUATED"

        # Before results release, scores are masked from student
        assert sub_data["score"] is None

        # 4. Faculty releases results
        client.post(
            f"/api/v1/exams/{exam_id}/publish-results",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )

        # 5. Student checks results after release
        resp_sub2 = client.post(
            f"/api/v1/exam-attempts/{attempt_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_sub2.status_code == 200
        assert resp_sub2.json()["score"] == 20.0
        assert resp_sub2.json()["percentage"] == 100.0
        assert resp_sub2.json()["passed"] is True
    finally:
        db.close()


def test_proctoring_events_risk_score_and_faculty_review():
    """Test proctoring event ingestion, dynamic integrity scoring, and faculty manual review."""
    faculty_token = get_auth_token("faculty1@smartedu.local")
    student_token = get_auth_token("student1@smartedu.local")

    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        q = Question(
            course_id=course.id,
            question_type=QuestionType.TRUE_FALSE.value,
            difficulty=DifficultyLevel.EASY.value,
            question_text="Is RAM volatile memory?",
            points=10.0,
        )
        db.add(q)
        db.flush()
        db.add(QuestionOption(question_id=q.id, option_text="True", is_correct=True))
        db.commit()

        # Create exam
        resp_exam = client.post(
            f"/api/v1/courses/{course.id}/exams",
            json={
                "title": "Proctored Security Test Exam",
                "exam_type": "QUIZ",
                "duration_minutes": 30,
                "total_marks": 10.0,
                "passing_marks": 5.0,
                "is_published": True,
                "question_ids": [q.id],
            },
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        exam_id = resp_exam.json()["id"]

        # Student starts attempt
        resp_start = client.post(
            f"/api/v1/exams/{exam_id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        attempt_id = resp_start.json()["attempt_id"]

        # 1. Student generates suspicious proctoring events
        events_payload = {
            "events": [
                {
                    "event_type": "FULLSCREEN_EXIT",
                    "severity": "MEDIUM",
                    "duration_seconds": 6.0,
                    "metadata_json": '{"reason": "User minimized window"}',
                },
                {
                    "event_type": "TAB_SWITCH",
                    "severity": "MEDIUM",
                    "duration_seconds": 12.0,
                },
                {
                    "event_type": "COPY_ATTEMPT",
                    "severity": "HIGH",
                    "metadata_json": '{"target": "question_text"}',
                },
            ]
        }
        resp_events = client.post(
            f"/api/v1/exam-attempts/{attempt_id}/events",
            json=events_payload,
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp_events.status_code == 200
        res = resp_events.json()
        # Baseline 100 - (8 + 8 + 15) = 69.0
        assert res["integrity_score"] == 69.0
        assert res["review_status"] == "REVIEW_REQUIRED"

        # 2. Faculty views proctoring dashboard
        resp_dash = client.get(
            f"/api/v1/exams/{exam_id}/proctoring-dashboard",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_dash.status_code == 200
        dash_data = resp_dash.json()
        assert dash_data["total_flagged_for_review"] >= 1

        # Find student in roster
        student_row = next(r for r in dash_data["roster"] if r["attempt_id"] == attempt_id)
        assert student_row["integrity_score"] == 69.0
        assert student_row["review_status"] == "REVIEW_REQUIRED"
        assert student_row["total_violations_count"] >= 3

        # 3. Faculty audits chronological timeline
        resp_timeline = client.get(
            f"/api/v1/exam-attempts/{attempt_id}/events",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_timeline.status_code == 200
        timeline = resp_timeline.json()
        assert any(e["event_type"] == "FULLSCREEN_EXIT" for e in timeline)
        assert any(e["event_type"] == "TAB_SWITCH" for e in timeline)

        # 4. Faculty records manual review decision
        review_payload = {
            "review_status": "CLEARED",
            "review_notes": "Student had accidental OS notification popup during exam session.",
        }
        resp_rev = client.post(
            f"/api/v1/exam-attempts/{attempt_id}/review",
            json=review_payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_rev.status_code == 200
        assert resp_rev.json()["review_status"] == "CLEARED"
    finally:
        db.close()


def test_idor_and_security_protections():
    """Test IDOR protection: Student A cannot modify Student B's attempt or submit events."""
    faculty_token = get_auth_token("faculty1@smartedu.local")
    student_a_token = get_auth_token("student1@smartedu.local")
    student_b_token = get_auth_token("student2@smartedu.local")

    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        # Ensure student2 is enrolled in CS101
        student2 = db.query(User).filter(User.email == "student2@smartedu.local").first()
        assert student2 is not None
        s2_enr = db.query(Enrollment).filter(
            Enrollment.course_id == course.id,
            Enrollment.student_id == student2.id,
        ).first()
        if not s2_enr:
            s2_enr = Enrollment(
                course_id=course.id,
                student_id=student2.id,
                semester_id=course.semester_id,
                status=EnrollmentStatus.ACTIVE.value,
            )
            db.add(s2_enr)
            db.commit()

        q = Question(
            course_id=course.id,
            question_type=QuestionType.MCQ_SINGLE.value,
            difficulty=DifficultyLevel.EASY.value,
            question_text="What is a byte?",
            points=5.0,
        )
        db.add(q)
        db.flush()
        db.add(QuestionOption(question_id=q.id, option_text="8 bits", is_correct=True))
        db.commit()

        resp_exam = client.post(
            f"/api/v1/courses/{course.id}/exams",
            json={
                "title": "IDOR Security Test Exam",
                "exam_type": "QUIZ",
                "duration_minutes": 20,
                "total_marks": 5.0,
                "passing_marks": 2.0,
                "is_published": True,
                "question_ids": [q.id],
            },
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        exam_id = resp_exam.json()["id"]

        # Student A starts attempt
        resp_start_a = client.post(
            f"/api/v1/exams/{exam_id}/start",
            headers={"Authorization": f"Bearer {student_a_token}"},
        )
        attempt_a_id = resp_start_a.json()["attempt_id"]

        # 1. Student B tries to autosave an answer on Student A's attempt (403 Forbidden)
        resp_idor_ans = client.post(
            f"/api/v1/exam-attempts/{attempt_a_id}/answers",
            json={"question_id": q.id, "selected_option_ids": ["dummy"]},
            headers={"Authorization": f"Bearer {student_b_token}"},
        )
        assert resp_idor_ans.status_code == 403

        # 2. Student B tries to submit proctoring events for Student A (403 Forbidden)
        resp_idor_ev = client.post(
            f"/api/v1/exam-attempts/{attempt_a_id}/events",
            json={"events": [{"event_type": "COPY_ATTEMPT", "severity": "HIGH"}]},
            headers={"Authorization": f"Bearer {student_b_token}"},
        )
        assert resp_idor_ev.status_code == 403
    finally:
        db.close()


def test_transactional_quiz_creation_and_rollback():
    """Verify that transactional-quiz creates exam and nested questions atomically."""
    faculty_token = get_auth_token("faculty1@smartedu.local")

    db: Session = SessionLocal()
    try:
        course = db.query(Course).filter(Course.course_code == "CS101").first()
        assert course is not None

        # 1. Successful transactional creation
        payload = {
            "title": "Transactional Algorithm Quiz",
            "description": "Atomic creation of quiz and questions",
            "exam_type": "QUIZ",
            "duration_minutes": 25,
            "is_published": True,
            "questions": [
                {
                    "question_text": "What is the worst-case complexity of QuickSort?",
                    "points": 2.0,
                    "question_type": "MCQ_SINGLE",
                    "difficulty": "MEDIUM",
                    "options": [
                        {"option_text": "O(N log N)", "is_correct": False, "display_order": 1},
                        {"option_text": "O(N^2)", "is_correct": True, "display_order": 2},
                    ],
                },
                {
                    "question_text": "Merge sort is stable. True or False?",
                    "points": 1.0,
                    "question_type": "TRUE_FALSE",
                    "difficulty": "EASY",
                    "options": [
                        {"option_text": "True", "is_correct": True, "display_order": 1},
                        {"option_text": "False", "is_correct": False, "display_order": 2},
                    ],
                },
            ],
            "proctoring_policy": {
                "proctoring_mode": "BASIC_PROCTORED",
                "tab_switch_detection": True,
                "copy_paste_prevention": True,
            },
        }

        resp = client.post(
            f"/api/v1/courses/{course.id}/exams/transactional-quiz",
            json=payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Transactional Algorithm Quiz"
        assert data["total_marks"] == 3.0
        assert data["questions_count"] == 2
        assert data["proctoring_policy"]["tab_switch_detection"] is True

        # Verify items in database
        exam_in_db = db.query(Exam).filter(Exam.id == data["id"]).first()
        assert exam_in_db is not None
        assert len(exam_in_db.questions) == 2

        # 2. Validation error - question_text too short (< 3 chars)
        invalid_payload = {
            "title": "Invalid Quiz",
            "questions": [
                {
                    "question_text": "Q?",  # too short (< 3 chars), triggers Pydantic 422
                    "points": 1.0,
                }
            ],
        }
        resp_invalid = client.post(
            f"/api/v1/courses/{course.id}/exams/transactional-quiz",
            json=invalid_payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp_invalid.status_code == 422
        # Ensure no exam titled "Invalid Quiz" was created
        dangling_exam = db.query(Exam).filter(Exam.title == "Invalid Quiz").first()
        assert dangling_exam is None
    finally:
        db.close()

