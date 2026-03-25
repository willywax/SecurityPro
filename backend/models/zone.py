"""Zone, Region, and related models for geographic hierarchy."""
from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum, Boolean, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import ZoneStatus, RegionStatus


class Zone(BaseModel):
    """Operational zone model — top of the geographic hierarchy."""
    __tablename__ = "zones"

    zone_name = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(
        SQLEnum(
            ZoneStatus,
            name="zone_status",
            native_enum=False,
            create_constraint=False,
            validate_strings=True,
        ),
        default=ZoneStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    regions = relationship("Region", back_populates="zone", cascade="all, delete-orphan")
    managers = relationship("ZoneManager", back_populates="zone", cascade="all, delete-orphan")
    payrolls = relationship("Payroll", back_populates="zone")


class ZoneManager(BaseModel):
    """Assignment of an employee as manager of a zone."""
    __tablename__ = "zone_managers"

    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    # Relationships
    zone = relationship("Zone", back_populates="managers")
    employee = relationship("Employee", back_populates="zone_manager_assignments")


class Region(BaseModel):
    """Region model — belongs to one zone at a time."""
    __tablename__ = "regions"

    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="RESTRICT"), nullable=False, index=True)
    region_name = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(
        SQLEnum(
            RegionStatus,
            name="region_status",
            native_enum=False,
            create_constraint=False,
            validate_strings=True,
        ),
        default=RegionStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    zone = relationship("Zone", back_populates="regions")
    employees = relationship("Employee", back_populates="region_obj")
    sites = relationship("Site", back_populates="region_obj")
    transfers_from = relationship("RegionTransfer", foreign_keys="RegionTransfer.region_id", back_populates="region")


class RegionTransfer(BaseModel):
    """Audit log of region transfers between zones."""
    __tablename__ = "region_transfers"

    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id", ondelete="CASCADE"), nullable=False, index=True)
    from_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    to_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    transferred_date = Column(Date, nullable=False)
    transferred_by = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    region = relationship("Region", foreign_keys=[region_id], back_populates="transfers_from")
