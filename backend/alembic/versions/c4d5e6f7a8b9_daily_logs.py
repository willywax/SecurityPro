"""Add daily log tables for zone manager shift reporting.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "daily_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id", ondelete="SET NULL"), nullable=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("log_date", sa.Date(), nullable=False),
        sa.Column("shift", sa.String(), nullable=False),
        sa.Column("submission_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("overall_status", sa.String(), nullable=False, server_default="normal"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_daily_logs_org_id", "daily_logs", ["org_id"])
    op.create_index("ix_daily_logs_site_id", "daily_logs", ["site_id"])
    op.create_index("ix_daily_logs_zone_id", "daily_logs", ["zone_id"])
    op.create_index("ix_daily_logs_log_date", "daily_logs", ["log_date"])
    op.create_index("ix_daily_logs_submitted_by", "daily_logs", ["submitted_by"])

    op.create_table(
        "daily_log_attendance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("log_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("employee_name", sa.String(), nullable=False),
        sa.Column("guard_no", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="present"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_dla_log_id", "daily_log_attendance", ["log_id"])
    op.create_index("ix_dla_employee_id", "daily_log_attendance", ["employee_id"])
    op.create_index("ix_dla_org_id", "daily_log_attendance", ["org_id"])

    op.create_table(
        "daily_log_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("log_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("incident_type", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False, server_default="low"),
        sa.Column("reported_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_dli_log_id", "daily_log_incidents", ["log_id"])
    op.create_index("ix_dli_org_id", "daily_log_incidents", ["org_id"])


def downgrade():
    op.drop_index("ix_dli_org_id", table_name="daily_log_incidents")
    op.drop_index("ix_dli_log_id", table_name="daily_log_incidents")
    op.drop_table("daily_log_incidents")

    op.drop_index("ix_dla_org_id", table_name="daily_log_attendance")
    op.drop_index("ix_dla_employee_id", table_name="daily_log_attendance")
    op.drop_index("ix_dla_log_id", table_name="daily_log_attendance")
    op.drop_table("daily_log_attendance")

    op.drop_index("ix_daily_logs_submitted_by", table_name="daily_logs")
    op.drop_index("ix_daily_logs_log_date", table_name="daily_logs")
    op.drop_index("ix_daily_logs_zone_id", table_name="daily_logs")
    op.drop_index("ix_daily_logs_site_id", table_name="daily_logs")
    op.drop_index("ix_daily_logs_org_id", table_name="daily_logs")
    op.drop_table("daily_logs")
