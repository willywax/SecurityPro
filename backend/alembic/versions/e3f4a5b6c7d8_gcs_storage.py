"""Add GCS storage: photo_path to employees, expand employee_documents.

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e3f4a5b6c7d8"
down_revision = "e4f5a6b7c8d9"
branch_labels = None
depends_on = None


def upgrade():
    # Add photo_path to employees
    op.add_column("employees", sa.Column("photo_path", sa.String(), nullable=True))

    # Make legacy columns in employee_documents nullable
    op.alter_column("employee_documents", "name", nullable=True)
    op.alter_column("employee_documents", "file_url", nullable=True)

    # Add new GCS-backed columns to employee_documents
    op.add_column("employee_documents", sa.Column("title", sa.String(), nullable=True))
    op.add_column("employee_documents", sa.Column("original_filename", sa.String(), nullable=True))
    op.add_column("employee_documents", sa.Column("gcs_path", sa.String(), nullable=True))
    op.add_column("employee_documents", sa.Column("file_size_bytes", sa.Integer(), nullable=True))
    op.add_column("employee_documents", sa.Column("mime_type", sa.String(), nullable=True))
    op.add_column(
        "employee_documents",
        sa.Column(
            "uploaded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "employee_documents",
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("employee_documents", "uploaded_at")
    op.drop_column("employee_documents", "uploaded_by")
    op.drop_column("employee_documents", "mime_type")
    op.drop_column("employee_documents", "file_size_bytes")
    op.drop_column("employee_documents", "gcs_path")
    op.drop_column("employee_documents", "original_filename")
    op.drop_column("employee_documents", "title")
    op.alter_column("employee_documents", "file_url", nullable=False)
    op.alter_column("employee_documents", "name", nullable=False)
    op.drop_column("employees", "photo_path")
