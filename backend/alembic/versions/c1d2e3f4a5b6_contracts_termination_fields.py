"""add termination fields and notes to employee_contracts

Revision ID: c1d2e3f4a5b6
Revises: b9f3b1c2d4e5
Create Date: 2026-03-25 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "c1d2e3f4a5b6"
down_revision = "b9f3b1c2d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # Add mutual_termination to the contract_status enum
    bind.execute(sa.text(
        "ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'mutual_termination'"
    ))

    columns = {col["name"] for col in inspector.get_columns("employee_contracts")}

    if "notes" not in columns:
        op.add_column("employee_contracts", sa.Column("notes", sa.Text(), nullable=True))

    if "termination_reason" not in columns:
        op.add_column("employee_contracts", sa.Column("termination_reason", sa.Text(), nullable=True))

    if "termination_date" not in columns:
        op.add_column("employee_contracts", sa.Column("termination_date", sa.Date(), nullable=True))

    if "terminated_by" not in columns:
        op.add_column("employee_contracts", sa.Column(
            "terminated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True
        ))

    if "auto_expired" not in columns:
        op.add_column("employee_contracts", sa.Column(
            "auto_expired", sa.Boolean(), nullable=False, server_default="false"
        ))

    if "superseded_by" not in columns:
        op.add_column("employee_contracts", sa.Column(
            "superseded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employee_contracts.id", ondelete="SET NULL"),
            nullable=True
        ))

    # Make contract_type nullable (previously NOT NULL)
    try:
        op.alter_column("employee_contracts", "contract_type", nullable=True)
    except Exception:
        pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("employee_contracts")}

    for col in ["notes", "termination_reason", "termination_date", "terminated_by", "auto_expired", "superseded_by"]:
        if col in columns:
            op.drop_column("employee_contracts", col)
