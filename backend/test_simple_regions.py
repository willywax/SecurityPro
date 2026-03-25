"""Test simple regions query"""
import asyncio
from sqlalchemy import select
from models.zone import Region
from db.dependencies import get_db

async def test_simple_query():
    """Test basic regions query"""
    try:
        async for db in get_db():
            # Simple query
            query = select(Region)
            result = await db.execute(query)
            regions = result.scalars().all()
            print(f"✓ Found {len(regions)} regions")
            for r in regions[:3]:
                print(f"  - {r.region_name} (status: {r.status})")
            break  # Only run once
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple_query())


