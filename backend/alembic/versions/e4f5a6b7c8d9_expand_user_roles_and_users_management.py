"""expand user roles for users management

Revision ID: e4f5a6b7c8d9
Revises: d2e3f4a5b6c7
Create Date: 2026-03-25 16:20:00.000000
"""

from alembic import op


revision = "e4f5a6b7c8d9"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    for value in ["DIRECTOR", "HR", "ZONE_MANAGER"]:
        bind.exec_driver_sql(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL enum value removal is not trivial; keep existing values on downgrade.
    pass
