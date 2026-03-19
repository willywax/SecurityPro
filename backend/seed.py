"""Database Seeding Script - PostgreSQL/SQLAlchemy."""

import asyncio
import uuid
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import select

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from db.session import AsyncSessionLocal
from db.base import Base  # Import Base first to initialize
from models.organization import Organization
from models.auth import User
from models.enums import UserRole
from utils.auth import hash_password


async def seed_database():
    """Seed the database with initial data"""

    print("Starting database seeding...")

    async with AsyncSessionLocal() as db:
        try:
            # Check if already seeded
            result = await db.execute(
                select(Organization).where(Organization.slug == "secureops-demo")
            )
            existing_org = result.scalar_one_or_none()

            if existing_org:
                print("Database already seeded. Skipping...")
                return

            # Create default organization
            org_id = uuid.uuid4()
            org = Organization(
                id=org_id,
                org_id=org_id,  # For organization, org_id points to itself
                name="SecureOps Demo",
                slug="secureops-demo",
                logo_url=None,
                accent_color="#0F172A",
                address="123 Security Ave, Guard City, GC 12345",
                phone="+1 (555) 123-4567",
                email="info@secureops-demo.com",
                website="https://secureops-demo.com",
                is_active=True,
                bank_details={
                    "bank_name": "CRDB Bank Tanzania",
                    "account_name": "SecureOps Demo Ltd",
                    "account_number": "0150123456789",
                    "branch": "Dar es Salaam Main Branch",
                    "swift_code": "CORUTZTZ"
                }
            )

            db.add(org)
            await db.flush()
            print(f"Created organization: {org.name}")

            # Create admin user
            admin_user = User(
                org_id=org.id,
                email="admin@securityops.com",
                password_hash=hash_password("Admin123!"),
                first_name="System",
                last_name="Administrator",
                role=UserRole.ADMIN,
                is_active=True,
                created_by=None
            )

            db.add(admin_user)
            await db.flush()
            print(f"Created admin user: {admin_user.email}")

            await db.commit()

            print("\nDatabase seeding complete!")
            print(f"\nAdmin Login: admin@securityops.com")
            print(f"Password: Admin123!")

        except Exception as e:
            await db.rollback()
            print(f"Error seeding database: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
