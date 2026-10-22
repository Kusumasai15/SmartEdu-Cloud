"""Create academic calendar events, rooms, leave requests, change logs, and substitution tables

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-01 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. academic_calendar_events
    op.create_table(
        'academic_calendar_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('semester_id', sa.String(length=36), nullable=True),
        sa.Column('department_id', sa.String(length=36), nullable=True),
        sa.Column('event_type', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_instructional_day', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_academic_calendar_events_start_date', 'academic_calendar_events', ['start_date'])
    op.create_index('ix_academic_calendar_events_end_date', 'academic_calendar_events', ['end_date'])
    op.create_index('ix_academic_calendar_events_semester_id', 'academic_calendar_events', ['semester_id'])
    op.create_index('ix_academic_calendar_events_department_id', 'academic_calendar_events', ['department_id'])

    # 2. academic_rooms
    op.create_table(
        'academic_rooms',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('building', sa.String(length=100), nullable=False),
        sa.Column('room_number', sa.String(length=50), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default=sa.text('60')),
        sa.Column('room_type', sa.String(length=30), nullable=False, server_default=sa.text("'CLASSROOM'")),
        sa.Column('has_projector', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('has_recording', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('building', 'room_number', name='uq_room_building_number')
    )
    op.create_index('ix_rooms_building_type', 'academic_rooms', ['building', 'room_type'])

    # 3. student_leave_requests
    op.create_table(
        'student_leave_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('leave_type', sa.String(length=30), nullable=False, server_default=sa.text("'PERSONAL'")),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default=sa.text("'SUBMITTED'")),
        sa.Column('reviewer_id', sa.String(length=36), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_student_leave_requests_student_id', 'student_leave_requests', ['student_id'])
    op.create_index('ix_student_leave_requests_start_date', 'student_leave_requests', ['start_date'])
    op.create_index('ix_student_leave_requests_end_date', 'student_leave_requests', ['end_date'])
    op.create_index('ix_leave_student_status', 'student_leave_requests', ['student_id', 'status'])

    # 4. schedule_change_logs
    op.create_table(
        'schedule_change_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('schedule_id', sa.String(length=36), nullable=False),
        sa.Column('old_day', sa.String(length=20), nullable=True),
        sa.Column('old_start_time', sa.String(length=10), nullable=True),
        sa.Column('old_end_time', sa.String(length=10), nullable=True),
        sa.Column('old_room', sa.String(length=50), nullable=True),
        sa.Column('new_day', sa.String(length=20), nullable=False),
        sa.Column('new_start_time', sa.String(length=10), nullable=False),
        sa.Column('new_end_time', sa.String(length=10), nullable=False),
        sa.Column('new_room', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('changed_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['schedule_id'], ['class_schedules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_schedule_change_logs_schedule_id', 'schedule_change_logs', ['schedule_id'])

    # 5. substitute_faculty_assignments
    op.create_table(
        'substitute_faculty_assignments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('schedule_id', sa.String(length=36), nullable=False),
        sa.Column('original_faculty_id', sa.String(length=36), nullable=False),
        sa.Column('substitute_faculty_id', sa.String(length=36), nullable=False),
        sa.Column('assigned_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default=sa.text("'ACTIVE'")),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['schedule_id'], ['class_schedules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['original_faculty_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['substitute_faculty_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_substitute_faculty_assignments_schedule_id', 'substitute_faculty_assignments', ['schedule_id'])
    op.create_index('ix_substitute_faculty_assignments_original_faculty_id', 'substitute_faculty_assignments', ['original_faculty_id'])
    op.create_index('ix_substitute_faculty_assignments_substitute_faculty_id', 'substitute_faculty_assignments', ['substitute_faculty_id'])
    op.create_index('ix_substitute_faculty_assignments_assigned_date', 'substitute_faculty_assignments', ['assigned_date'])


def downgrade() -> None:
    op.drop_index('ix_substitute_faculty_assignments_assigned_date', table_name='substitute_faculty_assignments')
    op.drop_index('ix_substitute_faculty_assignments_substitute_faculty_id', table_name='substitute_faculty_assignments')
    op.drop_index('ix_substitute_faculty_assignments_original_faculty_id', table_name='substitute_faculty_assignments')
    op.drop_index('ix_substitute_faculty_assignments_schedule_id', table_name='substitute_faculty_assignments')
    op.drop_table('substitute_faculty_assignments')
    op.drop_index('ix_schedule_change_logs_schedule_id', table_name='schedule_change_logs')
    op.drop_table('schedule_change_logs')
    op.drop_index('ix_leave_student_status', table_name='student_leave_requests')
    op.drop_index('ix_student_leave_requests_end_date', table_name='student_leave_requests')
    op.drop_index('ix_student_leave_requests_start_date', table_name='student_leave_requests')
    op.drop_index('ix_student_leave_requests_student_id', table_name='student_leave_requests')
    op.drop_table('student_leave_requests')
    op.drop_index('ix_rooms_building_type', table_name='academic_rooms')
    op.drop_table('academic_rooms')
    op.drop_index('ix_academic_calendar_events_department_id', table_name='academic_calendar_events')
    op.drop_index('ix_academic_calendar_events_semester_id', table_name='academic_calendar_events')
    op.drop_index('ix_academic_calendar_events_end_date', table_name='academic_calendar_events')
    op.drop_index('ix_academic_calendar_events_start_date', table_name='academic_calendar_events')
    op.drop_table('academic_calendar_events')
