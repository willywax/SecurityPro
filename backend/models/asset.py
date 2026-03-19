"""Asset and asset issuance models."""
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import AssetType, AssetStatus, AssetCondition


class Asset(BaseModel):
    """Asset/equipment model for inventory management."""
    __tablename__ = "assets"

    asset_id = Column(String, nullable=False, index=True)  # ASSET0001, ASSET0002, etc.
    asset_tag = Column(String, nullable=True)
    asset_type = Column(SQLEnum(AssetType, name="asset_type", create_type=True), nullable=False)
    name = Column(String, nullable=False)
    serial_number = Column(String, nullable=True)
    status = Column(
        SQLEnum(AssetStatus, name="asset_status", create_type=True),
        default=AssetStatus.AVAILABLE,
        nullable=False
    )
    condition = Column(
        SQLEnum(AssetCondition, name="asset_condition", create_type=True),
        default=AssetCondition.GOOD,
        nullable=False
    )
    purchase_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships
    issuances = relationship("AssetIssuance", back_populates="asset", cascade="all, delete-orphan")


class AssetIssuance(BaseModel):
    """Asset issuance tracking - assigns assets to employees or sites."""
    __tablename__ = "asset_issuances"

    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    issued_to_employee = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)
    issued_to_site = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True)
    issue_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)  # NULL indicates active issuance
    issue_condition = Column(SQLEnum(AssetCondition, name="asset_condition_issue", create_type=True), nullable=False)
    return_condition = Column(SQLEnum(AssetCondition, name="asset_condition_return", create_type=True), nullable=True)
    lost = Column(Boolean, default=False, nullable=False)
    remarks = Column(String, nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="issuances")
    employee = relationship("Employee")
    site = relationship("Site")
