"""Create communication, notifications, announcements, and messaging tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-01 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('recipient_id', sa.String(length=36), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False, server_default=sa.text("'ACADEMIC'")),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default=sa.text("'NORMAL'")),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'UNREAD'")),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=True),
        sa.Column('source_id', sa.String(length=36), nullable=True),
        sa.Column('action_url', sa.String(length=255), nullable=True),
        sa.Column('dedup_key', sa.String(length=255), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_recipient_status', 'notifications', ['recipient_id', 'status'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_dedup_key', 'notifications', ['dedup_key'])

    # 2. notification_preferences
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('academic_alerts', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('assignment_reminders', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('exam_notifications', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('result_notifications', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('announcements_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('ai_insights_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # 3. announcements
    op.create_table(
        'announcements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('author_id', sa.String(length=36), nullable=False),
        sa.Column('scope_type', sa.String(length=30), nullable=False, server_default=sa.text("'COURSE'")),
        sa.Column('scope_id', sa.String(length=36), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default=sa.text("'NORMAL'")),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'PUBLISHED'")),
        sa.Column('is_acknowledgement_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('publish_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_announcements_scope', 'announcements', ['scope_type', 'scope_id'])
    op.create_index('ix_announcements_status', 'announcements', ['status'])

    # 4. announcement_acknowledgements
    op.create_table(
        'announcement_acknowledgements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('announcement_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['announcement_id'], ['announcements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('announcement_id', 'user_id', name='uq_announcement_user_ack')
    )

    # 5. conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('conversation_type', sa.String(length=30), nullable=False, server_default=sa.text("'DIRECT'")),
        sa.Column('course_id', sa.String(length=36), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. conversation_participants
    op.create_table(
        'conversation_participants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('last_read_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_participant')
    )
    op.create_index('ix_conv_participants_user', 'conversation_participants', ['user_id'])

    # 7. direct_messages
    op.create_table(
        'direct_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('sender_id', sa.String(length=36), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_edited', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_messages_conv_created', 'direct_messages', ['conversation_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_messages_conv_created', table_name='direct_messages')
    op.drop_table('direct_messages')
    op.drop_index('ix_conv_participants_user', table_name='conversation_participants')
    op.drop_table('conversation_participants')
    op.drop_table('conversations')
    op.drop_table('announcement_acknowledgements')
    op.drop_index('ix_announcements_status', table_name='announcements')
    op.drop_index('ix_announcements_scope', table_name='announcements')
    op.drop_table('announcements')
    op.drop_table('notification_preferences')
    op.drop_index('ix_notifications_dedup_key', table_name='notifications')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_recipient_status', table_name='notifications')
    op.drop_table('notifications')
