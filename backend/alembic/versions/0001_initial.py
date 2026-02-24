"""initial

Revision ID: 0001
Revises:
Create Date: 2026-02-24
"""
from alembic import op
import sqlalchemy as sa
from app.models.base import Base
from app.models import entities  # noqa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind)
