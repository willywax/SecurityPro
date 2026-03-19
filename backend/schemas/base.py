"""Base schemas for API requests/responses."""
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(from_attributes=True)


class BaseResponseSchema(BaseSchema):
    """Base response schema with common fields."""
    id: UUID
    org_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
