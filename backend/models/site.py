"""Site model."""
from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import SiteStatus


class Site(BaseModel):
    """Site/location model for client sites."""
    __tablename__ = "sites"

    site_id = Column(String, nullable=False, index=True)  # SITE001, SITE002, etc.
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id", ondelete="SET NULL"), nullable=True, index=True)
    site_name = Column(String, nullable=False)
    region = Column(String, nullable=True)
    district = Column(String, nullable=True)
    ward = Column(String, nullable=True)
    address = Column(String, nullable=True)
    contact_person = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    status = Column(
        SQLEnum(SiteStatus, name="site_status", create_type=True),
        default=SiteStatus.ACTIVE,
        nullable=False
    )
    notes = Column(String, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="sites")
    region_obj = relationship("Region", back_populates="sites", foreign_keys=[region_id])
    allocations = relationship("EmployeeSiteAllocation", back_populates="site", foreign_keys="EmployeeSiteAllocation.site_id")
