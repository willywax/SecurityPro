"""Guard site allocation and transfer models."""
from sqlalchemy import Column, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel


class EmployeeSiteAllocation(BaseModel):
    """Tracks which guard is allocated to which site and when."""
    __tablename__ = "employee_site_allocations"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    allocated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="active", server_default="active")
    notes = Column(Text, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="site_allocations", foreign_keys=[employee_id])
    site = relationship("Site", back_populates="allocations", foreign_keys=[site_id])


class GuardTransfer(BaseModel):
    """Audit record of a guard being transferred from one site to another."""
    __tablename__ = "guard_transfers"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    from_site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True)
    to_site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True)
    transfer_date = Column(Date, nullable=False)
    transferred_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="completed", server_default="completed")

    # Relationships
    employee = relationship("Employee", back_populates="transfers", foreign_keys=[employee_id])
    from_site = relationship("Site", foreign_keys=[from_site_id])
    to_site = relationship("Site", foreign_keys=[to_site_id])
