"""Add site allocation tables and employee availability columns.

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a2b3c4d5e6f7"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. Create availability_status enum ─────────────────────────────────
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE availability_status AS ENUM ('available', 'allocated');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # ── 2. Add columns to employees ────────────────────────────────────────
    op.add_column("employees",
        sa.Column("current_site_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("employees",
        sa.Column(
            "availability_status",
            postgresql.ENUM("available", "allocated", name="availability_status", create_type=False),
            nullable=False,
            server_default="available",
        ))

    op.create_foreign_key(
        "fk_employee_current_site",
        "employees", "sites",
        ["current_site_id"], ["id"],
        ondelete="SET NULL",
    )

    # ── 3. Create employee_site_allocations table ───────────────────────────
    op.create_table(
        "employee_site_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("zones.id", ondelete="SET NULL"), nullable=True),
        sa.Column("allocated_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_esa_employee_id", "employee_site_allocations", ["employee_id"])
    op.create_index("ix_esa_site_id", "employee_site_allocations", ["site_id"])
    op.create_index("ix_esa_org_id", "employee_site_allocations", ["org_id"])

    # ── 4. Create guard_transfers table ────────────────────────────────────
    op.create_table(
        "guard_transfers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_site_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sites.id", ondelete="SET NULL"), nullable=True),
        sa.Column("to_site_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sites.id", ondelete="SET NULL"), nullable=True),
        sa.Column("transfer_date", sa.Date(), nullable=False),
        sa.Column("transferred_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_gt_employee_id", "guard_transfers", ["employee_id"])
    op.create_index("ix_gt_org_id", "guard_transfers", ["org_id"])


def downgrade():
    op.drop_index("ix_gt_org_id", table_name="guard_transfers")
    op.drop_index("ix_gt_employee_id", table_name="guard_transfers")
    op.drop_table("guard_transfers")
    op.drop_index("ix_esa_org_id", table_name="employee_site_allocations")
    op.drop_index("ix_esa_site_id", table_name="employee_site_allocations")
    op.drop_index("ix_esa_employee_id", table_name="employee_site_allocations")
    op.drop_table("employee_site_allocations")
    op.drop_constraint("fk_employee_current_site", "employees", type_="foreignkey")
    op.drop_column("employees", "availability_status")
    op.drop_column("employees", "current_site_id")
    op.execute("DROP TYPE IF EXISTS availability_status")
