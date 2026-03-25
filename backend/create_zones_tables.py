"""Create and reconcile the zones/regions schema used by the API."""
from sqlalchemy import create_engine, text
import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin@localhost:5432/securitypro",
).replace("+asyncpg", "")


def table_exists(connection, table_name: str) -> bool:
    return bool(
        connection.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = :table_name
                """
            ),
            {"table_name": table_name},
        ).scalar()
    )


def column_exists(connection, table_name: str, column_name: str) -> bool:
    return bool(
        connection.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = :table_name
                  AND column_name = :column_name
                """
            ),
            {"table_name": table_name, "column_name": column_name},
        ).scalar()
    )


def constraint_exists(connection, constraint_name: str) -> bool:
    return bool(
        connection.execute(
            text(
                """
                SELECT 1
                FROM information_schema.table_constraints
                WHERE constraint_schema = 'public'
                  AND constraint_name = :constraint_name
                """
            ),
            {"constraint_name": constraint_name},
        ).scalar()
    )


def index_exists(connection, index_name: str) -> bool:
    return bool(
        connection.execute(
            text(
                """
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname = :index_name
                """
            ),
            {"index_name": index_name},
        ).scalar()
    )


def ensure_enum(connection, enum_name: str, labels: tuple[str, ...]) -> None:
    values = connection.execute(
        text(
            """
            SELECT enumlabel
            FROM pg_enum
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
            WHERE pg_type.typname = :enum_name
            ORDER BY enumsortorder
            """
        ),
        {"enum_name": enum_name},
    ).fetchall()

    if not values:
        rendered_labels = ", ".join(f"'{label}'" for label in labels)
        connection.execute(
            text(
                f"""
                DO $$ BEGIN
                    CREATE TYPE {enum_name} AS ENUM ({rendered_labels});
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
                """
            )
        )
        print(f"[ok] Created enum {enum_name}")
        return

    actual_labels = [row[0] for row in values]
    if actual_labels != list(labels):
        raise RuntimeError(
            f"Enum {enum_name} has labels {actual_labels}, expected {list(labels)}. "
            "Fix the enum before proceeding."
        )

    print(f"[ok] Enum {enum_name} already valid")


def ensure_table(connection) -> None:
    if not table_exists(connection, "zones"):
        connection.execute(
            text(
                """
                CREATE TABLE zones (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL,
                    zone_name VARCHAR NOT NULL,
                    notes TEXT,
                    status zone_status NOT NULL DEFAULT 'ACTIVE',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE,
                    created_by UUID
                )
                """
            )
        )
        print("[ok] Zones table created")
    else:
        print("[ok] Zones table already exists")

    if not table_exists(connection, "regions"):
        connection.execute(
            text(
                """
                CREATE TABLE regions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL,
                    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
                    region_name VARCHAR NOT NULL,
                    notes TEXT,
                    status region_status NOT NULL DEFAULT 'ACTIVE',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE,
                    created_by UUID
                )
                """
            )
        )
        print("[ok] Regions table created")
    else:
        print("[ok] Regions table already exists")

    if not table_exists(connection, "zone_managers"):
        connection.execute(
            text(
                """
                CREATE TABLE zone_managers (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL,
                    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
                    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                    assigned_date DATE NOT NULL,
                    end_date DATE,
                    active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE,
                    created_by UUID
                )
                """
            )
        )
        print("[ok] Zone managers table created")
    else:
        print("[ok] Zone managers table already exists")

    if not table_exists(connection, "region_transfers"):
        connection.execute(
            text(
                """
                CREATE TABLE region_transfers (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL,
                    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
                    from_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
                    to_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
                    transferred_date DATE NOT NULL,
                    transferred_by UUID,
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE,
                    created_by UUID
                )
                """
            )
        )
        print("[ok] Region transfers table created")
    else:
        print("[ok] Region transfers table already exists")


def ensure_column(connection, table_name: str, column_name: str, definition: str) -> None:
    if column_exists(connection, table_name, column_name):
        print(f"[ok] {table_name}.{column_name} already exists")
        return

    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))
    print(f"[ok] Added {table_name}.{column_name}")


def ensure_fk(connection, table_name: str, constraint_name: str, sql: str) -> None:
    if constraint_exists(connection, constraint_name):
        print(f"[ok] Constraint {constraint_name} already exists")
        return

    connection.execute(text(sql))
    print(f"[ok] Added constraint {constraint_name}")


def ensure_index(connection, index_name: str, sql: str) -> None:
    if index_exists(connection, index_name):
        print(f"[ok] Index {index_name} already exists")
        return

    connection.execute(text(sql))
    print(f"[ok] Added index {index_name}")


def reconcile_schema() -> None:
    engine = create_engine(DATABASE_URL)

    with engine.begin() as connection:
        print("Reconciling zones/regions schema...")

        ensure_enum(connection, "zone_status", ("ACTIVE", "INACTIVE"))
        ensure_enum(connection, "region_status", ("ACTIVE", "INACTIVE"))
        ensure_table(connection)

        ensure_index(connection, "ix_zones_org_id", "CREATE INDEX ix_zones_org_id ON zones(org_id)")
        ensure_index(connection, "ix_regions_org_id", "CREATE INDEX ix_regions_org_id ON regions(org_id)")
        ensure_index(connection, "ix_regions_zone_id", "CREATE INDEX ix_regions_zone_id ON regions(zone_id)")
        ensure_index(connection, "ix_zone_managers_zone_id", "CREATE INDEX ix_zone_managers_zone_id ON zone_managers(zone_id)")
        ensure_index(connection, "ix_zone_managers_employee_id", "CREATE INDEX ix_zone_managers_employee_id ON zone_managers(employee_id)")
        ensure_index(connection, "ix_region_transfers_region_id", "CREATE INDEX ix_region_transfers_region_id ON region_transfers(region_id)")

        ensure_column(connection, "employees", "region", "VARCHAR")
        ensure_column(connection, "employees", "region_id", "UUID")
        ensure_fk(
            connection,
            "employees",
            "fk_employees_region_id",
            "ALTER TABLE employees ADD CONSTRAINT fk_employees_region_id FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL",
        )
        ensure_index(connection, "ix_employees_region_id", "CREATE INDEX ix_employees_region_id ON employees(region_id)")

        ensure_column(connection, "sites", "region_id", "UUID")
        ensure_fk(
            connection,
            "sites",
            "fk_sites_region_id",
            "ALTER TABLE sites ADD CONSTRAINT fk_sites_region_id FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL",
        )
        ensure_index(connection, "ix_sites_region_id", "CREATE INDEX ix_sites_region_id ON sites(region_id)")

        ensure_column(connection, "payrolls", "zone_id", "UUID")
        ensure_fk(
            connection,
            "payrolls",
            "fk_payrolls_zone_id",
            "ALTER TABLE payrolls ADD CONSTRAINT fk_payrolls_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL",
        )
        ensure_index(connection, "ix_payrolls_zone_id", "CREATE INDEX ix_payrolls_zone_id ON payrolls(zone_id)")

    engine.dispose()
    print("\nZones/regions schema is ready.")


if __name__ == "__main__":
    reconcile_schema()
