"""create_attendance_and_timetable_tables

Revision ID: a1b2c3d4e5f6
Revises: 9c412f89d331
Create Date: 2026-09-01 09:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c412f89d331'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create class_schedules table
    op.create_table(
        'class_schedules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('faculty_id', sa.String(length=36), nullable=False),
        sa.Column('section_name', sa.String(length=50), nullable=True, server_default='A'),
        sa.Column('day_of_week', sa.String(length=20), nullable=False),
        sa.Column('start_time', sa.String(length=10), nullable=False),
        sa.Column('end_time', sa.String(length=10), nullable=False),
        sa.Column('room', sa.String(length=50), nullable=False),
        sa.Column('building', sa.String(length=100), nullable=True),
        sa.Column('academic_period', sa.String(length=50), nullable=False, server_default='Fall 2026'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['faculty_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_class_schedules_course_id', 'class_schedules', ['course_id'], unique=False)
    op.create_index('ix_class_schedules_faculty_id', 'class_schedules', ['faculty_id'], unique=False)
    op.create_index('ix_schedule_faculty_day_time', 'class_schedules', ['faculty_id', 'day_of_week', 'start_time', 'end_time'], unique=False)
    op.create_index('ix_schedule_room_day_time', 'class_schedules', ['room', 'day_of_week', 'start_time', 'end_time'], unique=False)
    op.create_index('ix_schedule_course_section_day', 'class_schedules', ['course_id', 'section_name', 'day_of_week', 'start_time', 'end_time'], unique=False)

    # 2. Create attendance_sessions table
    op.create_table(
        'attendance_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('faculty_id', sa.String(length=36), nullable=False),
        sa.Column('schedule_id', sa.String(length=36), nullable=True),
        sa.Column('session_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(length=10), nullable=True),
        sa.Column('end_time', sa.String(length=10), nullable=True),
        sa.Column('topic_covered', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='OPEN'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['faculty_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['schedule_id'], ['class_schedules.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_attendance_sessions_course_id', 'attendance_sessions', ['course_id'], unique=False)
    op.create_index('ix_attendance_sessions_faculty_id', 'attendance_sessions', ['faculty_id'], unique=False)
    op.create_index('ix_attendance_sessions_schedule_id', 'attendance_sessions', ['schedule_id'], unique=False)
    op.create_index('ix_attendance_sessions_session_date', 'attendance_sessions', ['session_date'], unique=False)

    # 3. Create attendance_records table
    op.create_table(
        'attendance_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PRESENT'),
        sa.Column('minutes_late', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('remarks', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['attendance_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id', 'student_id', name='uq_session_student_attendance')
    )
    op.create_index('ix_attendance_records_session_id', 'attendance_records', ['session_id'], unique=False)
    op.create_index('ix_attendance_records_student_id', 'attendance_records', ['student_id'], unique=False)
    op.create_index('ix_record_student_status', 'attendance_records', ['student_id', 'status'], unique=False)

    # 4. Create attendance_corrections table
    op.create_table(
        'attendance_corrections',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('record_id', sa.String(length=36), nullable=False),
        sa.Column('original_status', sa.String(length=20), nullable=False),
        sa.Column('requested_status', sa.String(length=20), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('requested_by', sa.String(length=36), nullable=False),
        sa.Column('requested_at', sa.String(length=30), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.String(length=30), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('approval_status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['record_id'], ['attendance_records.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_attendance_corrections_record_id', 'attendance_corrections', ['record_id'], unique=False)


def downgrade() -> None:
    op.drop_table('attendance_corrections')
    op.drop_table('attendance_records')
    op.drop_table('attendance_sessions')
    op.drop_table('class_schedules')
