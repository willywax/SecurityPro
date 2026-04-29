# Lakezone Operation System - MongoDB Models
# All models include org_id for multi-tenant support

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


def generate_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ============ ENUMS ============

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SUPERVISOR = "supervisor"
    GUARD = "guard"
    VIEWER = "viewer"


class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"
    ON_LEAVE = "on_leave"


class ContractType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    TEMPORARY = "temporary"


class PayrollStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class AssetStatus(str, Enum):
    AVAILABLE = "available"
    ISSUED = "issued"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


# ============ BASE MODELS ============

class BaseDocument(BaseModel):
    """Base model with common fields for all documents"""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=generate_id)
    org_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    created_by: Optional[str] = None


# ============ ORGANIZATION ============

class Organization(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    name: str
    slug: str
    logo_url: Optional[str] = None
    accent_color: str = "#3B82F6"
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class OrganizationCreate(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    accent_color: str = "#3B82F6"


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: Optional[str]
    accent_color: str


# ============ USER ============

class User(BaseDocument):
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.VIEWER
    is_active: bool = True
    last_login: Optional[datetime] = None
    employee_id: Optional[str] = None  # Link to employee if applicable


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.VIEWER
    org_id: str


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: UserRole
    org_id: str
    is_active: bool
    last_login: Optional[datetime]
    organization: Optional[OrganizationResponse] = None


# ============ ROLE/PERMISSION ============

class Role(BaseDocument):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    is_system: bool = False


# ============ EMPLOYEE ============

class Employee(BaseDocument):
    employee_number: str
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    national_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    hire_date: Optional[datetime] = None
    termination_date: Optional[datetime] = None
    status: EmploymentStatus = EmploymentStatus.ACTIVE
    hourly_rate: Optional[float] = None
    monthly_salary: Optional[float] = None
    user_id: Optional[str] = None  # Link to user account if has login


class EmployeeCreate(BaseModel):
    employee_number: str
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    org_id: str


# ============ EMPLOYEE BANK ACCOUNT ============

class EmployeeBankAccount(BaseDocument):
    employee_id: str
    bank_name: str
    account_name: str
    account_number: str
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    is_primary: bool = True


# ============ EMPLOYEE REFEREE ============

class EmployeeReferee(BaseDocument):
    employee_id: str
    name: str
    relationship: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    position: Optional[str] = None


# ============ EMPLOYEE NEXT OF KIN ============

class EmployeeNextOfKin(BaseDocument):
    employee_id: str
    name: str
    relationship: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


# ============ EMPLOYEE CONTRACT ============

class EmployeeContract(BaseDocument):
    employee_id: str
    contract_type: ContractType
    start_date: datetime
    end_date: Optional[datetime] = None
    hourly_rate: Optional[float] = None
    monthly_salary: Optional[float] = None
    terms: Optional[str] = None
    is_active: bool = True


# ============ EMPLOYEE DOCUMENT ============

class EmployeeDocument(BaseDocument):
    employee_id: str
    document_type: str  # e.g., "id_card", "certificate", "license"
    name: str
    file_url: str
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


# ============ CLIENT ============

class Client(BaseDocument):
    name: str
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    billing_address: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: bool = True


class ClientCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    org_id: str


# ============ SITE ============

class Site(BaseDocument):
    client_id: str
    name: str
    address: str
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


# ============ ASSET ============

class Asset(BaseDocument):
    name: str
    asset_type: str  # e.g., "uniform", "radio", "vehicle", "weapon"
    serial_number: Optional[str] = None
    description: Optional[str] = None
    status: AssetStatus = AssetStatus.AVAILABLE
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    notes: Optional[str] = None


# ============ ASSET ISSUANCE ============

class AssetIssuance(BaseDocument):
    asset_id: str
    employee_id: str
    issued_date: datetime
    return_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    condition_on_issue: Optional[str] = None
    condition_on_return: Optional[str] = None
    notes: Optional[str] = None


# ============ PAYROLL ============

class Payroll(BaseDocument):
    period_start: datetime
    period_end: datetime
    status: PayrollStatus = PayrollStatus.DRAFT
    total_gross: float = 0.0
    total_deductions: float = 0.0
    total_net: float = 0.0
    processed_date: Optional[datetime] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None


# ============ PAYROLL ITEM ============

class PayrollItem(BaseDocument):
    payroll_id: str
    employee_id: str
    hours_worked: float = 0.0
    hourly_rate: float = 0.0
    gross_amount: float = 0.0
    deductions: float = 0.0
    net_amount: float = 0.0
    overtime_hours: float = 0.0
    overtime_rate: float = 0.0
    bonuses: float = 0.0
    notes: Optional[str] = None


# ============ INVOICE ============

class Invoice(BaseDocument):
    client_id: str
    invoice_number: str
    issue_date: datetime
    due_date: datetime
    status: InvoiceStatus = InvoiceStatus.DRAFT
    subtotal: float = 0.0
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0
    amount_paid: float = 0.0
    notes: Optional[str] = None


# ============ INVOICE ITEM ============

class InvoiceItem(BaseDocument):
    invoice_id: str
    site_id: Optional[str] = None
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    total: float = 0.0


# ============ PAYMENT ============

class Payment(BaseDocument):
    client_id: str
    amount: float
    payment_date: datetime
    payment_method: str  # e.g., "bank_transfer", "check", "cash", "card"
    reference_number: Optional[str] = None
    status: PaymentStatus = PaymentStatus.COMPLETED
    notes: Optional[str] = None


# ============ PAYMENT ALLOCATION ============

class PaymentAllocation(BaseDocument):
    payment_id: str
    invoice_id: str
    amount: float


# ============ REFRESH TOKEN ============

class RefreshToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_id)
    user_id: str
    org_id: str
    token: str
    expires_at: datetime
    is_revoked: bool = False
    created_at: datetime = Field(default_factory=utc_now)
