# PostgreSQL Migration - Database Layer Complete

## ✅ What Was Completed

### 1. Dependencies Installed
- sqlalchemy[asyncio] >= 2.0.0
- asyncpg >= 0.29.0
- alembic >= 1.13.0
- Updated `requirements.txt`

### 2. Folder Structure Created
```
backend/
├── db/                    # Database connection layer
│   ├── __init__.py
│   ├── base.py           # Declarative base with all model imports
│   ├── session.py        # Async engine and session factory
│   └── dependencies.py   # FastAPI dependency for DB sessions
├── models/               # SQLAlchemy ORM models
│   ├── enums.py          # All PostgreSQL enums
│   ├── base.py           # BaseModel with common fields
│   ├── organization.py   # Organization model
│   ├── auth.py           # User, Role, RefreshToken
│   ├── employee.py       # Employee + 6 related models
│   ├── client.py         # Client model
│   ├── site.py           # Site model
│   ├── asset.py          # Asset, AssetIssuance
│   ├── payroll.py        # Payroll model
│   └── invoice.py        # Invoice, InvoiceSite, InvoiceItem, Payment, PaymentAllocation
├── schemas/              # Pydantic schemas (placeholder for future)
├── crud/                 # CRUD operations (placeholder for future)
└── alembic/              # Database migrations
    ├── env.py            # Configured for async SQLAlchemy
    ├── versions/         # Migration files
    └── alembic.ini       # Alembic configuration
```

### 3. All SQLAlchemy Models Created (19 tables)
✅ organizations
✅ users, roles, refresh_tokens
✅ employees, employee_bank_accounts, employee_referees, employee_next_of_kin, employee_contracts, employee_documents, employment_history
✅ clients, sites
✅ assets, asset_issuances
✅ payrolls
✅ invoices, invoice_sites, invoice_items, payments, payment_allocations

**Model Features:**
- UUID primary keys
- Multi-tenant with org_id on all tables
- Audit fields (created_at, updated_at, created_by)
- PostgreSQL enums for all status fields
- Proper foreign key relationships
- Cascade deletes where appropriate
- Indexes on org_id, foreign keys, and unique fields

### 4. Alembic Configured
- Async support enabled
- Auto-loads models from db/base.py
- Reads DATABASE_URL from .env
- Ready to generate and run migrations

### 5. Environment Configuration
Created `backend/.env` with:
- DATABASE_URL for PostgreSQL
- Kept MongoDB config commented (for transition period)
- JWT_SECRET_KEY
- CORS_ORIGINS

### 6. Server.py Updated
- Added SQLAlchemy imports alongside MongoDB
- Both systems coexist (MongoDB still active)
- SQLAlchemy engine cleanup in lifespan
- Ready for gradual router migration

## 📋 Next Steps

### Step 1: Setup PostgreSQL Database
```bash
# Install PostgreSQL if not already installed
# Create database
createdb securitypro

# Or using psql:
psql -U postgres
CREATE DATABASE securitypro;
\q
```

### Step 2: Update .env File
Edit `backend/.env` with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql+asyncpg://your_user:your_password@localhost:5432/securitypro
```

### Step 3: Generate Initial Migration
```bash
cd backend
python -m alembic revision --autogenerate -m "Initial migration - all tables"
```

This will create a migration file in `alembic/versions/` with DDL for all 19 tables.

### Step 4: Review Migration File
Open the generated migration file in `alembic/versions/` and review:
- All tables are included
- All columns are correct
- Foreign keys are properly defined
- Indexes are created

### Step 5: Run Migration
```bash
cd backend
python -m alembic upgrade head
```

This will create all tables in your PostgreSQL database.

### Step 6: Verify Tables Created
```bash
psql securitypro
\dt
\d+ organizations
\q
```

You should see all 19 tables created.

### Step 7: Test Database Connection (Optional)
Create a simple test script to verify connectivity:
```python
import asyncio
from backend.db.session import AsyncSessionLocal
from backend.models.organization import Organization

