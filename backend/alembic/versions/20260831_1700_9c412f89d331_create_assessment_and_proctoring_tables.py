"""create_assessment_and_proctoring_tables

Revision ID: 9c412f89d331
Revises: 7b291d34e221
Create Date: 2026-08-31 17:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c412f89d331'
down_revision: Union[str, None] = '7b291d34e221'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create questions table
    op.create_table(
        'questions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('module_id', sa.String(length=36), nullable=True),
        sa.Column('topic_id', sa.String(length=36), nullable=True),
        sa.Column('question_type', sa.String(length=20), nullable=False, server_default='MCQ_SINGLE'),
        sa.Column('difficulty', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('points', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('negative_points', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "question_type IN ('MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER')",
            name='check_question_type'
        ),
        sa.CheckConstraint(
            "difficulty IN ('EASY', 'MEDIUM', 'HARD')",
            name='check_question_difficulty'
        ),
        sa.CheckConstraint('points > 0', name='check_question_points_positive'),
        sa.CheckConstraint('negative_points >= 0', name='check_question_negative_points_non_negative')
    )
    op.create_index(op.f('ix_questions_course_id'), 'questions', ['course_id'], unique=False)
    op.create_index(op.f('ix_questions_module_id'), 'questions', ['module_id'], unique=False)
    op.create_index(op.f('ix_questions_topic_id'), 'questions', ['topic_id'], unique=False)
    op.create_index(op.f('ix_questions_question_type'), 'questions', ['question_type'], unique=False)
    op.create_index(op.f('ix_questions_difficulty'), 'questions', ['difficulty'], unique=False)
    op.create_index(op.f('ix_questions_created_by'), 'questions', ['created_by'], unique=False)

    # 2. Create question_options table
    op.create_table(
        'question_options',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('question_id', sa.String(length=36), nullable=False),
        sa.Column('option_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_question_options_question_id'), 'question_options', ['question_id'], unique=False)

    # 3. Create exams table
    op.create_table(
        'exams',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('exam_type', sa.String(length=20), nullable=False, server_default='QUIZ'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('total_marks', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('passing_marks', sa.Float(), nullable=False, server_default='40.0'),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('results_published', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('allow_review', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('randomize_questions', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('randomize_options', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "exam_type IN ('QUIZ', 'MIDTERM', 'ENDTERM', 'PRACTICE')",
            name='check_exam_type'
        ),
        sa.CheckConstraint('duration_minutes > 0', name='check_exam_duration_positive'),
        sa.CheckConstraint('total_marks > 0', name='check_exam_total_marks_positive'),
        sa.CheckConstraint('passing_marks >= 0 AND passing_marks <= total_marks', name='check_exam_passing_marks'),
        sa.CheckConstraint('max_attempts > 0', name='check_exam_max_attempts_positive')
    )
    op.create_index(op.f('ix_exams_course_id'), 'exams', ['course_id'], unique=False)
    op.create_index(op.f('ix_exams_exam_type'), 'exams', ['exam_type'], unique=False)
    op.create_index(op.f('ix_exams_is_published'), 'exams', ['is_published'], unique=False)
    op.create_index(op.f('ix_exams_created_by'), 'exams', ['created_by'], unique=False)

    # 4. Create exam_questions association table
    op.create_table(
        'exam_questions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('exam_id', sa.String(length=36), nullable=False),
        sa.Column('question_id', sa.String(length=36), nullable=False),
        sa.Column('points_override', sa.Float(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('exam_id', 'question_id', name='uq_exam_question')
    )
    op.create_index(op.f('ix_exam_questions_exam_id'), 'exam_questions', ['exam_id'], unique=False)
    op.create_index(op.f('ix_exam_questions_question_id'), 'exam_questions', ['question_id'], unique=False)

    # 5. Create proctoring_policies table
    op.create_table(
        'proctoring_policies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('exam_id', sa.String(length=36), nullable=False),
        sa.Column('proctoring_mode', sa.String(length=30), nullable=False, server_default='BASIC_PROCTORED'),
        sa.Column('fullscreen_required', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('camera_required', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('microphone_required', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('screen_share_required', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('tab_switch_detection', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('window_blur_detection', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('copy_paste_prevention', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('context_menu_disabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('keyboard_shortcut_detection', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('auto_submit_on_expiry', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('max_violations_warning', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('exam_id', name='uq_proctoring_policy_exam'),
        sa.CheckConstraint(
            "proctoring_mode IN ('NONE', 'BASIC_PROCTORED', 'STANDARD_PROCTORED', 'STRICT_PROCTORED')",
            name='check_proctoring_mode'
        )
    )
    op.create_index(op.f('ix_proctoring_policies_exam_id'), 'proctoring_policies', ['exam_id'], unique=True)

    # 6. Create exam_attempts table
    op.create_table(
        'exam_attempts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('exam_id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='IN_PROGRESS'),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('passed', sa.Boolean(), nullable=True),
        sa.Column('integrity_score', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('review_status', sa.String(length=30), nullable=False, server_default='NOT_REVIEWED'),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('question_order_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('exam_id', 'student_id', 'attempt_number', name='uq_exam_student_attempt'),
        sa.CheckConstraint(
            "status IN ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'EVALUATED')",
            name='check_attempt_status'
        ),
        sa.CheckConstraint(
            "review_status IN ('NOT_REVIEWED', 'REVIEW_REQUIRED', 'CLEARED', 'VIOLATION_CONFIRMED')",
            name='check_review_status'
        ),
        sa.CheckConstraint('integrity_score >= 0 AND integrity_score <= 100', name='check_integrity_score_bounds')
    )
    op.create_index(op.f('ix_exam_attempts_exam_id'), 'exam_attempts', ['exam_id'], unique=False)
    op.create_index(op.f('ix_exam_attempts_student_id'), 'exam_attempts', ['student_id'], unique=False)
    op.create_index(op.f('ix_exam_attempts_expires_at'), 'exam_attempts', ['expires_at'], unique=False)
    op.create_index(op.f('ix_exam_attempts_status'), 'exam_attempts', ['status'], unique=False)
    op.create_index(op.f('ix_exam_attempts_review_status'), 'exam_attempts', ['review_status'], unique=False)

    # 7. Create exam_answers table
    op.create_table(
        'exam_answers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('attempt_id', sa.String(length=36), nullable=False),
        sa.Column('question_id', sa.String(length=36), nullable=False),
        sa.Column('selected_option_ids_json', sa.Text(), nullable=True),
        sa.Column('text_answer', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('marks_awarded', sa.Float(), nullable=True),
        sa.Column('saved_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['attempt_id'], ['exam_attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question_answer')
    )
    op.create_index(op.f('ix_exam_answers_attempt_id'), 'exam_answers', ['attempt_id'], unique=False)
    op.create_index(op.f('ix_exam_answers_question_id'), 'exam_answers', ['question_id'], unique=False)

    # 8. Create proctoring_events table
    op.create_table(
        'proctoring_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('attempt_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='INFO'),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['attempt_id'], ['exam_attempts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            name='check_event_severity'
        )
    )
    op.create_index(op.f('ix_proctoring_events_attempt_id'), 'proctoring_events', ['attempt_id'], unique=False)
    op.create_index(op.f('ix_proctoring_events_event_type'), 'proctoring_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_proctoring_events_timestamp'), 'proctoring_events', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_proctoring_events_timestamp'), table_name='proctoring_events')
    op.drop_index(op.f('ix_proctoring_events_event_type'), table_name='proctoring_events')
    op.drop_index(op.f('ix_proctoring_events_attempt_id'), table_name='proctoring_events')
    op.drop_table('proctoring_events')

    op.drop_index(op.f('ix_exam_answers_question_id'), table_name='exam_answers')
    op.drop_index(op.f('ix_exam_answers_attempt_id'), table_name='exam_answers')
    op.drop_table('exam_answers')

    op.drop_index(op.f('ix_exam_attempts_review_status'), table_name='exam_attempts')
    op.drop_index(op.f('ix_exam_attempts_status'), table_name='exam_attempts')
    op.drop_index(op.f('ix_exam_attempts_expires_at'), table_name='exam_attempts')
    op.drop_index(op.f('ix_exam_attempts_student_id'), table_name='exam_attempts')
    op.drop_index(op.f('ix_exam_attempts_exam_id'), table_name='exam_attempts')
    op.drop_table('exam_attempts')

    op.drop_index(op.f('ix_proctoring_policies_exam_id'), table_name='proctoring_policies')
    op.drop_table('proctoring_policies')

    op.drop_index(op.f('ix_exam_questions_question_id'), table_name='exam_questions')
    op.drop_index(op.f('ix_exam_questions_exam_id'), table_name='exam_questions')
    op.drop_table('exam_questions')

    op.drop_index(op.f('ix_exams_created_by'), table_name='exams')
    op.drop_index(op.f('ix_exams_is_published'), table_name='exams')
    op.drop_index(op.f('ix_exams_exam_type'), table_name='exams')
    op.drop_index(op.f('ix_exams_course_id'), table_name='exams')
    op.drop_table('exams')

    op.drop_index(op.f('ix_question_options_question_id'), table_name='question_options')
    op.drop_table('question_options')

    op.drop_index(op.f('ix_questions_created_by'), table_name='questions')
    op.drop_index(op.f('ix_questions_difficulty'), table_name='questions')
    op.drop_index(op.f('ix_questions_question_type'), table_name='questions')
    op.drop_index(op.f('ix_questions_topic_id'), table_name='questions')
    op.drop_index(op.f('ix_questions_module_id'), table_name='questions')
    op.drop_index(op.f('ix_questions_course_id'), table_name='questions')
    op.drop_table('questions')
