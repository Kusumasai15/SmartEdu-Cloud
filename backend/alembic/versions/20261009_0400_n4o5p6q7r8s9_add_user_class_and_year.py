"""Add class_name and academic_year to users table.

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
"""
from alembic import op
import sqlalchemy as sa

revision = "n4o5p6q7r8s9"
down_revision = "m3n4o5p6q7r8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [c["name"] for c in insp.get_columns("users")]
    if "class_name" not in columns:
        op.add_column("users", sa.Column("class_name", sa.String(150), nullable=True))
    if "academic_year" not in columns:
        op.add_column("users", sa.Column("academic_year", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "academic_year")
    op.drop_column("users", "class_name")
