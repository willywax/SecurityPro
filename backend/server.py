from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL/SQLAlchemy setup
from db.session import engine as sqlalchemy_engine
from db.dependencies import get_db
from db.base import Base
from models.organization import Organization

# Import routers
from routers import auth
from routers import dashboard
from routers import employees
from routers import contracts
from routers import clients
from routers import sites
from routers import payrolls
from routers import invoices
from routers import zones
from routers import regions
from routers import asset_types
from routers import store
from routers import inventory
from routers import issuances
from routers import write_offs
from routers import users
from routers import files


async def run_contract_expiry_check():
    """Auto-expire contracts whose end_date has passed."""
    from db.session import AsyncSessionLocal
    from sqlalchemy import select
    from models.employee import Employee, EmployeeContract
    from models.enums import ContractStatus, EmploymentStatus
    from datetime import date

    async with AsyncSessionLocal() as db:
        try:
            today = date.today()
            result = await db.execute(
                select(EmployeeContract).where(
                    EmployeeContract.status == ContractStatus.ACTIVE,
                    EmployeeContract.end_date < today,
                )
            )
            contracts = result.scalars().all()
            expired_count = 0
            for contract in contracts:
                contract.status = ContractStatus.EXPIRED
                contract.auto_expired = True
                emp_result = await db.execute(
                    select(Employee).where(Employee.id == contract.employee_id)
                )
                employee = emp_result.scalar_one_or_none()
                if employee:
                    employee.employment_status = EmploymentStatus.INACTIVE
                expired_count += 1
            await db.commit()
            if expired_count:
                logging.info(f"Auto-expired {expired_count} contract(s) on startup.")
        except Exception as e:
            logging.error(f"Contract expiry check error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run seed script for PostgreSQL
    from seed import seed_database
    try:
        await seed_database()
    except Exception as e:
        logging.error(f"Seeding error: {e}")

    # Run contract expiry check on startup
    await run_contract_expiry_check()

    yield

    # Shutdown: Close connections
    await sqlalchemy_engine.dispose()


# Create the main app
app = FastAPI(
    title="Lakezone Operation System API",
    description="Multi-tenant SaaS platform for security guard companies",
    version="1.0.0",
    lifespan=lifespan
)
app.router.redirect_slashes = False

# CORS must be registered before any mounts/routes so it wraps the full app
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
(uploads_dir / "photos").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
api_router.redirect_slashes = False


# Health check endpoint
@api_router.get("")
async def root():
    return {"message": "Lakezone Operation System API", "status": "healthy"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "security-ops-api"}


@api_router.get("/organization")
async def get_organization(
    token_data: dict = Depends(auth.get_token_data),
    db: AsyncSession = Depends(get_db)
):
    """Get full organization details including bank details"""
    org_id = token_data.get("org_id")
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "logo_url": org.logo_url,
        "accent_color": org.accent_color or "#0F172A",
        "address": org.address,
        "phone": org.phone,
        "email": org.email,
        "website": org.website,
        "bank_details": org.bank_details,
    }


# Include routers
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(employees.router)
api_router.include_router(contracts.router)
api_router.include_router(clients.router)
api_router.include_router(sites.router)
api_router.include_router(payrolls.router)
api_router.include_router(invoices.router)
api_router.include_router(zones.router)
api_router.include_router(regions.router)
api_router.include_router(asset_types.router)
api_router.include_router(store.router)
api_router.include_router(inventory.router)
api_router.include_router(issuances.router)
api_router.include_router(write_offs.router)
api_router.include_router(users.router)
api_router.include_router(files.router)

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
