"""Add the department school field used by the application model.

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
"""

from alembic import op
import sqlalchemy as sa


revision = "h8i9j0k1l2m3"
down_revision = "g7h8i9j0k1l2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("departments", sa.Column("school", sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column("departments", "school")
