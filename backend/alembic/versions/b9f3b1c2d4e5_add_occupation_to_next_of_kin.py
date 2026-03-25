"""add occupation to next of kin

Revision ID: b9f3b1c2d4e5
Revises: a1b2c3d4e5f6
Create Date: 2026-03-25 09:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "b9f3b1c2d4e5"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("employee_next_of_kin")}
    if "occupation" not in columns:
        op.add_column("employee_next_of_kin", sa.Column("occupation", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("employee_next_of_kin")}
    if "occupation" in columns:
        op.drop_column("employee_next_of_kin", "occupation")
