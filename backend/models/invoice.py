"""Invoice, payment, and related models."""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import InvoiceStatus, ItemType, PaymentStatus


class Invoice(BaseModel):
    """Invoice model for client billing."""
    __tablename__ = "invoices"

    invoice_id = Column(String, nullable=False, index=True)  # INV0001, INV0002, etc.
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_date = Column(String, nullable=False)  # Format: YYYY-MM-DD
    due_date = Column(String, nullable=False)  # Format: YYYY-MM-DD
    status = Column(
        SQLEnum(InvoiceStatus, name="invoice_status", create_type=True),
        default=InvoiceStatus.DRAFT,
        nullable=False
    )
    notes = Column(String, nullable=True)
    grand_total = Column(Float, default=0.0, nullable=False)  # Auto-calculated from sites

    # Relationships
    client = relationship("Client", back_populates="invoices")
    sites = relationship("InvoiceSite", back_populates="invoice", cascade="all, delete-orphan")
    payment_allocations = relationship("PaymentAllocation", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceSite(BaseModel):
    """Invoice site - groups invoice items by site."""
    __tablename__ = "invoice_sites"

    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    site_name = Column(String, nullable=False)  # Denormalized for invoice display
    subtotal = Column(Float, default=0.0, nullable=False)  # Sum of all items for this site

    # Relationships
    invoice = relationship("Invoice", back_populates="sites")
    site = relationship("Site")
    items = relationship("InvoiceItem", back_populates="invoice_site", cascade="all, delete-orphan")


class InvoiceItem(BaseModel):
    """Invoice line item."""
    __tablename__ = "invoice_items"

    invoice_site_id = Column(UUID(as_uuid=True), ForeignKey("invoice_sites.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(SQLEnum(ItemType, name="item_type", create_type=True), nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)  # Computed: quantity × rate

    # Relationships
    invoice_site = relationship("InvoiceSite", back_populates="items")
    invoice = relationship("Invoice")


class Payment(BaseModel):
    """Payment model for client payments."""
    __tablename__ = "payments"

    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    payment_method = Column(String, nullable=False)  # e.g., "bank_transfer", "check", "cash", "card"
    reference_number = Column(String, nullable=True)
    status = Column(
        SQLEnum(PaymentStatus, name="payment_status", create_type=True),
        default=PaymentStatus.COMPLETED,
        nullable=False
    )
    notes = Column(String, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="payments")
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")


class PaymentAllocation(BaseModel):
    """Payment allocation to invoices."""
    __tablename__ = "payment_allocations"

    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)  # Amount allocated to this invoice

    # Relationships
    payment = relationship("Payment", back_populates="allocations")
    invoice = relationship("Invoice", back_populates="payment_allocations")
