"""Add zones, regions, zone managers, transfers, and supporting foreign keys.

Revision ID: a1b2c3d4e5f6
Revises: fc6820b147d4
Create Date: 2026-03-25 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "fc6820b147d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_names(inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def _index_names(inspector, table_name: str) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _fk_names(inspector, table_name: str) -> set[str]:
    return {
        foreign_key["name"]
        for foreign_key in inspector.get_foreign_keys(table_name)
        if foreign_key.get("name")
    }


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    zone_status = postgresql.ENUM("ACTIVE", "INACTIVE", name="zone_status", create_type=True)
    region_status = postgresql.ENUM("ACTIVE", "INACTIVE", name="region_status", create_type=True)
    zone_status.create(bind, checkfirst=True)
    region_status.create(bind, checkfirst=True)

    if not _table_exists(inspector, "zones"):
        op.create_table(
            "zones",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("zone_name", sa.String(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", postgresql.ENUM("ACTIVE", "INACTIVE", name="zone_status", create_type=False), nullable=False, server_default="ACTIVE"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    if "ix_zones_org_id" not in _index_names(inspector, "zones"):
        op.create_index("ix_zones_org_id", "zones", ["org_id"])

    if not _table_exists(inspector, "regions"):
        op.create_table(
            "regions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("region_name", sa.String(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", postgresql.ENUM("ACTIVE", "INACTIVE", name="region_status", create_type=False), nullable=False, server_default="ACTIVE"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], ondelete="RESTRICT"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    region_indexes = _index_names(inspector, "regions")
    if "ix_regions_org_id" not in region_indexes:
        op.create_index("ix_regions_org_id", "regions", ["org_id"])
    if "ix_regions_zone_id" not in region_indexes:
        op.create_index("ix_regions_zone_id", "regions", ["zone_id"])

    if not _table_exists(inspector, "zone_managers"):
        op.create_table(
            "zone_managers",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("assigned_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    zone_manager_indexes = _index_names(inspector, "zone_managers")
    if "ix_zone_managers_zone_id" not in zone_manager_indexes:
        op.create_index("ix_zone_managers_zone_id", "zone_managers", ["zone_id"])
    if "ix_zone_managers_employee_id" not in zone_manager_indexes:
        op.create_index("ix_zone_managers_employee_id", "zone_managers", ["employee_id"])

    if not _table_exists(inspector, "region_transfers"):
        op.create_table(
            "region_transfers",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("from_zone_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("to_zone_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("transferred_date", sa.Date(), nullable=False),
            sa.Column("transferred_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["from_zone_id"], ["zones.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["to_zone_id"], ["zones.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    if "ix_region_transfers_region_id" not in _index_names(inspector, "region_transfers"):
        op.create_index("ix_region_transfers_region_id", "region_transfers", ["region_id"])

    employee_columns = _column_names(inspector, "employees")
    if "region" not in employee_columns:
        op.add_column("employees", sa.Column("region", sa.String(), nullable=True))
        inspector = sa.inspect(bind)
        employee_columns = _column_names(inspector, "employees")
    if "region_id" not in employee_columns:
        op.add_column("employees", sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=True))
        inspector = sa.inspect(bind)
    employee_fks = _fk_names(inspector, "employees")
    if "fk_employees_region_id" not in employee_fks:
        op.create_foreign_key("fk_employees_region_id", "employees", "regions", ["region_id"], ["id"], ondelete="SET NULL")
        inspector = sa.inspect(bind)
    if "ix_employees_region_id" not in _index_names(inspector, "employees"):
        op.create_index("ix_employees_region_id", "employees", ["region_id"])

    site_columns = _column_names(inspector, "sites")
    if "region_id" not in site_columns:
        op.add_column("sites", sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=True))
        inspector = sa.inspect(bind)
    site_fks = _fk_names(inspector, "sites")
    if "fk_sites_region_id" not in site_fks:
        op.create_foreign_key("fk_sites_region_id", "sites", "regions", ["region_id"], ["id"], ondelete="SET NULL")
        inspector = sa.inspect(bind)
    if "ix_sites_region_id" not in _index_names(inspector, "sites"):
        op.create_index("ix_sites_region_id", "sites", ["region_id"])

    payroll_columns = _column_names(inspector, "payrolls")
    if "zone_id" not in payroll_columns:
        op.add_column("payrolls", sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=True))
        inspector = sa.inspect(bind)
    payroll_fks = _fk_names(inspector, "payrolls")
    if "fk_payrolls_zone_id" not in payroll_fks:
        op.create_foreign_key("fk_payrolls_zone_id", "payrolls", "zones", ["zone_id"], ["id"], ondelete="SET NULL")
        inspector = sa.inspect(bind)
    if "ix_payrolls_zone_id" not in _index_names(inspector, "payrolls"):
        op.create_index("ix_payrolls_zone_id", "payrolls", ["zone_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _table_exists(inspector, "payrolls") and "ix_payrolls_zone_id" in _index_names(inspector, "payrolls"):
        op.drop_index("ix_payrolls_zone_id", "payrolls")
    if _table_exists(inspector, "payrolls") and "fk_payrolls_zone_id" in _fk_names(inspector, "payrolls"):
        op.drop_constraint("fk_payrolls_zone_id", "payrolls", type_="foreignkey")
    if _table_exists(inspector, "payrolls") and "zone_id" in _column_names(inspector, "payrolls"):
        op.drop_column("payrolls", "zone_id")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "sites") and "ix_sites_region_id" in _index_names(inspector, "sites"):
        op.drop_index("ix_sites_region_id", "sites")
    if _table_exists(inspector, "sites") and "fk_sites_region_id" in _fk_names(inspector, "sites"):
        op.drop_constraint("fk_sites_region_id", "sites", type_="foreignkey")
    if _table_exists(inspector, "sites") and "region_id" in _column_names(inspector, "sites"):
        op.drop_column("sites", "region_id")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "employees") and "ix_employees_region_id" in _index_names(inspector, "employees"):
        op.drop_index("ix_employees_region_id", "employees")
    if _table_exists(inspector, "employees") and "fk_employees_region_id" in _fk_names(inspector, "employees"):
        op.drop_constraint("fk_employees_region_id", "employees", type_="foreignkey")
    if _table_exists(inspector, "employees") and "region_id" in _column_names(inspector, "employees"):
        op.drop_column("employees", "region_id")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "employees") and "region" in _column_names(inspector, "employees"):
        op.drop_column("employees", "region")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "region_transfers"):
        if "ix_region_transfers_region_id" in _index_names(inspector, "region_transfers"):
            op.drop_index("ix_region_transfers_region_id", "region_transfers")
        op.drop_table("region_transfers")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "zone_managers"):
        zone_manager_indexes = _index_names(inspector, "zone_managers")
        if "ix_zone_managers_zone_id" in zone_manager_indexes:
            op.drop_index("ix_zone_managers_zone_id", "zone_managers")
        if "ix_zone_managers_employee_id" in zone_manager_indexes:
            op.drop_index("ix_zone_managers_employee_id", "zone_managers")
        op.drop_table("zone_managers")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "regions"):
        region_indexes = _index_names(inspector, "regions")
        if "ix_regions_org_id" in region_indexes:
            op.drop_index("ix_regions_org_id", "regions")
        if "ix_regions_zone_id" in region_indexes:
            op.drop_index("ix_regions_zone_id", "regions")
        op.drop_table("regions")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "zones"):
        if "ix_zones_org_id" in _index_names(inspector, "zones"):
            op.drop_index("ix_zones_org_id", "zones")
        op.drop_table("zones")

    sa.Enum(name="region_status").drop(bind, checkfirst=True)
    sa.Enum(name="zone_status").drop(bind, checkfirst=True)