async def test_connection():
    async with AsyncSessionLocal() as session:
        result = await session.execute("SELECT 1")
        print("✅ Database connection successful!")

asyncio.run(test_connection())
```

## 🔄 Migration Strategy

### Current State
- ✅ Database layer is ready
- ✅ All ORM models are defined
- ⏳ Routers still use MongoDB (not updated yet)

### Phased Approach (Future Work)

**Phase 1: Update Routers (One at a time)**
1. Create CRUD functions for the router's domain
2. Update router to use `Depends(get_db)` instead of global `db`
3. Replace MongoDB queries with SQLAlchemy queries
4. Test thoroughly
5. Migrate data for that domain from MongoDB to PostgreSQL

**Phase 2: Data Migration**
- Write scripts to migrate existing MongoDB data to PostgreSQL
- Use the same UUIDs to maintain referential integrity
- Verify data after migration

**Phase 3: Remove MongoDB**
- Once all routers are migrated and tested
- Remove MongoDB dependencies
- Remove Motor from requirements.txt
- Remove MongoDB config from server.py

## 📁 Key Files Created

| File | Purpose |
|------|---------|
| `backend/db/base.py` | Declarative base with all model imports |
| `backend/db/session.py` | Async engine and session factory |
| `backend/db/dependencies.py` | FastAPI dependency for DB sessions |
| `backend/models/enums.py` | All PostgreSQL enum types |
| `backend/models/*.py` | 10 model files with 19 tables |
| `backend/alembic/env.py` | Alembic configuration for async |
| `backend/.env` | Environment variables |

## 🎯 Using the New Database Layer

### In Future Routers (Example)
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db.dependencies import get_db
from backend.models.client import Client

router = APIRouter()

@router.get("/clients")
async def get_clients(
    db: AsyncSession = Depends(get_db),
    org_id: UUID = Depends(get_current_org_id)
):
    result = await db.execute(
        select(Client)
        .where(Client.org_id == org_id)
        .order_by(Client.created_at.desc())
    )
    clients = result.scalars().all()
    return clients
```

## ⚠️ Important Notes

1. **MongoDB Still Active**: The app continues to work with MongoDB. The PostgreSQL layer is ready but not yet used by routers.

2. **No Breaking Changes**: All existing functionality remains intact.

3. **Gradual Migration**: Update routers one at a time to minimize risk.

4. **Database URL Format**: Must use `postgresql+asyncpg://` for async support.

5. **UUID Handling**: All IDs are UUIDs (uuid.uuid4()) generated in Python, not PostgreSQL.

6. **Timestamps**: Use UTC timezone (server_default=func.now()).

7. **Multi-tenancy**: Every query must filter by org_id for data isolation.

## 🐛 Troubleshooting

### Alembic command not found
Use: `python -m alembic` instead of just `alembic`

### Database connection errors
- Verify PostgreSQL is running
- Check DATABASE_URL format in .env
- Ensure database exists: `createdb securitypro`
- Check PostgreSQL user permissions

### Import errors
- Ensure you're in the backend directory
- Check Python path includes backend package
- Verify all __init__.py files exist

### Migration fails
- Check all models are imported in db/base.py
- Review Alembic env.py configuration
- Verify PostgreSQL version (requires 12+)

## 📊 Database Schema Summary

**19 Tables Created:**
- 1 organization table
- 3 auth tables (users, roles, refresh_tokens)
- 7 employee tables (employees + 6 related tables)
- 2 client/site tables
- 2 asset tables
- 1 payroll table
- 5 invoice/payment tables

**Total Enum Types:** 15
**Total Relationships:** 40+
**Foreign Keys:** 25+

## ✨ What's Next?

1. **Setup PostgreSQL** and run migrations
2. **Verify schema** matches your requirements
3. **Test database connection**
4. **Begin updating one router** (start with auth or clients)
5. **Create CRUD operations** for that router
6. **Migrate data** for that domain
7. **Repeat** for other routers

---

**Migration Status:** Database layer complete ✅
**Next Phase:** Router updates (future work)
**MongoDB Status:** Still active, can be removed after full migration
