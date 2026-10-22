"""Assessment, Question Bank, Timed Exam, and Proctoring Service Layer."""
import json
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.question import Question, QuestionOption, QuestionType, DifficultyLevel
from app.models.exam import Exam, ExamQuestion, ProctoringPolicy, ExamType, ProctoringMode
from app.models.exam_attempt import ExamAttempt, ExamAnswer, AttemptStatus, ReviewStatus
from app.models.proctoring_event import ProctoringEvent, EventSeverity, ProctoringEventType
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.user import User
from app.assessments.schemas import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionOptionResponse,
    QuestionOptionStudentView,
    QuestionStudentView,
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    TransactionalQuizCreate,
    ProctoringPolicyResponse,
    AnswerSavePayload,
    ExamAttemptStartResponse,
    ExamAttemptSummaryResponse,
    ProctoringEventCreate,
    ReviewAttemptPayload,
    StudentAttemptRosterRow,
    FacultyProctoringDashboard,
)


class AssessmentService:
    """Core business logic for question banking, exams, proctoring signals, and evaluation."""

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
                    detail="HOD cannot manage assessments for courses outside their department.",
                )
            return course

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
    # QUESTION BANK MANAGEMENT
    # ---------------------------------------------------------

    def create_question(
        self, db: Session, course_id: str, payload: QuestionCreate, current_user: User
    ) -> Question:
        """Author a new Question Bank item."""
        self.verify_faculty_course_auth(db, current_user, course_id)

        question = Question(
            course_id=course_id,
            module_id=payload.module_id,
            topic_id=payload.topic_id,
            question_type=payload.question_type.value,
            difficulty=payload.difficulty.value,
            question_text=payload.question_text,
            points=payload.points,
            negative_points=payload.negative_points,
            explanation=payload.explanation,
            created_by=current_user.id,
        )
        db.add(question)
        db.flush()

        if payload.options:
            for idx, opt in enumerate(payload.options):
                option = QuestionOption(
                    question_id=question.id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    display_order=opt.display_order or (idx + 1),
                )
                db.add(option)

        db.commit()
        db.refresh(question)
        return question

    def get_course_questions(
        self,
        db: Session,
        course_id: str,
        current_user: User,
        module_id: Optional[str] = None,
        difficulty: Optional[str] = None,
        question_type: Optional[str] = None,
    ) -> List[Question]:
        """Fetch Question Bank for course."""
        self.verify_faculty_course_auth(db, current_user, course_id)

        query = db.query(Question).filter(Question.course_id == course_id, Question.is_active == True)
        if module_id:
            query = query.filter(Question.module_id == module_id)
        if difficulty:
            query = query.filter(Question.difficulty == difficulty)
        if question_type:
            query = query.filter(Question.question_type == question_type)

        return query.order_by(Question.created_at.desc()).all()

    def get_question_by_id(
        self, db: Session, question_id: str, current_user: User
    ) -> Question:
        """Retrieve question by ID with authorization verification."""
        q = db.query(Question).filter(Question.id == question_id).first()
        if not q:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID '{question_id}' not found.",
            )
        self.verify_faculty_course_auth(db, current_user, q.course_id)
        return q

    # ---------------------------------------------------------
    # EXAM & PROCTORING POLICY MANAGEMENT
    # ---------------------------------------------------------

    def create_exam(
        self, db: Session, course_id: str, payload: ExamCreate, current_user: User
    ) -> Exam:
        """Create an exam and its associated proctoring policy."""
        self.verify_faculty_course_auth(db, current_user, course_id)

        exam = Exam(
            course_id=course_id,
            title=payload.title,
            description=payload.description,
            instructions=payload.instructions,
            exam_type=payload.exam_type.value,
            duration_minutes=payload.duration_minutes,
            total_marks=payload.total_marks,
            passing_marks=payload.passing_marks,
            start_time=payload.start_time,
            end_time=payload.end_time,
            max_attempts=payload.max_attempts,
            is_published=payload.is_published,
            allow_review=payload.allow_review,
            randomize_questions=payload.randomize_questions,
            randomize_options=payload.randomize_options,
            created_by=current_user.id,
        )
        db.add(exam)
        db.flush()

        # Attach Questions
        if payload.question_ids:
            for idx, q_id in enumerate(payload.question_ids):
                eq = ExamQuestion(
                    exam_id=exam.id,
                    question_id=q_id,
                    display_order=idx + 1,
                )
                db.add(eq)

        # Attach Proctoring Policy
        pol_cfg = payload.proctoring_policy
        policy = ProctoringPolicy(
            exam_id=exam.id,
            proctoring_mode=pol_cfg.proctoring_mode.value if pol_cfg else ProctoringMode.BASIC_PROCTORED.value,
            fullscreen_required=pol_cfg.fullscreen_required if pol_cfg else True,
            camera_required=pol_cfg.camera_required if pol_cfg else False,
            microphone_required=pol_cfg.microphone_required if pol_cfg else False,
            screen_share_required=pol_cfg.screen_share_required if pol_cfg else False,
            tab_switch_detection=pol_cfg.tab_switch_detection if pol_cfg else True,
            window_blur_detection=pol_cfg.window_blur_detection if pol_cfg else True,
            copy_paste_prevention=pol_cfg.copy_paste_prevention if pol_cfg else True,
            context_menu_disabled=pol_cfg.context_menu_disabled if pol_cfg else True,
            keyboard_shortcut_detection=pol_cfg.keyboard_shortcut_detection if pol_cfg else True,
            auto_submit_on_expiry=pol_cfg.auto_submit_on_expiry if pol_cfg else True,
            max_violations_warning=pol_cfg.max_violations_warning if pol_cfg else 5,
        )
        db.add(policy)

        db.commit()
        db.refresh(exam)
        return exam

    def create_transactional_quiz(
        self, db: Session, course_id: str, payload: TransactionalQuizCreate, current_user: User
    ) -> Exam:
        """Atomically author a new quiz together with all questions and options in a single transaction."""
        self.verify_faculty_course_auth(db, current_user, course_id)

        computed_total = sum(q.points for q in payload.questions)
        total_marks = payload.total_marks if (payload.total_marks and payload.total_marks > 0) else computed_total
        passing_marks = payload.passing_marks if payload.passing_marks is not None else (total_marks * 0.4)

        try:
            exam = Exam(
                course_id=course_id,
                title=payload.title,
                description=payload.description,
                instructions=payload.instructions,
                exam_type=payload.exam_type.value,
                duration_minutes=payload.duration_minutes,
                total_marks=total_marks,
                passing_marks=passing_marks,
                start_time=payload.start_time,
                end_time=payload.end_time,
                max_attempts=payload.max_attempts,
                is_published=payload.is_published,
                allow_review=payload.allow_review,
                randomize_questions=payload.randomize_questions,
                randomize_options=payload.randomize_options,
                created_by=current_user.id,
            )
            db.add(exam)
            db.flush()

            for idx, q_data in enumerate(payload.questions):
                question = Question(
                    course_id=course_id,
                    module_id=q_data.module_id,
                    topic_id=q_data.topic_id,
                    question_type=q_data.question_type.value,
                    difficulty=q_data.difficulty.value,
                    question_text=q_data.question_text,
                    points=q_data.points,
                    negative_points=q_data.negative_points,
                    explanation=q_data.explanation,
                    created_by=current_user.id,
                )
                db.add(question)
                db.flush()

                if q_data.options:
                    for opt_idx, opt in enumerate(q_data.options):
                        option = QuestionOption(
                            question_id=question.id,
                            option_text=opt.option_text,
                            is_correct=opt.is_correct,
                            display_order=opt.display_order or (opt_idx + 1),
                        )
                        db.add(option)

                eq = ExamQuestion(
                    exam_id=exam.id,
                    question_id=question.id,
                    display_order=idx + 1,
                )
                db.add(eq)

            pol_cfg = payload.proctoring_policy
            policy = ProctoringPolicy(
                exam_id=exam.id,
                proctoring_mode=pol_cfg.proctoring_mode.value if pol_cfg else ProctoringMode.BASIC_PROCTORED.value,
                fullscreen_required=pol_cfg.fullscreen_required if pol_cfg else True,
                camera_required=pol_cfg.camera_required if pol_cfg else False,
                microphone_required=pol_cfg.microphone_required if pol_cfg else False,
                screen_share_required=pol_cfg.screen_share_required if pol_cfg else False,
                tab_switch_detection=pol_cfg.tab_switch_detection if pol_cfg else True,
                window_blur_detection=pol_cfg.window_blur_detection if pol_cfg else True,
                copy_paste_prevention=pol_cfg.copy_paste_prevention if pol_cfg else True,
                context_menu_disabled=pol_cfg.context_menu_disabled if pol_cfg else True,
                keyboard_shortcut_detection=pol_cfg.keyboard_shortcut_detection if pol_cfg else True,
                auto_submit_on_expiry=pol_cfg.auto_submit_on_expiry if pol_cfg else True,
                max_violations_warning=pol_cfg.max_violations_warning if pol_cfg else 5,
            )
            db.add(policy)

            db.commit()
            db.refresh(exam)
            return exam
        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create transactional quiz: {str(exc)}",
            )

    def list_course_exams(
        self, db: Session, course_id: str, current_user: User
    ) -> List[Exam]:
        """List exams for course. Enforces role-based visibility."""
        role_name = current_user.role.name if current_user.role else ""

        if role_name == "STUDENT":
            self.verify_student_course_enrollment(db, current_user, course_id)
            return (
                db.query(Exam)
                .filter(Exam.course_id == course_id, Exam.is_published == True)
                .order_by(Exam.created_at.desc())
                .all()
            )
        else:
            self.verify_faculty_course_auth(db, current_user, course_id)
            return (
                db.query(Exam)
                .filter(Exam.course_id == course_id)
                .order_by(Exam.created_at.desc())
                .all()
            )

    def get_exam_by_id(
        self, db: Session, exam_id: str, current_user: User
    ) -> Exam:
        """Fetch exam details."""
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exam with ID '{exam_id}' not found.",
            )

        role_name = current_user.role.name if current_user.role else ""
        if role_name == "STUDENT":
            self.verify_student_course_enrollment(db, current_user, exam.course_id)
            if not exam.is_published:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This exam is not yet published by the faculty.",
                )
        else:
            self.verify_faculty_course_auth(db, current_user, exam.course_id)

        return exam

    def publish_exam(
        self, db: Session, exam_id: str, current_user: User
    ) -> Exam:
        """Publish exam to students."""
        exam = self.get_exam_by_id(db, exam_id, current_user)
        self.verify_faculty_course_auth(db, current_user, exam.course_id)
        exam.is_published = True
        db.commit()
        db.refresh(exam)
        return exam

    def publish_results(
        self, db: Session, exam_id: str, current_user: User
    ) -> Exam:
        """Release grades and evaluation feedback to students."""
        exam = self.get_exam_by_id(db, exam_id, current_user)
        self.verify_faculty_course_auth(db, current_user, exam.course_id)
        exam.results_published = True
        db.commit()
        db.refresh(exam)
        return exam

    # ---------------------------------------------------------
    # TIMED ATTEMPTS & AUTOSAVE ENGINE
    # ---------------------------------------------------------

    def start_exam_attempt(
        self, db: Session, exam_id: str, current_user: User
    ) -> ExamAttemptStartResponse:
        """Start or resume an active exam attempt with immutable randomization and timer."""
        exam = self.get_exam_by_id(db, exam_id, current_user)
        self.verify_student_course_enrollment(db, current_user, exam.course_id)

        now = datetime.now(timezone.utc)

        # Check availability schedule
        if exam.start_time and now < exam.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Exam is not open yet. Starts at {exam.start_time.isoformat()}.",
            )
        if exam.end_time and now > exam.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam submission window has ended.",
            )

        # Check for active in-progress attempt
        active_attempt = (
            db.query(ExamAttempt)
            .filter(
                ExamAttempt.exam_id == exam_id,
                ExamAttempt.student_id == current_user.id,
                ExamAttempt.status == AttemptStatus.IN_PROGRESS.value,
            )
            .first()
        )

        if active_attempt:
            # Check if active attempt has expired
            expires_at = active_attempt.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if now > expires_at:
                # Auto-submit expired attempt
                self.evaluate_and_submit_attempt(db, active_attempt.id, current_user, is_auto_submit=True)
                active_attempt = None
            else:
                attempt = active_attempt

        if not active_attempt:
            # Check attempt limit
            prior_count = (
                db.query(ExamAttempt)
                .filter(
                    ExamAttempt.exam_id == exam_id,
                    ExamAttempt.student_id == current_user.id,
                )
                .count()
            )
            if prior_count >= exam.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Maximum allowed attempts ({exam.max_attempts}) reached for this exam.",
                )

            # Retrieve questions attached to exam
            exam_questions = (
                db.query(ExamQuestion)
                .filter(ExamQuestion.exam_id == exam_id)
                .order_by(ExamQuestion.display_order.asc())
                .all()
            )
            if not exam_questions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This exam has no questions configured.",
                )

            q_ids = [eq.question_id for eq in exam_questions]
            if exam.randomize_questions:
                random.shuffle(q_ids)

            started_at = now
            expires_at = started_at + timedelta(minutes=exam.duration_minutes)

            attempt = ExamAttempt(
                exam_id=exam_id,
                student_id=current_user.id,
                attempt_number=prior_count + 1,
                started_at=started_at,
                expires_at=expires_at,
                status=AttemptStatus.IN_PROGRESS.value,
                integrity_score=100.0,
                review_status=ReviewStatus.NOT_REVIEWED.value,
                question_order_json=json.dumps(q_ids),
            )
            db.add(attempt)
            db.flush()

            # Record EXAM_STARTED event
            start_event = ProctoringEvent(
                attempt_id=attempt.id,
                event_type=ProctoringEventType.EXAM_STARTED.value,
                severity=EventSeverity.INFO.value,
                timestamp=started_at,
            )
            db.add(start_event)
            db.commit()
            db.refresh(attempt)

        # Build Sanitized Student Questions View
        ordered_q_ids = json.loads(attempt.question_order_json) if attempt.question_order_json else []
        questions_map = {
            q.id: q
            for q in db.query(Question)
            .filter(Question.id.in_(ordered_q_ids))
            .all()
        }

        student_questions: List[QuestionStudentView] = []
        for idx, q_id in enumerate(ordered_q_ids):
            q = questions_map.get(q_id)
            if not q:
                continue

            options_list = list(q.options)
            if exam.randomize_options:
                random.seed(f"{attempt.id}_{q.id}")
                random.shuffle(options_list)

            sanitized_opts = [
                QuestionOptionStudentView(
                    id=opt.id,
                    option_text=opt.option_text,
                    display_order=opt_idx + 1,
                )
                for opt_idx, opt in enumerate(options_list)
            ]

            student_questions.append(
                QuestionStudentView(
                    id=q.id,
                    question_type=q.question_type,
                    difficulty=q.difficulty,
                    question_text=q.question_text,
                    points=q.points,
                    display_order=idx + 1,
                    options=sanitized_opts,
                )
            )

        # Fetch existing saved answers
        saved_answers_map = {}
        for ans in attempt.answers:
            saved_answers_map[ans.question_id] = {
                "selected_option_ids": json.loads(ans.selected_option_ids_json) if ans.selected_option_ids_json else [],
                "text_answer": ans.text_answer,
                "saved_at": ans.saved_at.isoformat() if ans.saved_at else None,
            }

        policy_resp = (
            ProctoringPolicyResponse.model_validate(exam.proctoring_policy)
            if exam.proctoring_policy
            else None
        )

        return ExamAttemptStartResponse(
            attempt_id=attempt.id,
            exam_id=exam.id,
            title=exam.title,
            instructions=exam.instructions,
            duration_minutes=exam.duration_minutes,
            started_at=attempt.started_at,
            expires_at=attempt.expires_at,
            server_time=datetime.now(timezone.utc),
            questions=student_questions,
            saved_answers=saved_answers_map,
            proctoring_policy=policy_resp,
        )

    def autosave_answer(
        self,
        db: Session,
        attempt_id: str,
        payload: AnswerSavePayload,
        current_user: User,
    ) -> ExamAnswer:
        """Autosave student answer with session verification."""
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt with ID '{attempt_id}' not found.",
            )

        if attempt.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cannot modify another student's attempt.",
            )

        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attempt is already {attempt.status} and cannot be modified.",
            )

        # Check timer expiration
        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            self.evaluate_and_submit_attempt(db, attempt_id, current_user, is_auto_submit=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam timer has expired. Attempt has been auto-submitted.",
            )

        # Find or create answer
        answer = (
            db.query(ExamAnswer)
            .filter(
                ExamAnswer.attempt_id == attempt_id,
                ExamAnswer.question_id == payload.question_id,
            )
            .first()
        )

        selected_json = (
            json.dumps(payload.selected_option_ids)
            if payload.selected_option_ids
            else None
        )

        if answer:
            answer.selected_option_ids_json = selected_json
            answer.text_answer = payload.text_answer
            answer.saved_at = now
        else:
            answer = ExamAnswer(
                attempt_id=attempt_id,
                question_id=payload.question_id,
                selected_option_ids_json=selected_json,
                text_answer=payload.text_answer,
                saved_at=now,
            )
            db.add(answer)

        db.commit()
        db.refresh(answer)
        return answer

    def evaluate_and_submit_attempt(
        self,
        db: Session,
        attempt_id: str,
        current_user: User,
        is_auto_submit: bool = False,
    ) -> ExamAttemptSummaryResponse:
        """Evaluate attempt answers, compute score/percentage, and finalize attempt."""
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt with ID '{attempt_id}' not found.",
            )

        if attempt.student_id != current_user.id:
            role_name = current_user.role.name if current_user.role else ""
            if role_name not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied.",
                )

        if attempt.status in [AttemptStatus.SUBMITTED.value, AttemptStatus.AUTO_SUBMITTED.value, AttemptStatus.EVALUATED.value]:
            return self._build_attempt_summary(attempt)

        exam = attempt.exam
        now = datetime.now(timezone.utc)

        # Fetch all questions in attempt
        ordered_q_ids = json.loads(attempt.question_order_json) if attempt.question_order_json else []
        questions = (
            db.query(Question)
            .filter(Question.id.in_(ordered_q_ids))
            .all()
        )
        questions_map = {q.id: q for q in questions}

        # Fetch all saved answers
        answers_map = {
            ans.question_id: ans
            for ans in attempt.answers
        }

        total_score = 0.0

        for q_id, q in questions_map.items():
            ans = answers_map.get(q_id)
            if not ans:
                continue

            q_type = q.question_type
            correct_opts = [opt.id for opt in q.options if opt.is_correct]

            is_correct = False
            awarded = 0.0

            if q_type in [QuestionType.MCQ_SINGLE.value, QuestionType.TRUE_FALSE.value]:
                selected = (
                    json.loads(ans.selected_option_ids_json)
                    if ans.selected_option_ids_json
                    else []
                )
                if selected and selected[0] in correct_opts:
                    is_correct = True
                    awarded = q.points
                elif selected and q.negative_points > 0:
                    awarded = -q.negative_points

            elif q_type == QuestionType.MCQ_MULTIPLE.value:
                selected = (
                    json.loads(ans.selected_option_ids_json)
                    if ans.selected_option_ids_json
                    else []
                )
                if set(selected) == set(correct_opts):
                    is_correct = True
                    awarded = q.points
                elif selected and q.negative_points > 0:
                    awarded = -q.negative_points

            elif q_type == QuestionType.SHORT_ANSWER.value:
                if ans.text_answer and correct_opts:
                    # Match against correct option text
                    correct_text = [
                        opt.option_text.strip().lower()
                        for opt in q.options
                        if opt.is_correct
                    ]
                    if ans.text_answer.strip().lower() in correct_text:
                        is_correct = True
                        awarded = q.points

            ans.is_correct = is_correct
            ans.marks_awarded = awarded
            total_score += awarded

        # Clamp total score $\ge 0$
        final_score = max(0.0, total_score)
        pct = (final_score / exam.total_marks) * 100 if exam.total_marks > 0 else 0.0
        passed = final_score >= exam.passing_marks

        attempt.score = round(final_score, 2)
        attempt.percentage = round(pct, 2)
        attempt.passed = passed
        attempt.submitted_at = now
        attempt.status = (
            AttemptStatus.AUTO_SUBMITTED.value
            if is_auto_submit
            else AttemptStatus.EVALUATED.value
        )

        # Log submission event
        sub_event = ProctoringEvent(
            attempt_id=attempt.id,
            event_type=(
                ProctoringEventType.EXAM_EXPIRED.value
                if is_auto_submit
                else ProctoringEventType.EXAM_SUBMITTED.value
            ),
            severity=EventSeverity.INFO.value,
            timestamp=now,
        )
        db.add(sub_event)

        db.commit()
        db.refresh(attempt)
        return self._build_attempt_summary(attempt)

    def _build_attempt_summary(self, attempt: ExamAttempt) -> ExamAttemptSummaryResponse:
        """Helper to build consistent attempt evaluation summary."""
        exam = attempt.exam
        return ExamAttemptSummaryResponse(
            id=attempt.id,
            exam_id=attempt.exam_id,
            student_id=attempt.student_id,
            attempt_number=attempt.attempt_number,
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
            status=attempt.status,
            score=attempt.score if exam.results_published else None,
            percentage=attempt.percentage if exam.results_published else None,
            passed=attempt.passed if exam.results_published else None,
            integrity_score=attempt.integrity_score,
            review_status=attempt.review_status,
            total_marks=exam.total_marks,
            passing_marks=exam.passing_marks,
            results_published=exam.results_published,
        )

    # ---------------------------------------------------------
    # PROCTORING EVENTS & INTEGRITY SCORING ENGINE
    # ---------------------------------------------------------

    def ingest_proctoring_events(
        self,
        db: Session,
        attempt_id: str,
        events_batch: List[ProctoringEventCreate],
        current_user: User,
    ) -> Dict[str, Any]:
        """Ingest batch of proctoring event signals and compute live integrity score."""
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt with ID '{attempt_id}' not found.",
            )

        if attempt.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot submit proctoring events for another student's attempt.",
            )

        for ev in events_batch:
            event = ProctoringEvent(
                attempt_id=attempt.id,
                event_type=ev.event_type,
                severity=ev.severity.value,
                timestamp=ev.timestamp,
                duration_seconds=ev.duration_seconds,
                metadata_json=ev.metadata_json,
            )
            db.add(event)

        db.flush()

        # Recalculate dynamic integrity score
        all_events = (
            db.query(ProctoringEvent)
            .filter(ProctoringEvent.attempt_id == attempt_id)
            .all()
        )

        score = 100.0
        crit_count = 0
        high_count = 0

        for ev in all_events:
            sev = ev.severity
            if sev == EventSeverity.CRITICAL.value:
                score -= 25.0
                crit_count += 1
            elif sev == EventSeverity.HIGH.value:
                score -= 15.0
                high_count += 1
            elif sev == EventSeverity.MEDIUM.value:
                score -= 8.0
            elif sev == EventSeverity.LOW.value:
                score -= 3.0

        clamped_score = max(0.0, min(100.0, score))
        attempt.integrity_score = round(clamped_score, 1)

        # Flag for review if risk threshold exceeded
        if clamped_score < 75.0 or crit_count >= 1 or high_count >= 3:
            if attempt.review_status == ReviewStatus.NOT_REVIEWED.value:
                attempt.review_status = ReviewStatus.REVIEW_REQUIRED.value

        db.commit()
        db.refresh(attempt)

        return {
            "success": True,
            "attempt_id": attempt.id,
            "integrity_score": attempt.integrity_score,
            "review_status": attempt.review_status,
            "events_logged": len(events_batch),
        }

    # ---------------------------------------------------------
    # FACULTY PROCTORING DASHBOARD & MANUAL REVIEW
    # ---------------------------------------------------------

    def get_faculty_proctoring_dashboard(
        self, db: Session, exam_id: str, current_user: User
    ) -> FacultyProctoringDashboard:
        """Fetch real exam proctoring dashboard and student attempts roster."""
        exam = self.get_exam_by_id(db, exam_id, current_user)
        self.verify_faculty_course_auth(db, current_user, exam.course_id)

        # Enrolled students
        enrollments = (
            db.query(Enrollment)
            .join(User, Enrollment.student_id == User.id)
            .filter(
                Enrollment.course_id == exam.course_id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .order_by(User.last_name.asc(), User.first_name.asc())
            .all()
        )

        attempts_map = {
            a.student_id: a
            for a in db.query(ExamAttempt)
            .filter(ExamAttempt.exam_id == exam_id)
            .all()
        }

        roster_rows: List[StudentAttemptRosterRow] = []
        integrity_scores: List[float] = []
        exam_scores: List[float] = []
        flagged_count = 0

        for enr in enrollments:
            stu = enr.student
            att = attempts_map.get(stu.id)

            if att:
                integrity_scores.append(att.integrity_score)
                if att.score is not None:
                    exam_scores.append(att.score)
                if att.review_status == ReviewStatus.REVIEW_REQUIRED.value:
                    flagged_count += 1

                # Count violations
                v_total = len(att.proctoring_events)
                v_high = sum(
                    1
                    for ev in att.proctoring_events
                    if ev.severity in [EventSeverity.HIGH.value, EventSeverity.CRITICAL.value]
                )

                roster_rows.append(
                    StudentAttemptRosterRow(
                        attempt_id=att.id,
                        student_id=stu.id,
                        student_name=f"{stu.first_name} {stu.last_name}",
                        student_email=stu.email,
                        student_identifier=stu.student_identifier,
                        attempt_number=att.attempt_number,
                        started_at=att.started_at,
                        submitted_at=att.submitted_at,
                        status=att.status,
                        score=att.score,
                        percentage=att.percentage,
                        passed=att.passed,
                        integrity_score=att.integrity_score,
                        review_status=att.review_status,
                        total_violations_count=v_total,
                        high_violations_count=v_high,
                    )
                )
            else:
                roster_rows.append(
                    StudentAttemptRosterRow(
                        student_id=stu.id,
                        student_name=f"{stu.first_name} {stu.last_name}",
                        student_email=stu.email,
                        student_identifier=stu.student_identifier,
                        attempt_number=0,
                        status="NOT_STARTED",
                        integrity_score=100.0,
                        review_status=ReviewStatus.NOT_REVIEWED.value,
                    )
                )

        avg_integrity = (
            round(sum(integrity_scores) / len(integrity_scores), 1)
            if integrity_scores
            else 100.0
        )
        avg_score = (
            round(sum(exam_scores) / len(exam_scores), 2)
            if exam_scores
            else None
        )

        return FacultyProctoringDashboard(
            exam=ExamResponse.model_validate(exam),
            total_enrolled=len(enrollments),
            total_started=len(attempts_map),
            total_submitted=sum(
                1
                for a in attempts_map.values()
                if a.status in [AttemptStatus.SUBMITTED.value, AttemptStatus.AUTO_SUBMITTED.value, AttemptStatus.EVALUATED.value]
            ),
            total_flagged_for_review=flagged_count,
            average_integrity_score=avg_integrity,
            average_score=avg_score,
            roster=roster_rows,
        )

    def review_attempt_integrity(
        self,
        db: Session,
        attempt_id: str,
        payload: ReviewAttemptPayload,
        current_user: User,
    ) -> ExamAttempt:
        """Faculty records manual integrity review decision."""
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt with ID '{attempt_id}' not found.",
            )

        self.verify_faculty_course_auth(db, current_user, attempt.exam.course_id)

        attempt.review_status = payload.review_status.value
        attempt.review_notes = payload.review_notes
        attempt.reviewed_by = current_user.id
        attempt.reviewed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(attempt)
        return attempt


assessment_service = AssessmentService()
