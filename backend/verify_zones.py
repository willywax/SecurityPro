"""Verify zones and regions seeding"""
from sqlalchemy import text, create_engine

DATABASE_URL = "postgresql://postgres:admin@localhost:5432/securitypro"

def verify_zones():
    """Verify zones and regions were created"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Get zones
        zones_result = connection.execute(text("""
            SELECT id, zone_name, status FROM zones ORDER BY zone_name
        """))
        zones = zones_result.fetchall()
        
        print("=" * 60)
        print("ZONES CREATED:")
        print("=" * 60)
        for zone in zones:
            print(f"✓ {zone[1]} (ID: {zone[0]}) - Status: {zone[2]}")
            
            # Get regions for this zone
            regions_result = connection.execute(text("""
                SELECT region_name, status FROM regions 
                WHERE zone_id = :zone_id
                ORDER BY region_name
            """), {"zone_id": zone[0]})
            regions = regions_result.fetchall()
            
            for region in regions:
                print(f"    ├── {region[0]} ({region[1]})")
        
        print("\n" + "=" * 60)
        print("SUMMARY:")
        print("=" * 60)
        total_zones = connection.execute(text("SELECT COUNT(*) FROM zones")).scalar()
        total_regions = connection.execute(text("SELECT COUNT(*) FROM regions")).scalar()
        print(f"Total Zones: {total_zones}")
        print(f"Total Regions: {total_regions}")

if __name__ == "__main__":
    verify_zones()
