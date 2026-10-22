"""create_learning_content_and_progress_tables

Revision ID: 5f182c87a110
Revises: 4e344dbfbbb0
Create Date: 2026-08-31 06:45:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f182c87a110'
down_revision: Union[str, None] = '4e344dbfbbb0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create learning_contents table
    op.create_table(
        'learning_contents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('topic_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('content_type', sa.String(length=30), nullable=False),
        sa.Column('content_url', sa.String(length=1000), nullable=True),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.String(length=1000), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='DRAFT'),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('topic_id', 'display_order', name='uq_topic_content_order'),
        sa.CheckConstraint(
            "content_type IN ('VIDEO', 'DOCUMENT', 'PDF', 'PRESENTATION', 'EXTERNAL_LINK', 'TEXT_CONTENT', 'IMAGE', 'EMBEDDED_CONTENT')",
            name='check_learning_content_type'
        ),
        sa.CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
            name='check_learning_content_status'
        )
    )
    op.create_index(op.f('ix_learning_contents_topic_id'), 'learning_contents', ['topic_id'], unique=False)
    op.create_index(op.f('ix_learning_contents_content_type'), 'learning_contents', ['content_type'], unique=False)
    op.create_index(op.f('ix_learning_contents_status'), 'learning_contents', ['status'], unique=False)
    op.create_index(op.f('ix_learning_contents_created_by'), 'learning_contents', ['created_by'], unique=False)

    # 2. Create student_content_progress table
    op.create_table(
        'student_content_progress',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('content_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='NOT_STARTED'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['content_id'], ['learning_contents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'content_id', name='uq_student_content_progress'),
        sa.CheckConstraint(
            "status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')",
            name='check_content_progress_status'
        )
    )
    op.create_index(op.f('ix_student_content_progress_student_id'), 'student_content_progress', ['student_id'], unique=False)
    op.create_index(op.f('ix_student_content_progress_content_id'), 'student_content_progress', ['content_id'], unique=False)
    op.create_index(op.f('ix_student_content_progress_status'), 'student_content_progress', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_student_content_progress_status'), table_name='student_content_progress')
    op.drop_index(op.f('ix_student_content_progress_content_id'), table_name='student_content_progress')
    op.drop_index(op.f('ix_student_content_progress_student_id'), table_name='student_content_progress')
    op.drop_table('student_content_progress')

    op.drop_index(op.f('ix_learning_contents_created_by'), table_name='learning_contents')
    op.drop_index(op.f('ix_learning_contents_status'), table_name='learning_contents')
    op.drop_index(op.f('ix_learning_contents_content_type'), table_name='learning_contents')
    op.drop_index(op.f('ix_learning_contents_topic_id'), table_name='learning_contents')
    op.drop_table('learning_contents')
