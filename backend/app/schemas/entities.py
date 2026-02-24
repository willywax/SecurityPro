from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ClientBase(BaseModel):
    name: str
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    billing_address: str | None = None
    billing_email: str | None = None
    billing_cycle: str = "monthly"
    opening_balance: Decimal = Decimal("0")
    status: str = "active"


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    contact_name: str | None = None
    billing_email: str | None = None


class ClientRead(ClientBase, ORMModel):
    id: UUID


class SiteBase(BaseModel):
    client_id: UUID
    name: str
    status: str = "active"
    region: str | None = None
    district: str | None = None
    ward: str | None = None
    site_contact_name: str | None = None
    site_contact_phone: str | None = None


class SiteCreate(SiteBase): ...


class SiteUpdate(BaseModel):
    name: str | None = None
    status: str | None = None


class SiteRead(SiteBase, ORMModel):
    id: UUID


class GuardBase(BaseModel):
    guard_no: str
    full_name: str
    hire_date: date
    status: str = "active"
    base_salary_monthly: Decimal
    housing_allowance_monthly: Decimal = Decimal("0")
    transport_allowance_monthly: Decimal = Decimal("0")
    other_allowance_monthly: Decimal = Decimal("0")
    phone: str | None = None


class GuardCreate(GuardBase): ...


class GuardUpdate(BaseModel):
    full_name: str | None = None
    status: str | None = None
    base_salary_monthly: Decimal | None = None


class GuardRead(GuardBase, ORMModel):
    id: UUID


class AssetBase(BaseModel):
    asset_tag: str
    type: str
    name: str | None = None
    serial_no: str | None = None
    condition: str = "good"
    status: str = "available"


class AssetCreate(AssetBase): ...


class AssetUpdate(BaseModel):
    condition: str | None = None
    status: str | None = None
    name: str | None = None


class AssetRead(AssetBase, ORMModel):
    id: UUID


class IssueAssetRequest(BaseModel):
    guard_id: UUID
    site_id: UUID | None = None
    expected_return_at: datetime | None = None
    issue_condition: str = "good"
    notes: str | None = None


class ReturnAssetRequest(BaseModel):
    return_condition: str
    notes: str | None = None


class LostAssetRequest(BaseModel):
    notes: str | None = None


class IssuanceRead(ORMModel):
    id: UUID
    asset_id: UUID
    guard_id: UUID
    site_id: UUID | None
    issued_at: datetime
    returned_at: datetime | None
    status: str


class PayrollMonthCreate(BaseModel):
    month: date


class PayrollMonthRead(ORMModel):
    id: UUID
    month: date
    status: str


class PayrollItemRead(ORMModel):
    id: UUID
    payroll_month_id: UUID
    guard_id: UUID
    base_salary: Decimal
    allowances_total: Decimal
    overtime_amount: Decimal
    deductions_total: Decimal
    advances_deducted: Decimal
    net_pay: Decimal


class PayrollAdjustmentCreate(BaseModel):
    type: str
    label: str
    amount: Decimal


class PayrollAdjustmentRead(ORMModel):
    id: UUID
    payroll_item_id: UUID
    type: str
    label: str
    amount: Decimal


class InvoiceItemInput(BaseModel):
    site_id: UUID | None = None
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal


class InvoiceCreate(BaseModel):
    client_id: UUID
    issue_date: date
    due_date: date
    currency: str = "TZS"
    tax_total: Decimal = Decimal("0")
    notes: str | None = None
    items: list[InvoiceItemInput]


class InvoiceRead(ORMModel):
    id: UUID
    client_id: UUID
    invoice_no: str
    issue_date: date
    due_date: date
    status: str
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal


class SendInvoiceRequest(BaseModel):
    to_email: str


class PaymentAllocationInput(BaseModel):
    invoice_id: UUID
    amount: Decimal


class PaymentCreate(BaseModel):
    client_id: UUID
    payment_date: date
    amount: Decimal
    method: str
    reference: str | None = None
    notes: str | None = None
    allocations: list[PaymentAllocationInput] = []


class PaymentRead(ORMModel):
    id: UUID
    client_id: UUID
    payment_date: date
    amount: Decimal
    method: str

