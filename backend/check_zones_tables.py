"""Validate the zones/regions schema expected by the API."""
from sqlalchemy import create_engine, text
import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin@localhost:5432/securitypro",
).replace("+asyncpg", "")


REQUIRED_TABLES = (
    "zones",
    "regions",
    "zone_managers",
    "region_transfers",
)

REQUIRED_COLUMNS = {
    "employees": ("region", "region_id"),
    "sites": ("region_id",),
    "payrolls": ("zone_id",),
}

REQUIRED_ENUMS = {
    "zone_status": ("ACTIVE", "INACTIVE"),
    "region_status": ("ACTIVE", "INACTIVE"),
}


def fetch_values(connection, query: str, params: dict) -> list[str]:
    return [row[0] for row in connection.execute(text(query), params).fetchall()]


engine = create_engine(DATABASE_URL)

with engine.connect() as connection:
    print("Checking zones/regions schema...\n")

    existing_tables = set(
        fetch_values(
            connection,
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """,
            {},
        )
    )

    for table_name in REQUIRED_TABLES:
        marker = "[ok]" if table_name in existing_tables else "[missing]"
        print(f"{marker} table: {table_name}")

    print("")

    for table_name, column_names in REQUIRED_COLUMNS.items():
        existing_columns = set(
            fetch_values(
                connection,
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table_name
                """,
                {"table_name": table_name},
            )
        )
        for column_name in column_names:
            marker = "[ok]" if column_name in existing_columns else "[missing]"
            print(f"{marker} column: {table_name}.{column_name}")

    print("")

    for enum_name, expected_labels in REQUIRED_ENUMS.items():
        actual_labels = fetch_values(
            connection,
            """
            SELECT enumlabel
            FROM pg_enum
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
            WHERE pg_type.typname = :enum_name
            ORDER BY enumsortorder
            """,
            {"enum_name": enum_name},
        )
        if not actual_labels:
            print(f"[missing] enum: {enum_name} is missing")
        elif tuple(actual_labels) != expected_labels:
            print(f"[mismatch] enum: {enum_name} has labels {actual_labels}, expected {list(expected_labels)}")
        else:
            print(f"[ok] enum: {enum_name} labels are {actual_labels}")

engine.dispose()
