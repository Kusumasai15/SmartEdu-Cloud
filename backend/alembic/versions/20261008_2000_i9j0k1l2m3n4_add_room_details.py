"""Add building-floor-room inventory details.

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
"""

from alembic import op
import sqlalchemy as sa


revision = "i9j0k1l2m3n4"
down_revision = "h8i9j0k1l2m3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("academic_rooms", sa.Column("floor", sa.String(length=80), nullable=True))
    op.add_column("academic_rooms", sa.Column("display_name", sa.String(length=150), nullable=True))
    op.add_column("academic_rooms", sa.Column("room_category", sa.String(length=30), nullable=True))
    op.add_column("academic_rooms", sa.Column("facilities", sa.JSON(), nullable=True))
    op.add_column("academic_rooms", sa.Column("operational_status", sa.String(length=20), nullable=False, server_default="AVAILABLE"))


def downgrade() -> None:
    op.drop_column("academic_rooms", "operational_status")
    op.drop_column("academic_rooms", "facilities")
    op.drop_column("academic_rooms", "room_category")
    op.drop_column("academic_rooms", "display_name")
    op.drop_column("academic_rooms", "floor")
