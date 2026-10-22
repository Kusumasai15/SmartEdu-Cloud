"""Add cohorts to departments table.

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
"""
from alembic import op
import sqlalchemy as sa

revision = "m3n4o5p6q7r8"
down_revision = "l2m3n4o5p6q7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [c["name"] for c in insp.get_columns("departments")]
    if "cohorts" not in columns:
        op.add_column("departments", sa.Column("cohorts", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("departments", "cohorts")
