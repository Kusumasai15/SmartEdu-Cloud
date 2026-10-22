"""add user profile columns

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-09-09 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "g7h8i9j0k1l2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("bio", sa.String(length=1000), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("skills", sa.String(length=4000), nullable=True))
    op.add_column("users", sa.Column("certifications", sa.String(length=8000), nullable=True))
    op.add_column("users", sa.Column("achievements", sa.String(length=8000), nullable=True))
    op.add_column("users", sa.Column("notification_preferences", sa.String(length=2000), nullable=True))
    op.add_column("users", sa.Column("github_url", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("linkedin_url", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("website_url", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "website_url")
    op.drop_column("users", "linkedin_url")
    op.drop_column("users", "github_url")
    op.drop_column("users", "notification_preferences")
    op.drop_column("users", "achievements")
    op.drop_column("users", "certifications")
    op.drop_column("users", "skills")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "bio")
    op.drop_column("users", "phone")
