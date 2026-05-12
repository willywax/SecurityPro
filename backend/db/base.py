"""Import all models for Alembic to detect."""

# Import Base from models.base (where it's now defined)
from models.base import Base  # noqa: F401

# Import all models for Alembic to detect
from models.organization import Organization  # noqa: F401, E402
from models.auth import User, Role, RefreshToken  # noqa: F401, E402
from models.employee import (  # noqa: F401, E402
    Employee,
    EmployeeBankAccount,
    EmployeeReferee,
    EmployeeNextOfKin,
    EmployeeContract,
    EmployeeDocument,
    EmploymentHistory,
    EmploymentPeriod,
)
from models.client import Client  # noqa: F401, E402
from models.site import Site  # noqa: F401, E402
from models.inventory import (  # noqa: F401, E402
    AssetType, Store, InventoryItem,
    InventoryTransaction, InventoryIssuance, WrittenOffRegister,
)
from models.payroll import Payroll  # noqa: F401, E402
from models.zone import Zone, ZoneManager, Region, RegionTransfer  # noqa: F401, E402
from models.invoice import (  # noqa: F401, E402
    Invoice,
    InvoiceSite,
    InvoiceItem,
    Payment,
    PaymentAllocation,
)
from models.allocation import EmployeeSiteAllocation, GuardTransfer  # noqa: F401, E402
from models.user_zone_assignment import UserZoneAssignment  # noqa: F401, E402
from models.daily_log import DailyLog, DailyLogAttendance, DailyLogIncident  # noqa: F401, E402
