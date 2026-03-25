"""Create PostgreSQL enum types required by the zones/regions rollout."""
from sqlalchemy import create_engine, text
import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin@localhost:5432/securitypro",
).replace("+asyncpg", "")


ENUM_DEFINITIONS = {
    "zone_status": ("ACTIVE", "INACTIVE"),
    "region_status": ("ACTIVE", "INACTIVE"),
}


def ensure_enum(connection, enum_name: str, values: tuple[str, ...]) -> None:
    """Create the enum if missing and verify it matches the application's labels."""
    existing_values = connection.execute(
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

    expected_values = list(values)
    actual_values = [row[0] for row in existing_values]

    if not actual_values:
        labels = ", ".join(f"'{value}'" for value in values)
        connection.execute(
            text(
                f"""
                DO $$ BEGIN
                    CREATE TYPE {enum_name} AS ENUM ({labels});
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
                """
            )
        )
        print(f"[ok] {enum_name} enum created")
        return

    if actual_values != expected_values:
        raise RuntimeError(
            f"{enum_name} has labels {actual_values}, expected {expected_values}. "
            "Reconcile the enum before continuing."
        )

    print(f"[ok] {enum_name} enum already matches expected labels")


def create_enums() -> None:
    """Create and validate enum types used by the zones/regions schema."""
    engine = create_engine(DATABASE_URL)

    with engine.begin() as connection:
        for enum_name, values in ENUM_DEFINITIONS.items():
            ensure_enum(connection, enum_name, values)

    engine.dispose()


if __name__ == "__main__":
    create_enums()
    print("\nAll enums are ready.")
