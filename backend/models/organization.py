"""Organization model - parent for multi-tenant data."""
from sqlalchemy import Column, String, Boolean, JSON
from sqlalchemy.orm import relationship
from models.base import BaseModel


class Organization(BaseModel):
    """
    Organization model for multi-tenant SaaS.
    All other entities belong to an organization via org_id.
    """
    __tablename__ = "organizations"

    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    logo_url = Column(String, nullable=True)
    accent_color = Column(String, default="#3B82F6", nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    bank_details = Column(JSON, nullable=True)  # {bank_name, account_name, account_number, branch, swift_code}

    # Note: Relationships to child tables are not defined here because org_id
    # in BaseModel is used for filtering, not for SQLAlchemy relationship navigation
