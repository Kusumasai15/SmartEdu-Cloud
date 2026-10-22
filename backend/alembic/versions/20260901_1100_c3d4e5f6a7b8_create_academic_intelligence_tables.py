"""Create academic intelligence, risk snapshots, and early warning tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-01 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. risk_configurations
    op.create_table(
        'risk_configurations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('attendance_weight', sa.Float(), nullable=False, server_default=sa.text('25.0')),
        sa.Column('assignment_weight', sa.Float(), nullable=False, server_default=sa.text('20.0')),
        sa.Column('exam_weight', sa.Float(), nullable=False, server_default=sa.text('30.0')),
        sa.Column('trend_weight', sa.Float(), nullable=False, server_default=sa.text('25.0')),
        sa.Column('attendance_critical_threshold', sa.Float(), nullable=False, server_default=sa.text('65.0')),
        sa.Column('attendance_warning_threshold', sa.Float(), nullable=False, server_default=sa.text('75.0')),
        sa.Column('gpa_critical_threshold', sa.Float(), nullable=False, server_default=sa.text('5.0')),
        sa.Column('gpa_warning_threshold', sa.Float(), nullable=False, server_default=sa.text('6.5')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 2. academic_risk_snapshots
    op.create_table(
        'academic_risk_snapshots',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('semester_id', sa.String(length=36), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('risk_level', sa.String(length=30), nullable=False, server_default=sa.text("'LOW'")),
        sa.Column('performance_trend', sa.String(length=30), nullable=False, server_default=sa.text("'STABLE'")),
        sa.Column('current_gpa', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('cumulative_gpa', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('attendance_percentage', sa.Float(), nullable=False, server_default=sa.text('100.0')),
        sa.Column('assignment_completion_rate', sa.Float(), nullable=False, server_default=sa.text('100.0')),
        sa.Column('exam_average_percentage', sa.Float(), nullable=False, server_default=sa.text('100.0')),
        sa.Column('failed_courses_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('primary_risk_factors', sa.Text(), nullable=True),
        sa.Column('snapshot_date', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_risk_snapshots_student_date', 'academic_risk_snapshots', ['student_id', 'snapshot_date'])
    op.create_index('ix_risk_snapshots_level', 'academic_risk_snapshots', ['risk_level'])

    # 3. insight_alerts
    op.create_table(
        'insight_alerts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('dedup_key', sa.String(length=255), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dedup_key')
    )
    op.create_index('ix_insight_alerts_user_read', 'insight_alerts', ['user_id', 'is_read'])


def downgrade() -> None:
    op.drop_index('ix_insight_alerts_user_read', table_name='insight_alerts')
    op.drop_table('insight_alerts')
    op.drop_index('ix_risk_snapshots_level', table_name='academic_risk_snapshots')
    op.drop_index('ix_risk_snapshots_student_date', table_name='academic_risk_snapshots')
    op.drop_table('academic_risk_snapshots')
    op.drop_table('risk_configurations')
