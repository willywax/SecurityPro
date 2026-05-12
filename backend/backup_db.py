#!/usr/bin/env python3
"""
Database backup script for SecurityPro
Creates a SQL dump of the Neon PostgreSQL database
"""

import subprocess
import os
import sys
from datetime import datetime

# Database connection URL
DB_URL = "postgresql://neondb_owner:npg_5au3LlPGHbSk@ep-autumn-mud-ai53lydm-pooler.c-4.us-east-1.aws.neon.tech/securitypro?sslmode=require"

def backup_database():
    """Create a SQL dump backup of the database"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"securitypro_backup_{timestamp}.sql"
    
    print(f"🔄 Starting database backup...")
    print(f"📁 Backup file: {backup_file}")
    
    try:
        # Run pg_dump using subprocess
        with open(backup_file, 'w') as f:
            result = subprocess.run(
                ['pg_dump', DB_URL],
                stdout=f,
                stderr=subprocess.PIPE,
                text=True
            )
        
        if result.returncode != 0:
            print(f"❌ Backup failed: {result.stderr}")
            return False
        
        # Check file size
        file_size = os.path.getsize(backup_file)
        size_mb = file_size / (1024 * 1024)
        
        print(f"✅ Backup completed successfully!")
        print(f"📦 File size: {size_mb:.2f} MB")
        print(f"💾 Saved to: {backup_file}")
        return True
        
    except FileNotFoundError:
        print("❌ Error: pg_dump not found")
        print("   Please install PostgreSQL client tools")
        print("   Or use: docker run --rm postgres:16 pg_dump ...")
        return False
    except Exception as e:
        print(f"❌ Backup failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = backup_database()
    sys.exit(0 if success else 1)
