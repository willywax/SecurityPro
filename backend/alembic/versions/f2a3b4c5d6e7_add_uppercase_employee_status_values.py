"""Add uppercase employee status enum values.

Revision ID: f2a3b4c5d6e7
Revises: d5e6f7a8b9c0
Create Date: 2026-06-03
"""
from alembic import op

revision = "f2a3b4c5d6e7"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade():
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'RESIGNED'")
        op.execute("ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'ABSCONDED'")
        op.execute("ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'REHIRED'")


def downgrade():
    # PostgreSQL enum value removal is not supported without rebuilding the type.
    pass
