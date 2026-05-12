"""Add employment_periods table and turnover tracking columns.

Revision ID: f1a2b3c4d5e6
Revises: e3f4a5b6c7d8
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f1a2b3c4d5e6"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. Extend employment_status enum ───────────────────────────────────
    # Must run outside a transaction on PG < 12; PG 12+ allows it inside one.
    # We use autocommit_block for broad compatibility.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'resigned'")
        op.execute("ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'absconded'")
        op.execute("ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'rehired'")

    # ── 2. Create departure_reason enum type ───────────────────────────────
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE departure_reason AS ENUM (
                'resigned', 'terminated', 'contract_expired', 'absconded', 'other'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # ── 3. Create employment_periods table ─────────────────────────────────
    op.create_table(
        "employment_periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_number", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column(
            "departure_reason",
            postgresql.ENUM(
                "resigned", "terminated", "contract_expired", "absconded", "other",
                name="departure_reason",
                create_type=False,
            ),
            nullable=True,
        ),
        sa.Column("departure_notes", sa.Text(), nullable=True),
        sa.Column("rehire_date", sa.Date(), nullable=True),
        sa.Column("rehired_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_employment_periods_employee_id", "employment_periods", ["employee_id"])
    op.create_index("ix_employment_periods_org_id", "employment_periods", ["org_id"])

    # ── 4. Add new columns to employees ────────────────────────────────────
    op.add_column("employees",
        sa.Column("total_employment_periods", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("employees",
        sa.Column("original_hire_date", sa.Date(), nullable=True))
    op.add_column("employees",
        sa.Column("current_period_id", postgresql.UUID(as_uuid=True), nullable=True))

    # Deferred FK from employees.current_period_id → employment_periods.id
    op.create_foreign_key(
        "fk_employee_current_period",
        "employees", "employment_periods",
        ["current_period_id"], ["id"],
        ondelete="SET NULL",
    )

    # ── 5. Snapshot original_hire_date ─────────────────────────────────────
    op.execute("""
        UPDATE employees
        SET original_hire_date = hire_date
        WHERE hire_date IS NOT NULL
    """)

    # ── 6. Create period_number=1 record for each existing employee ────────
    # Use UPPER() to handle both legacy uppercase (ACTIVE/INACTIVE) and new
    # lowercase (resigned/absconded/rehired) enum values.
    op.execute("""
        INSERT INTO employment_periods (
            id, org_id, employee_id, period_number,
            start_date, end_date, status,
            departure_reason, created_at, updated_at, created_by
        )
        SELECT
            gen_random_uuid(),
            org_id,
            id,
            1,
            COALESCE(hire_date, created_at::date),
            CASE
                WHEN UPPER(employment_status::text) NOT IN ('ACTIVE', 'ON_LEAVE', 'REHIRED')
                THEN termination_date
                ELSE NULL
            END,
            CASE
                WHEN UPPER(employment_status::text) IN ('ACTIVE', 'ON_LEAVE', 'REHIRED')
                THEN 'active'
                ELSE 'ended'
            END,
            CASE
                WHEN UPPER(employment_status::text) = 'TERMINATED' THEN 'terminated'::departure_reason
                WHEN UPPER(employment_status::text) = 'RESIGNED'   THEN 'resigned'::departure_reason
                WHEN UPPER(employment_status::text) = 'ABSCONDED'  THEN 'absconded'::departure_reason
                ELSE NULL
            END,
            now(),
            now(),
            created_by
        FROM employees
    """)

    # ── 7. Point employees.current_period_id → their period record ─────────
    op.execute("""
        UPDATE employees e
        SET current_period_id = ep.id
        FROM employment_periods ep
        WHERE ep.employee_id = e.id
          AND ep.period_number = 1
    """)


def downgrade():
    op.drop_constraint("fk_employee_current_period", "employees", type_="foreignkey")
    op.drop_column("employees", "current_period_id")
    op.drop_column("employees", "original_hire_date")
    op.drop_column("employees", "total_employment_periods")
    op.drop_index("ix_employment_periods_org_id", table_name="employment_periods")
    op.drop_index("ix_employment_periods_employee_id", table_name="employment_periods")
    op.drop_table("employment_periods")
    op.execute("DROP TYPE IF EXISTS departure_reason")
    # Note: cannot remove values from employment_status enum in PostgreSQL.
