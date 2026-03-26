"""Authentication and user schemas."""
from pydantic import BaseModel, EmailStr
from schemas.base import BaseSchema, BaseResponseSchema
from typing import Optional
from datetime import datetime
from uuid import UUID
from models.enums import UserRole


# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: str  # user_id
    email: str
    org_id: str
    role: str
    exp: int


# User schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole
    employee_id: Optional[UUID] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    employee_id: Optional[UUID] = None


class UserResponse(BaseResponseSchema):
    email: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    last_login: Optional[datetime] = None
    employee_id: Optional[UUID] = None


# Organization schemas
class OrganizationResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    accent_color: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    bank_details: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
