# Database Seeding Script

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from models import Organization, User, UserRole
from utils.auth import hash_password


async def seed_database():
    """Seed the database with initial data"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting database seeding...")
    
    # Check if already seeded
    existing_org = await db.organizations.find_one({"slug": "secureops-demo"})
    if existing_org:
        print("✅ Database already seeded. Skipping...")
        client.close()
        return
    
    # Create default organization
    org = Organization(
        id="org_default_001",
        name="SecureOps Demo",
        slug="secureops-demo",
        logo_url=None,
        accent_color="#0F172A",
        address="123 Security Ave, Guard City, GC 12345",
        phone="+1 (555) 123-4567",
        email="info@secureops-demo.com",
        website="https://secureops-demo.com"
    )
    
    org_dict = org.model_dump()
    org_dict['created_at'] = org_dict['created_at'].isoformat()
    org_dict['updated_at'] = org_dict['updated_at'].isoformat()
    
    await db.organizations.insert_one(org_dict)
    print(f"✅ Created organization: {org.name}")
    
    # Create admin user
    admin_user = User(
        id="user_admin_001",
        org_id=org.id,
        email="admin@securityops.com",
        password_hash=hash_password("Admin123!"),
        first_name="System",
        last_name="Administrator",
        role=UserRole.ADMIN,
        is_active=True,
        created_by=None
    )
    
    user_dict = admin_user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    print(f"✅ Created admin user: {admin_user.email}")
    
    # Create indexes for better query performance
    await db.organizations.create_index("slug", unique=True)
    await db.organizations.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("org_id")
    await db.refresh_tokens.create_index("token")
    await db.refresh_tokens.create_index("user_id")
    await db.refresh_tokens.create_index("expires_at")
    
    print("✅ Created database indexes")
    
    print("\n🎉 Database seeding complete!")
    print(f"\n📧 Admin Login: admin@securityops.com")
    print(f"🔑 Password: Admin123!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
