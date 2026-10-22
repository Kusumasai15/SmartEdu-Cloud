"""create_assignments_and_submissions_tables

Revision ID: 7b291d34e221
Revises: 5f182c87a110
Create Date: 2026-08-31 16:05:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b291d34e221'
down_revision: Union[str, None] = '5f182c87a110'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create assignments table
    op.create_table(
        'assignments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('module_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.String(length=1000), nullable=True),
        sa.Column('max_points', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('passing_points', sa.Integer(), nullable=False, server_default='40'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('allow_late_submission', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='DRAFT'),
        sa.Column('results_published', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')",
            name='check_assignment_status'
        ),
        sa.CheckConstraint('max_points > 0', name='check_assignment_max_points_positive'),
        sa.CheckConstraint('passing_points >= 0 AND passing_points <= max_points', name='check_assignment_passing_points')
    )
    op.create_index(op.f('ix_assignments_course_id'), 'assignments', ['course_id'], unique=False)
    op.create_index(op.f('ix_assignments_module_id'), 'assignments', ['module_id'], unique=False)
    op.create_index(op.f('ix_assignments_due_date'), 'assignments', ['due_date'], unique=False)
    op.create_index(op.f('ix_assignments_status'), 'assignments', ['status'], unique=False)
    op.create_index(op.f('ix_assignments_created_by'), 'assignments', ['created_by'], unique=False)

    # 2. Create assignment_submissions table
    op.create_table(
        'assignment_submissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('assignment_id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('submission_text', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.String(length=1000), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('is_late', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('graded_by', sa.String(length=36), nullable=True),
        sa.Column('graded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='SUBMITTED'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['graded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assignment_id', 'student_id', name='uq_assignment_student_submission'),
        sa.CheckConstraint(
            "status IN ('SUBMITTED', 'GRADED', 'RESUBMITTED', 'RETURNED')",
            name='check_submission_status'
        )
    )
    op.create_index(op.f('ix_assignment_submissions_assignment_id'), 'assignment_submissions', ['assignment_id'], unique=False)
    op.create_index(op.f('ix_assignment_submissions_student_id'), 'assignment_submissions', ['student_id'], unique=False)
    op.create_index(op.f('ix_assignment_submissions_status'), 'assignment_submissions', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_assignment_submissions_status'), table_name='assignment_submissions')
    op.drop_index(op.f('ix_assignment_submissions_student_id'), table_name='assignment_submissions')
    op.drop_index(op.f('ix_assignment_submissions_assignment_id'), table_name='assignment_submissions')
    op.drop_table('assignment_submissions')

    op.drop_index(op.f('ix_assignments_created_by'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_status'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_due_date'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_module_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_course_id'), table_name='assignments')
    op.drop_table('assignments')
