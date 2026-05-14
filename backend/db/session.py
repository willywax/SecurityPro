"""Async database session configuration."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from dotenv import load_dotenv
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/securitypro")

connect_args = {}

if "sslmode=require" in DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    q = dict(parse_qsl(parsed.query))
    # convert sqlalchmey sslmode to asyncpg ssl param
    connect_args["ssl"] = "require"
    q.pop("sslmode", None)
    q.pop("channel_binding", None)
    parsed = parsed._replace(query=urlencode(q))
    DATABASE_URL = urlunparse(parsed)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
