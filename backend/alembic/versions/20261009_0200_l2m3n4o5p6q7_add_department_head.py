"""Add head_of_department to departments table.

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
"""
from alembic import op
import sqlalchemy as sa

revision = "l2m3n4o5p6q7"
down_revision = "k1l2m3n4o5p6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch_alter_table or add_column
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [c["name"] for c in insp.get_columns("departments")]
    if "head_of_department" not in columns:
        op.add_column("departments", sa.Column("head_of_department", sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column("departments", "head_of_department")
