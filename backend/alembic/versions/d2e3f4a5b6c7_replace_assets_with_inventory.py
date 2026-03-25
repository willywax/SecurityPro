"""replace individual asset tracking with inventory system

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-03-25 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d2e3f4a5b6c7"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Drop old asset tables ──────────────────────────────────────────────
    bind.execute(sa.text("DROP TABLE IF EXISTS asset_issuances CASCADE"))
    bind.execute(sa.text("DROP TABLE IF EXISTS assets CASCADE"))

    # Drop old postgres enum types (ignore if already gone)
    for t in ("asset_type", "asset_status", "asset_condition",
              "asset_condition_issue", "asset_condition_return"):
        bind.execute(sa.text(f"DROP TYPE IF EXISTS {t} CASCADE"))

    # ── 2. asset_types ────────────────────────────────────────────────────────
    op.create_table(
        "asset_types",
        sa.Column("type_name",    sa.String(),  nullable=False),
        sa.Column("description",  sa.String(),  nullable=True),
        sa.Column("is_custom",    sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("status",       sa.String(),  nullable=False, server_default="active"),
        sa.Column("id",           postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id",       postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at",   sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",   sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by",   postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_asset_types_org_id", "asset_types", ["org_id"])

    # ── 3. stores ─────────────────────────────────────────────────────────────
    op.create_table(
        "stores",
        sa.Column("store_name", sa.String(),  nullable=False),
        sa.Column("location",   sa.String(),  nullable=True),
        sa.Column("address",    sa.String(),  nullable=True),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("phone",      sa.String(),  nullable=True),
        sa.Column("notes",      sa.String(),  nullable=True),
        sa.Column("status",     sa.String(),  nullable=False, server_default="active"),
        sa.Column("id",         postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id",     postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stores_org_id", "stores", ["org_id"])

    # ── 4. inventory_items ────────────────────────────────────────────────────
    op.create_table(
        "inventory_items",
        sa.Column("store_id",          postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("stores.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_type_id",     postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("asset_types.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("item_name",         sa.String(),  nullable=False),
        sa.Column("description",       sa.String(),  nullable=True),
        sa.Column("unit_cost",         sa.Float(),   nullable=True),
        sa.Column("current_count",     sa.Integer(), nullable=False, server_default="0"),
        sa.Column("issued_count",      sa.Integer(), nullable=False, server_default="0"),
        sa.Column("written_off_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes",             sa.Text(),    nullable=True),
        sa.Column("status",            sa.String(),  nullable=False, server_default="active"),
        sa.Column("id",                postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id",            postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at",        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by",        postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_items_org_id",       "inventory_items", ["org_id"])
    op.create_index("ix_inventory_items_store_id",     "inventory_items", ["store_id"])
    op.create_index("ix_inventory_items_asset_type_id","inventory_items", ["asset_type_id"])

    # ── 5. inventory_issuances ────────────────────────────────────────────────
    op.create_table(
        "inventory_issuances",
        sa.Column("item_id",              postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("issued_to_type",       sa.String(), nullable=False),
        sa.Column("issued_to_id",         postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("issued_to_name",       sa.String(), nullable=False),
        sa.Column("quantity_issued",      sa.Integer(), nullable=False),
        sa.Column("issue_date",           sa.Date(), nullable=False),
        sa.Column("expected_return_date", sa.Date(), nullable=True),
        sa.Column("actual_return_date",   sa.Date(), nullable=True),
        sa.Column("quantity_returned",    sa.Integer(), nullable=False, server_default="0"),
        sa.Column("issue_condition",      sa.String(), nullable=False),
        sa.Column("return_condition",     sa.String(), nullable=True),
        sa.Column("issued_by",            postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("return_received_by",   postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status",               sa.String(), nullable=False, server_default="active"),
        sa.Column("notes",                sa.Text(), nullable=True),
        sa.Column("id",                   postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id",               postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at",           sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",           sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by",           postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_issuances_org_id",  "inventory_issuances", ["org_id"])
    op.create_index("ix_inventory_issuances_item_id", "inventory_issuances", ["item_id"])

    # ── 6. written_off_register ───────────────────────────────────────────────
    op.create_table(
        "written_off_register",
        sa.Column("item_id",                postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity",               sa.Integer(), nullable=False),
        sa.Column("write_off_date",         sa.Date(), nullable=False),
        sa.Column("reason",                 sa.String(), nullable=False),
        sa.Column("reason_details",         sa.Text(), nullable=False),
        sa.Column("written_off_by",         postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_by",            postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reference_issuance_id",  postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("inventory_issuances.id", ondelete="SET NULL"), nullable=True),
        sa.Column("id",                     postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id",                 postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at",             sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",             sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by",             postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_written_off_register_org_id",  "written_off_register", ["org_id"])
    op.create_index("ix_written_off_register_item_id", "written_off_register", ["item_id"])

    # ── 7. inventory_transactions ─────────────────────────────────────────────
    op.create_table(
        "inventory_transactions",
        sa.Column("item_id",          postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_type", sa.String(), nullable=False),
        sa.Column("quantity",         sa.Integer(), nullable=False),
        sa.Column("direction",        sa.String(), nullable=False),
        sa.Column("reference_type",   sa.String(), nullable=True),
        sa.Column("reference_id",     postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reference_name",   sa.String(), nullable=True),
        sa.Column("issued_by",        postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("notes",            sa.Text(), nullable=True),
        sa.Column("id",               postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id",           postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",       sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by",       postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_transactions_org_id",  "inventory_transactions", ["org_id"])
    op.create_index("ix_inventory_transactions_item_id", "inventory_transactions", ["item_id"])


def downgrade() -> None:
    for tbl in [
        "inventory_transactions", "written_off_register",
        "inventory_issuances", "inventory_items", "stores", "asset_types",
    ]:
        op.drop_table(tbl)
