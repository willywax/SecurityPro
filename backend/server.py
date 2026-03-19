from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Import routers
from routers import auth

# Set database for auth router
auth.set_db(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run seed script
    from seed import seed_database
    try:
        await seed_database()
    except Exception as e:
        logging.error(f"Seeding error: {e}")
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

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "Security Operations SaaS API", "status": "healthy"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "security-ops-api"}


# Include auth router
api_router.include_router(auth.router)

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
