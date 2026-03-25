"""Check enum types"""
from sqlalchemy import text, create_engine

DATABASE_URL = "postgresql://postgres:admin@localhost:5432/securitypro"

def check_enums():
    """Check if enums exist"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as connection:
        # Check region_status enum
        result = connection.execute(text("SELECT typname FROM pg_type WHERE typname = 'region_status'"))
        if result.fetchone():
            print("✓ region_status enum exists")
        else:
            print("❌ region_status enum missing")

        # Check zone_status enum
        result = connection.execute(text("SELECT typname FROM pg_type WHERE typname = 'zone_status'"))
        if result.fetchone():
            print("✓ zone_status enum exists")
        else:
            print("❌ zone_status enum missing")

if __name__ == "__main__":
    check_enums()
