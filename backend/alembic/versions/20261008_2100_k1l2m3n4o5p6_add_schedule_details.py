"""Add timetable week and lesson metadata.

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
"""
from alembic import op
import sqlalchemy as sa

revision = "k1l2m3n4o5p6"
down_revision = "j0k1l2m3n4o5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("class_schedules", sa.Column("week_number", sa.String(length=3), nullable=False, server_default="1"))
    op.add_column("class_schedules", sa.Column("lecture_title", sa.String(length=200), nullable=True))
    op.add_column("class_schedules", sa.Column("session_type", sa.String(length=30), nullable=False, server_default="LECTURE"))


def downgrade() -> None:
    op.drop_column("class_schedules", "session_type")
    op.drop_column("class_schedules", "lecture_title")
    op.drop_column("class_schedules", "week_number")
