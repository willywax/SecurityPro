from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Client(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "clients"

    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    contact_name: Mapped[str | None] = mapped_column(String(120))
    contact_phone: Mapped[str | None] = mapped_column(String(40))
    contact_email: Mapped[str | None] = mapped_column(String(120))
    billing_address: Mapped[str | None] = mapped_column(Text)
    billing_email: Mapped[str | None] = mapped_column(String(120))
    billing_cycle: Mapped[str] = mapped_column(Enum("monthly", "quarterly", "ad_hoc", name="billing_cycle_enum"), default="monthly")
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(Enum("active", "inactive", name="client_status_enum"), default="active")


class Site(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "sites"
    __table_args__ = (UniqueConstraint("client_id", "name", name="uq_site_name_per_client"),)

    client_id = mapped_column(ForeignKey("clients.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    region: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    ward: Mapped[str | None] = mapped_column(String(100))
    address_notes: Mapped[str | None] = mapped_column(Text)
    gps_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    gps_lng: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    site_contact_name: Mapped[str | None] = mapped_column(String(120))
    site_contact_phone: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(Enum("active", "inactive", name="site_status_enum"), default="active")
    billing_rate_monthly: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    required_guards_day: Mapped[int] = mapped_column(default=0)
    required_guards_night: Mapped[int] = mapped_column(default=0)


class Guard(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "guards"
    guard_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(40))
    national_id: Mapped[str | None] = mapped_column(String(40), unique=True)
    gender: Mapped[str | None] = mapped_column(String(20))
    dob: Mapped[date | None] = mapped_column(Date)
    home_address: Mapped[str | None] = mapped_column(Text)
    next_of_kin_name: Mapped[str | None] = mapped_column(String(120))
    next_of_kin_phone: Mapped[str | None] = mapped_column(String(40))
    hire_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", "suspended", "terminated", "on_leave", name="guard_status_enum"), default="active"
    )
    base_salary_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    housing_allowance_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    transport_allowance_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    other_allowance_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[str | None] = mapped_column(Text)


class GuardAdvance(UUIDMixin, Base):
    __tablename__ = "guard_advances"
    guard_id = mapped_column(ForeignKey("guards.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(Enum("open", "closed", name="advance_status_enum"), default="open")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class PayrollMonth(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payroll_months"
    month: Mapped[date] = mapped_column(Date, unique=True)
    status: Mapped[str] = mapped_column(Enum("draft", "locked", "paid", name="payroll_month_status_enum"), default="draft")


class PayrollItem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payroll_items"
    __table_args__ = (UniqueConstraint("payroll_month_id", "guard_id", name="uq_payroll_item_guard_month"),)

    payroll_month_id = mapped_column(ForeignKey("payroll_months.id"), index=True)
    guard_id = mapped_column(ForeignKey("guards.id"), index=True)
    base_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    allowances_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    overtime_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    deductions_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    advances_deducted: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_pay: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[str | None] = mapped_column(Text)


class PayrollAdjustment(UUIDMixin, Base):
    __tablename__ = "payroll_adjustments"
    payroll_item_id = mapped_column(ForeignKey("payroll_items.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(Enum("allowance", "deduction", "overtime", name="payroll_adj_type_enum"))
    label: Mapped[str] = mapped_column(String(120))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Asset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "assets"
    asset_tag: Mapped[str] = mapped_column(String(80), unique=True)
    type: Mapped[str] = mapped_column(Enum("gun", "uniform", "radio", "torch", "baton", "handcuffs", "other", name="asset_type_enum"))
    name: Mapped[str | None] = mapped_column(String(200))
    serial_no: Mapped[str | None] = mapped_column(String(120), unique=True)
    condition: Mapped[str] = mapped_column(Enum("new", "good", "fair", "damaged", "lost", name="asset_condition_enum"), default="good")
    status: Mapped[str] = mapped_column(Enum("available", "issued", "maintenance", "retired", "lost", name="asset_status_enum"), default="available")
    purchase_date: Mapped[date | None] = mapped_column(Date)
    purchase_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)


class AssetIssuance(UUIDMixin, Base):
    __tablename__ = "asset_issuances"
    asset_id = mapped_column(ForeignKey("assets.id"), index=True)
    guard_id = mapped_column(ForeignKey("guards.id"), index=True)
    site_id = mapped_column(ForeignKey("sites.id"), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expected_return_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    issue_condition: Mapped[str] = mapped_column(Enum("new", "good", "fair", "damaged", name="issue_condition_enum"))
    return_condition: Mapped[str | None] = mapped_column(Enum("new", "good", "fair", "damaged", "lost", name="return_condition_enum"))
    status: Mapped[str] = mapped_column(Enum("issued", "returned", "lost", name="issuance_status_enum"), default="issued")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Invoice(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "invoices"
    client_id = mapped_column(ForeignKey("clients.id"), index=True)
    invoice_no: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    currency: Mapped[str] = mapped_column(String(10), default="TZS")
    status: Mapped[str] = mapped_column(Enum("draft", "sent", "part_paid", "paid", "void", name="invoice_status_enum"), default="draft")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    sent_to_email: Mapped[str | None] = mapped_column(String(120))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class InvoiceItem(UUIDMixin, Base):
    __tablename__ = "invoice_items"
    invoice_id = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    site_id = mapped_column(ForeignKey("sites.id"), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Payment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payments"
    client_id = mapped_column(ForeignKey("clients.id"), index=True)
    payment_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    method: Mapped[str] = mapped_column(Enum("cash", "bank", "mobile_money", "cheque", "other", name="payment_method_enum"), default="bank")
    reference: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)


class PaymentAllocation(UUIDMixin, Base):
    __tablename__ = "payment_allocations"
    __table_args__ = (UniqueConstraint("payment_id", "invoice_id", name="uq_payment_invoice"),)
    payment_id = mapped_column(ForeignKey("payments.id", ondelete="CASCADE"), index=True)
    invoice_id = mapped_column(ForeignKey("invoices.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class EmailOutbox(UUIDMixin, Base):
    __tablename__ = "email_outbox"
    type: Mapped[str] = mapped_column(Enum("invoice", "statement", name="email_type_enum"))
    to_email: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    attachment_path: Mapped[str | None] = mapped_column(String(240))
    status: Mapped[str] = mapped_column(Enum("queued", "sent", "failed", name="email_status_enum"), default="queued")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
