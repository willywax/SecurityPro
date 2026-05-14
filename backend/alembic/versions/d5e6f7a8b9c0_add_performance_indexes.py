"""Add performance indexes for common query patterns.

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-05-14
"""
from alembic import op

revision = 'd5e6f7a8b9c0'
down_revision = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # employees: enum status columns are not indexed by default
    op.create_index('ix_employees_employment_status', 'employees', ['employment_status'])
    op.create_index('ix_employees_availability_status', 'employees', ['availability_status'])
    op.create_index('ix_employees_org_id_employment_status', 'employees', ['org_id', 'employment_status'])
    op.create_index('ix_employees_org_id_availability_status', 'employees', ['org_id', 'availability_status'])

    # sites: status column is not indexed
    op.create_index('ix_sites_status', 'sites', ['status'])
    op.create_index('ix_sites_org_id_status', 'sites', ['org_id', 'status'])

    # employee_site_allocations: composite indexes for filtered guard lookups
    op.create_index('ix_esa_status', 'employee_site_allocations', ['status'])
    op.create_index('ix_esa_site_id_status', 'employee_site_allocations', ['site_id', 'status'])
    op.create_index('ix_esa_employee_id_status', 'employee_site_allocations', ['employee_id', 'status'])

    # employee_contracts: status and end_date for expiry queries
    op.create_index('ix_employee_contracts_status', 'employee_contracts', ['status'])
    op.create_index('ix_employee_contracts_end_date', 'employee_contracts', ['end_date'])
    op.create_index('ix_employee_contracts_employee_id_status', 'employee_contracts', ['employee_id', 'status'])

    # user_zone_assignments: status for zone-scoping lookups
    op.create_index('ix_user_zone_assignments_status', 'user_zone_assignments', ['status'])
    op.create_index('ix_user_zone_assignments_user_id_status', 'user_zone_assignments', ['user_id', 'status'])

    # daily_logs: composite for "all logs for site on a given date"
    op.create_index('ix_daily_logs_site_id_log_date', 'daily_logs', ['site_id', 'log_date'])


def downgrade() -> None:
    op.drop_index('ix_daily_logs_site_id_log_date', table_name='daily_logs')
    op.drop_index('ix_user_zone_assignments_user_id_status', table_name='user_zone_assignments')
    op.drop_index('ix_user_zone_assignments_status', table_name='user_zone_assignments')
    op.drop_index('ix_employee_contracts_employee_id_status', table_name='employee_contracts')
    op.drop_index('ix_employee_contracts_end_date', table_name='employee_contracts')
    op.drop_index('ix_employee_contracts_status', table_name='employee_contracts')
    op.drop_index('ix_esa_employee_id_status', table_name='employee_site_allocations')
    op.drop_index('ix_esa_site_id_status', table_name='employee_site_allocations')
    op.drop_index('ix_esa_status', table_name='employee_site_allocations')
    op.drop_index('ix_sites_org_id_status', table_name='sites')
    op.drop_index('ix_sites_status', table_name='sites')
    op.drop_index('ix_employees_org_id_availability_status', table_name='employees')
    op.drop_index('ix_employees_org_id_employment_status', table_name='employees')
    op.drop_index('ix_employees_availability_status', table_name='employees')
    op.drop_index('ix_employees_employment_status', table_name='employees')
