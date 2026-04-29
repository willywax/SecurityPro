"""Alembic environment configuration for async SQLAlchemy."""
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine
from alembic import context
import asyncio
import os
import sys
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Base with all models
from db.base import Base

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Alembic Config object
config = context.config

# Override sqlalchemy.url from environment variable
database_url = os.getenv('DATABASE_URL', 'postgresql+asyncpg://postgres:postgres@localhost:5432/securitypro')
connect_args = {}

if 'sslmode' in database_url:
    parsed = urlparse(database_url)
    q = dict(parse_qsl(parsed.query))
    sslmode = q.pop('sslmode', None)
    q.pop('channel_binding', None)
    if sslmode in ('require', 'verify-full', 'verify-ca'):
        connect_args['ssl'] = 'require'
    database_url = urlunparse(parsed._replace(query=urlencode(q)))

config.set_main_option('sqlalchemy.url', database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata from models
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Detect column type changes
        compare_server_default=True,  # Detect default value changes
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with given connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in async mode."""
    connectable = create_async_engine(
        database_url,
        echo=False,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (async)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
