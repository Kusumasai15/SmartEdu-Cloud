"""Create results, gradebook, gpa, and transcript tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-01 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. grade_scales
    op.create_table(
        'grade_scales',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 2. grade_scale_items
    op.create_table(
        'grade_scale_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('grade_scale_id', sa.String(length=36), nullable=False),
        sa.Column('grade', sa.String(length=10), nullable=False),
        sa.Column('minimum_percentage', sa.Float(), nullable=False),
        sa.Column('maximum_percentage', sa.Float(), nullable=False),
        sa.Column('grade_point', sa.Float(), nullable=False),
        sa.Column('is_passing', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('description', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['grade_scale_id'], ['grade_scales.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('grade_scale_id', 'grade', name='uq_grade_scale_item_grade')
    )
    op.create_index('ix_grade_scale_items_scale_pct', 'grade_scale_items', ['grade_scale_id', 'minimum_percentage', 'maximum_percentage'])

    # 3. course_assessment_weights
    op.create_table(
        'course_assessment_weights',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('semester_id', sa.String(length=36), nullable=False),
        sa.Column('component_type', sa.String(length=50), nullable=False),
        sa.Column('weight_percentage', sa.Float(), nullable=False),
        sa.Column('minimum_passing_percentage', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id', 'semester_id', 'component_type', name='uq_course_semester_component_weight')
    )
    op.create_index('ix_course_assessment_weights_course_sem', 'course_assessment_weights', ['course_id', 'semester_id'])

    # 4. course_results
    op.create_table(
        'course_results',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('semester_id', sa.String(length=36), nullable=False),
        sa.Column('final_percentage', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('letter_grade', sa.String(length=10), nullable=False, server_default=sa.text("'F'")),
        sa.Column('grade_point', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('credits_earned', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('status', sa.String(length=30), nullable=False, server_default=sa.text("'DRAFT'")),
        sa.Column('academic_status', sa.String(length=30), nullable=False, server_default=sa.text("'FAIL'")),
        sa.Column('submitted_by', sa.String(length=36), nullable=True),
        sa.Column('submitted_at', sa.String(length=50), nullable=True),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('approved_at', sa.String(length=50), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'course_id', 'semester_id', name='uq_student_course_semester_result')
    )
    op.create_index('ix_course_results_student_sem', 'course_results', ['student_id', 'semester_id'])
    op.create_index('ix_course_results_course_status', 'course_results', ['course_id', 'status'])

    # 5. result_component_scores
    op.create_table(
        'result_component_scores',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('result_id', sa.String(length=36), nullable=False),
        sa.Column('component_type', sa.String(length=50), nullable=False),
        sa.Column('raw_score', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('max_score', sa.Float(), nullable=False, server_default=sa.text('100.0')),
        sa.Column('percentage', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('weight_percentage', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('weighted_score', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('is_missing', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('assessment_ref_id', sa.String(length=36), nullable=True),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['result_id'], ['course_results.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_result_components_result_type', 'result_component_scores', ['result_id', 'component_type'])

    # 6. result_correction_requests
    op.create_table(
        'result_correction_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('result_id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('course_id', sa.String(length=36), nullable=False),
        sa.Column('original_grade', sa.String(length=10), nullable=False),
        sa.Column('original_percentage', sa.Float(), nullable=False),
        sa.Column('requested_grade', sa.String(length=10), nullable=False),
        sa.Column('requested_percentage', sa.Float(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('requested_by', sa.String(length=36), nullable=False),
        sa.Column('requested_at', sa.String(length=50), nullable=False),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default=sa.text("'PENDING'")),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['result_id'], ['course_results.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_result_corrections_status_course', 'result_correction_requests', ['status', 'course_id'])

    # 7. semester_results
    op.create_table(
        'semester_results',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('semester_id', sa.String(length=36), nullable=False),
        sa.Column('total_credits_registered', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_credits_earned', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('gpa', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('status', sa.String(length=30), nullable=False, server_default=sa.text("'FINALIZED'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'semester_id', name='uq_student_semester_result')
    )
    op.create_index('ix_semester_results_student_sem', 'semester_results', ['student_id', 'semester_id'])


def downgrade() -> None:
    op.drop_index('ix_semester_results_student_sem', table_name='semester_results')
    op.drop_table('semester_results')
    op.drop_index('ix_result_corrections_status_course', table_name='result_correction_requests')
    op.drop_table('result_correction_requests')
    op.drop_index('ix_result_components_result_type', table_name='result_component_scores')
    op.drop_table('result_component_scores')
    op.drop_index('ix_course_results_course_status', table_name='course_results')
    op.drop_index('ix_course_results_student_sem', table_name='course_results')
    op.drop_table('course_results')
    op.drop_index('ix_course_assessment_weights_course_sem', table_name='course_assessment_weights')
    op.drop_table('course_assessment_weights')
    op.drop_index('ix_grade_scale_items_scale_pct', table_name='grade_scale_items')
    op.drop_table('grade_scale_items')
    op.drop_table('grade_scales')
