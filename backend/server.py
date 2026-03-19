from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Import routers
from routers import auth
from routers import employees
from routers import clients
from routers import sites
from routers import assets
from routers import payrolls
from routers import invoices

# Set database for routers
auth.set_db(db)
employees.set_db(db)
clients.set_db(db)
sites.set_db(db)
assets.set_db(db)
payrolls.set_db(db)
invoices.set_db(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run seed script
    from seed import seed_database
    try:
        await seed_database()
    except Exception as e:
        logging.error(f"Seeding error: {e}")
    # Add bank_details to orgs that don't have it yet
    try:
        await db.organizations.update_many(
            {"bank_details": {"$exists": False}},
            {"$set": {"bank_details": {
                "bank_name": "CRDB Bank Tanzania",
                "account_name": "SecureOps Demo Ltd",
                "account_number": "0150123456789",
                "branch": "Dar es Salaam Main Branch",
                "swift_code": "CORUTZTZ"
            }}}
        )
    except Exception as e:
        logging.error(f"Bank details migration error: {e}")
    yield
    # Shutdown
    client.close()


# Create the main app
app = FastAPI(
    title="Security Operations SaaS API",
    description="Multi-tenant SaaS platform for security guard companies",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static files for uploads
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
(uploads_dir / "photos").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "Security Operations SaaS API", "status": "healthy"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "security-ops-api"}


# Include routers
api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(clients.router)
api_router.include_router(sites.router)
api_router.include_router(assets.router)
api_router.include_router(payrolls.router)
api_router.include_router(invoices.router)


@api_router.get("/organization")
async def get_organization(token_data: dict = Depends(auth.get_token_data)):
    """Get full organization details including bank details"""
    org_id = token_data.get("org_id")
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {
        "id": org["id"],
        "name": org["name"],
        "slug": org["slug"],
        "logo_url": org.get("logo_url"),
        "accent_color": org.get("accent_color", "#0F172A"),
        "address": org.get("address"),
        "phone": org.get("phone"),
        "email": org.get("email"),
        "website": org.get("website"),
        "bank_details": org.get("bank_details"),
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
