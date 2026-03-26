"""Enum types for SQLAlchemy models."""
import enum


# ============ Auth & User Enums ============

class UserRole(str, enum.Enum):
    """User role types for access control."""
    ADMIN = "admin"
    DIRECTOR = "director"
    HR = "hr"
    ZONE_MANAGER = "zone_manager"
    MANAGER = "manager"
    SUPERVISOR = "supervisor"
    GUARD = "guard"
    VIEWER = "viewer"


# ============ Employee Enums ============

class Gender(str, enum.Enum):
    """Gender types."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class MaritalStatus(str, enum.Enum):
    """Marital status types."""
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"


class EmploymentStatus(str, enum.Enum):
    """Employee employment status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"
    ON_LEAVE = "on_leave"


class IDType(str, enum.Enum):
    """Identification document types."""
    NATIONAL_ID = "national_id"
    VOTER_ID = "voter_id"
    DRIVING_LICENSE = "driving_license"
    PASSPORT = "passport"
    OTHER = "other"


class Relationship(str, enum.Enum):
    """Relationship types for referees and next of kin."""
    FATHER = "father"
    MOTHER = "mother"
    BROTHER = "brother"
    SISTER = "sister"
    SPOUSE = "spouse"
    SON = "son"
    DAUGHTER = "daughter"
    UNCLE = "uncle"
    AUNT = "aunt"
    COUSIN = "cousin"
    FRIEND = "friend"
    COLLEAGUE = "colleague"
    NEIGHBOR = "neighbor"
    OTHER = "other"


class ContractType(str, enum.Enum):
    """Employment contract types."""
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    TEMPORARY = "temporary"
    PERMANENT = "permanent"
    FIXED_TERM = "fixed_term"
    CASUAL = "casual"
    PROBATION = "probation"


class ContractStatus(str, enum.Enum):
    """Contract status types."""
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    MUTUAL_TERMINATION = "mutual_termination"


# ============ Zone & Region Enums ============

class ZoneStatus(str, enum.Enum):
    """Zone status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"


class RegionStatus(str, enum.Enum):
    """Region status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"


# ============ Client & Site Enums ============

class ClientStatus(str, enum.Enum):
    """Client status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"


class SiteStatus(str, enum.Enum):
    """Site status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"


# ============ Asset Enums ============

class AssetType(str, enum.Enum):
    """Asset/equipment types."""
    GUN = "gun"
    UNIFORM = "uniform"
    RADIO = "radio"
    BATON = "baton"
    HANDCUFF = "handcuff"
    TORCH = "torch"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    """Asset status types."""
    AVAILABLE = "available"
    ISSUED = "issued"
    LOST = "lost"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class AssetCondition(str, enum.Enum):
    """Asset condition types."""
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


# ============ Financial Enums ============

class PayrollStatus(str, enum.Enum):
    """Payroll status types."""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


class InvoiceStatus(str, enum.Enum):
    """Invoice status types."""
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class ItemType(str, enum.Enum):
    """Invoice item types."""
    GUARD = "guard"
    ASSET = "asset"


class PaymentStatus(str, enum.Enum):
    """Payment status types."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
