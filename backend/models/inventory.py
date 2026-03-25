"""Inventory management models - replaces individual asset tracking."""
from sqlalchemy import Column, String, Text, Date, Boolean, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel


class AssetType(BaseModel):
    """Predefined and custom asset category types."""
    __tablename__ = "asset_types"

    type_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_custom = Column(Boolean, default=True, nullable=False)
    status = Column(String, default="active", nullable=False)  # active|inactive

    inventory_items = relationship("InventoryItem", back_populates="asset_type")


class Store(BaseModel):
    """Central inventory store."""
    __tablename__ = "stores"

    store_name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    address = Column(String, nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    phone = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False)

    manager = relationship("Employee", foreign_keys=[manager_id])
    inventory_items = relationship("InventoryItem", back_populates="store")


class InventoryItem(BaseModel):
    """A type of item held in the store (e.g. 'AK-47 Rifle', 'Security Uniform S')."""
    __tablename__ = "inventory_items"

    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type_id = Column(UUID(as_uuid=True), ForeignKey("asset_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    item_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    unit_cost = Column(Float, nullable=True)
    current_count = Column(Integer, default=0, nullable=False)
    issued_count = Column(Integer, default=0, nullable=False)
    written_off_count = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String, default="active", nullable=False)

    store = relationship("Store", back_populates="inventory_items")
    asset_type = relationship("AssetType", back_populates="inventory_items")
    transactions = relationship("InventoryTransaction", back_populates="item", cascade="all, delete-orphan")
    issuances = relationship("InventoryIssuance", back_populates="item", cascade="all, delete-orphan")
    write_offs = relationship("WrittenOffRegister", back_populates="item", cascade="all, delete-orphan")


class InventoryTransaction(BaseModel):
    """Full ledger of every stock movement."""
    __tablename__ = "inventory_transactions"

    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False)   # receive|issue|return|write_off|adjustment
    quantity = Column(Integer, nullable=False)
    direction = Column(String, nullable=False)           # in|out
    reference_type = Column(String, nullable=True)       # employee|site|supplier|adjustment
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    reference_name = Column(String, nullable=True)
    issued_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    transaction_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)

    item = relationship("InventoryItem", back_populates="transactions")


class InventoryIssuance(BaseModel):
    """Tracks each issuance of items to an employee or site."""
    __tablename__ = "inventory_issuances"

    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)
    issued_to_type = Column(String, nullable=False)      # employee|site
    issued_to_id = Column(UUID(as_uuid=True), nullable=True)
    issued_to_name = Column(String, nullable=False)      # snapshot at time of issue
    quantity_issued = Column(Integer, nullable=False)
    issue_date = Column(Date, nullable=False)
    expected_return_date = Column(Date, nullable=True)
    actual_return_date = Column(Date, nullable=True)
    quantity_returned = Column(Integer, default=0, nullable=False)
    issue_condition = Column(String, nullable=False)     # good|fair|poor
    return_condition = Column(String, nullable=True)     # good|fair|poor|damaged|lost
    issued_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    return_received_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="active", nullable=False)  # active|partially_returned|fully_returned|lost
    notes = Column(Text, nullable=True)

    item = relationship("InventoryItem", back_populates="issuances")
    write_offs = relationship(
        "WrittenOffRegister",
        back_populates="reference_issuance",
        foreign_keys="WrittenOffRegister.reference_issuance_id",
    )


class WrittenOffRegister(BaseModel):
    """Permanent log of all write-offs."""
    __tablename__ = "written_off_register"

    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    write_off_date = Column(Date, nullable=False)
    reason = Column(String, nullable=False)              # damaged|lost|expired|obsolete|other
    reason_details = Column(Text, nullable=False)
    written_off_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reference_issuance_id = Column(UUID(as_uuid=True), ForeignKey("inventory_issuances.id", ondelete="SET NULL"), nullable=True)

    item = relationship("InventoryItem", back_populates="write_offs")
    reference_issuance = relationship(
        "InventoryIssuance",
        back_populates="write_offs",
        foreign_keys=[reference_issuance_id],
    )
