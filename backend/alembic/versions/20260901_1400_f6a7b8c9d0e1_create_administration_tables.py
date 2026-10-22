"""create administration, governance, security and policy tables

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-01 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. admin_audit_events
    op.create_table(
        'admin_audit_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('actor_user_id', sa.String(length=36), nullable=True),
        sa.Column('actor_role', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=36), nullable=True),
        sa.Column('scope', sa.String(length=100), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('request_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_audit_events_actor_user_id'), 'admin_audit_events', ['actor_user_id'], unique=False)
    op.create_index(op.f('ix_admin_audit_events_action'), 'admin_audit_events', ['action'], unique=False)
    op.create_index(op.f('ix_admin_audit_events_resource_type'), 'admin_audit_events', ['resource_type'], unique=False)
    op.create_index(op.f('ix_admin_audit_events_resource_id'), 'admin_audit_events', ['resource_id'], unique=False)
    op.create_index('ix_admin_audit_action_time', 'admin_audit_events', ['action', 'created_at'], unique=False)
    op.create_index('ix_admin_audit_res_time', 'admin_audit_events', ['resource_type', 'created_at'], unique=False)

    # 2. security_event_logs
    op.create_table(
        'security_event_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_security_event_logs_event_type'), 'security_event_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_security_event_logs_severity'), 'security_event_logs', ['severity'], unique=False)
    op.create_index(op.f('ix_security_event_logs_user_id'), 'security_event_logs', ['user_id'], unique=False)
    op.create_index('ix_sec_event_time_sev', 'security_event_logs', ['created_at', 'severity'], unique=False)

    # 3. system_policies
    op.create_table(
        'system_policies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('current_version', sa.String(length=20), nullable=False),
        sa.Column('policy_value', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_policies_key'), 'system_policies', ['key'], unique=True)
    op.create_index(op.f('ix_system_policies_category'), 'system_policies', ['category'], unique=False)
    op.create_index(op.f('ix_system_policies_status'), 'system_policies', ['status'], unique=False)

    # 4. policy_version_histories
    op.create_table(
        'policy_version_histories',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('policy_id', sa.String(length=36), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('policy_value', sa.JSON(), nullable=False),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('changed_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['policy_id'], ['system_policies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_policy_version_histories_policy_id'), 'policy_version_histories', ['policy_id'], unique=False)

    # 5. system_configurations
    op.create_table(
        'system_configurations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('config_key', sa.String(length=100), nullable=False),
        sa.Column('config_value', sa.JSON(), nullable=False),
        sa.Column('is_sensitive', sa.Boolean(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_configurations_config_key'), 'system_configurations', ['config_key'], unique=True)


def downgrade() -> None:
    op.drop_table('system_configurations')
    op.drop_table('policy_version_histories')
    op.drop_table('system_policies')
    op.drop_table('security_event_logs')
    op.drop_table('admin_audit_events')
