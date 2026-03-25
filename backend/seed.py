"""Database Seeding Script - PostgreSQL/SQLAlchemy."""

import asyncio
import uuid
import sys
from datetime import date
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
from models.zone import Zone, Region
from models.enums import UserRole, ZoneStatus, RegionStatus
from models.inventory import AssetType, Store, InventoryItem, InventoryTransaction
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
                print("Organization already exists. Using existing organization...")
                org_id = existing_org.id
                # Continue to reseed zones/regions
            else:
                existing_org = None

            # Create default organization if not exists
            if not existing_org:
                org_id = uuid.uuid4()
                org = Organization(
                    id=org_id,
                    org_id=org_id,  # For organization, org_id points to itself
                    name="SecureOps Demo",
                    slug="secureops-demo",
                    logo_url=None,
                    accent_color="#0F172A",
                    address="123 Security Ave, Guard City, GC 12345",
                    phone="+255 22 123 4567",
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

                # ---- COMMIT CORE DATA (organization + user) ----
                await db.commit()
                print("Committed organization and admin user")
            else:
                print("Skipping organization and user creation (already exist)")

            # ---- Zones & Regions ----
            try:
                existing_zone_result = await db.execute(
                    select(Zone.id).where(Zone.org_id == org_id).limit(1)
                )
                if existing_zone_result.scalar_one_or_none():
                    print("Zones/regions already exist. Skipping geographic seed.")
                    print("\nDatabase seeding complete!")
                    print(f"\nAdmin Login: admin@securityops.com")
                    print("Password: Admin123!")
                    return
                
                # Define zones with regions
                zones_data = [
                    {
                        "name": "Zone 1",
                        "regions": ["Musoma", "Mwanza", "Simiyu"]
                    },
                    {
                        "name": "Zone 2", 
                        "regions": ["Shinyanga", "Tabora", "Singida", "Kigoma"]
                    },
                    {
                        "name": "Zone 3",
                        "regions": ["Dar es Salaam", "Karatu"]
                    }
                ]
                
                # Create zones and regions
                for zone_data in zones_data:
                    zone = Zone(
                        org_id=org_id,
                        zone_name=zone_data["name"],
                        notes=f"{zone_data['name']} - contains {len(zone_data['regions'])} regions",
                        status=ZoneStatus.ACTIVE,
                        created_by=None,
                    )
                    db.add(zone)
                    await db.flush()
                    
                    # Add regions for this zone
                    for region_name in zone_data["regions"]:
                        region = Region(
                            org_id=org_id,
                            zone_id=zone.id,
                            region_name=region_name,
                            notes=f"{region_name} region - {zone_data['name']}",
                            status=RegionStatus.ACTIVE,
                            created_by=None,
                        )
                        db.add(region)
                    
                    print(f"Created {zone_data['name']} with regions: {', '.join(zone_data['regions'])}")
                
                await db.commit()
                print("Committed zones and regions")

            except Exception as zone_error:
                print(f"WARNING: Zones/Regions seeding issue: {zone_error}")

            # ---- Store + Asset Types + Inventory ----
            try:
                existing_store = (await db.execute(
                    select(Store).where(Store.org_id == org_id).limit(1)
                )).scalar_one_or_none()

                if existing_store:
                    print("Store already exists. Skipping inventory seed.")
                else:
                    # Create central store
                    store = Store(
                        org_id=org_id,
                        store_name="Central Store",
                        location="Head Office",
                        address="123 Security Ave, Guard City",
                        status="active",
                        created_by=None,
                    )
                    db.add(store)
                    await db.flush()
                    print(f"Created store: {store.store_name}")

                    # Predefined asset types
                    predefined_types = [
                        ("Guns/Firearms", "Pistols, rifles, and other firearms"),
                        ("Uniforms", "Security guard uniforms and work attire"),
                        ("Radios", "Two-way radios and communication devices"),
                        ("Boots", "Safety and tactical boots for field personnel"),
                        ("Belts", "Duty belts, holsters, and accessories"),
                    ]
                    type_map = {}
                    for type_name, description in predefined_types:
                        at = AssetType(
                            org_id=org_id,
                            type_name=type_name,
                            description=description,
                            is_custom=False,
                            status="active",
                            created_by=None,
                        )
                        db.add(at)
                        await db.flush()
                        type_map[type_name] = at.id
                    print(f"Created {len(predefined_types)} predefined asset types")

                    # Sample inventory items with initial stock
                    sample_items = [
                        ("Pistol 9mm", "Guns/Firearms", 50000.0, 10),
                        ("Guard Uniform Set", "Uniforms", 35000.0, 50),
                        ("Motorola Radio DP1400", "Radios", 120000.0, 20),
                        ("Tactical Boots Size 42", "Boots", 55000.0, 30),
                        ("Duty Belt", "Belts", 18000.0, 40),
                    ]
                    for item_name, type_name, unit_cost, initial_qty in sample_items:
                        item = InventoryItem(
                            org_id=org_id,
                            store_id=store.id,
                            asset_type_id=type_map[type_name],
                            item_name=item_name,
                            unit_cost=unit_cost,
                            current_count=initial_qty,
                            issued_count=0,
                            written_off_count=0,
                            status="active",
                            created_by=None,
                        )
                        db.add(item)
                        await db.flush()
                        txn = InventoryTransaction(
                            org_id=org_id,
                            item_id=item.id,
                            transaction_type="receive",
                            quantity=initial_qty,
                            direction="in",
                            reference_type="adjustment",
                            reference_name="Initial stock",
                            transaction_date=date.today(),
                            notes="Initial stock on seed",
                            created_by=None,
                        )
                        db.add(txn)

                    await db.commit()
                    print(f"Created {len(sample_items)} sample inventory items with initial stock")

            except Exception as inv_error:
                print(f"WARNING: Inventory seeding issue: {inv_error}")
                import traceback
                traceback.print_exc()

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
