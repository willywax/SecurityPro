"""Add user_zone_assignments table for role-based zone scoping.

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b3c4d5e6f7a8"
down_revision = "a2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_zone_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "zone_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("zones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("assigned_date", sa.Date(), nullable=False),
        sa.Column(
            "assigned_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_uza_user_id", "user_zone_assignments", ["user_id"])
    op.create_index("ix_uza_zone_id", "user_zone_assignments", ["zone_id"])
    op.create_index("ix_uza_org_id", "user_zone_assignments", ["org_id"])


def downgrade():
    op.drop_index("ix_uza_org_id", table_name="user_zone_assignments")
    op.drop_index("ix_uza_zone_id", table_name="user_zone_assignments")
    op.drop_index("ix_uza_user_id", table_name="user_zone_assignments")
    op.drop_table("user_zone_assignments")
