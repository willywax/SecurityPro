"""Base model for all SQLAlchemy models."""
from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Define Base here to avoid circular imports
Base = declarative_base()


class BaseModel(Base):
    """
    Base model with common fields for all tables.

    All models inherit:
    - id: UUID primary key
    - org_id: UUID for multi-tenant isolation
    - created_at: Timestamp when record was created (UTC)
    - updated_at: Timestamp when record was last updated (UTC)
    - created_by: UUID of user who created the record
    """
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), nullable=True)
