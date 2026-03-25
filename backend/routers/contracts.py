# Contracts Router - Full contract lifecycle management

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from dateutil.relativedelta import relativedelta

from db.dependencies import get_db
from models.employee import Employee, EmployeeContract
from models.enums import ContractStatus, EmploymentStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/contracts", tags=["Contracts"])


# ============ SCHEMAS ============

class ContractCreate(BaseModel):
    employee_id: UUID
    start_date: date
    duration_months: int                      # 3 or 6 only
    salary_amount: float
    job_title_on_contract: Optional[str] = None
    workstation_site: Optional[str] = None
    probation_months: Optional[int] = None
    signed_date: Optional[date] = None
    employee_signed: bool = False
    employer_signed: bool = False
    notes: Optional[str] = None

    @field_validator("duration_months")
    @classmethod
    def validate_duration(cls, v):
        if v not in (3, 6):
            raise ValueError("duration_months must be 3 or 6")
        return v


class ContractPatch(BaseModel):
    salary_amount: Optional[float] = None
    notes: Optional[str] = None


class TerminateRequest(BaseModel):
    termination_type: str            # "terminated" or "mutual_termination"
    termination_reason: str
    termination_date: Optional[date] = None

    @field_validator("termination_type")
    @classmethod
    def validate_type(cls, v):
        if v not in ("terminated", "mutual_termination"):
            raise ValueError('termination_type must be "terminated" or "mutual_termination"')
        return v

    @field_validator("termination_reason")
    @classmethod
    def validate_reason(cls, v):
        if len(v.strip()) < 20:
            raise ValueError("termination_reason must be at least 20 characters")
        return v.strip()


class RenewRequest(BaseModel):
    start_date: date
    duration_months: int
    salary_amount: float
    job_title_on_contract: Optional[str] = None
    workstation_site: Optional[str] = None
    probation_months: Optional[int] = None
    signed_date: Optional[date] = None
    employee_signed: bool = False
    employer_signed: bool = False
    notes: Optional[str] = None

    @field_validator("duration_months")
    @classmethod
    def validate_duration(cls, v):
        if v not in (3, 6):
            raise ValueError("duration_months must be 3 or 6")
        return v


class ContractResponse(BaseModel):
    id: UUID
    org_id: UUID
    employee_id: UUID
    contract_number: str
    start_date: date
    end_date: Optional[date] = None
    duration_months: Optional[int] = None
    salary_amount: Optional[float] = None
    job_title_on_contract: Optional[str] = None
    workstation_site: Optional[str] = None
    probation_months: Optional[int] = None
    signed_date: Optional[date] = None
    employee_signed: bool = False
    employer_signed: bool = False
    notes: Optional[str] = None
    status: ContractStatus
    termination_reason: Optional[str] = None
    termination_date: Optional[date] = None
    terminated_by: Optional[UUID] = None
    auto_expired: bool = False
    superseded_by: Optional[UUID] = None
    created_at: datetime
    # Optional warning (not stored in DB, only returned on create)
    warning: Optional[str] = Field(None, exclude=False)

    class Config:
        from_attributes = True


class ExpiryCheckResponse(BaseModel):
    expired_count: int
    contracts: List[str]


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_contract_number(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing contract ID like CON0001."""
    result = await db.execute(
        select(EmployeeContract.contract_number)
        .where(EmployeeContract.org_id == org_id)
        .where(EmployeeContract.contract_number.like("CON%"))
        .order_by(EmployeeContract.contract_number.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()
    if last_id:
        try:
            num = int(last_id.replace("CON", ""))
            return f"CON{str(num + 1).zfill(4)}"
        except ValueError:
            pass
    return "CON0001"


async def get_active_contract(db: AsyncSession, employee_id: UUID, org_id: UUID) -> Optional[EmployeeContract]:
    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.employee_id == employee_id,
            EmployeeContract.org_id == org_id,
            EmployeeContract.status == ContractStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none()


# ============ ENDPOINTS ============

@router.post("/run-expiry-check", response_model=ExpiryCheckResponse)
async def run_expiry_check(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Find all active contracts past end_date and auto-expire them."""
    org_id = UUID(token_data.get("org_id"))
    today = date.today()

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.org_id == org_id,
            EmployeeContract.status == ContractStatus.ACTIVE,
            EmployeeContract.end_date < today,
        )
    )
    contracts = result.scalars().all()

    expired_numbers = []
    for contract in contracts:
        contract.status = ContractStatus.EXPIRED
        contract.auto_expired = True

        # Set employee inactive
        emp_result = await db.execute(
            select(Employee).where(Employee.id == contract.employee_id)
        )
        employee = emp_result.scalar_one_or_none()
        if employee:
            employee.employment_status = EmploymentStatus.INACTIVE

        expired_numbers.append(contract.contract_number)

    await db.commit()
    return ExpiryCheckResponse(expired_count=len(expired_numbers), contracts=expired_numbers)


@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    data: ContractCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Create a new contract. Always activates immediately. Auto-expires any existing active contract."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == data.employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check for existing active contract
    old_active = await get_active_contract(db, data.employee_id, org_id)

    # Generate contract number
    contract_number = await generate_contract_number(db, org_id)

    # Auto-calculate end_date
    end_date = data.start_date + relativedelta(months=data.duration_months)

    # Create new contract
    new_contract = EmployeeContract(
        org_id=org_id,
        employee_id=data.employee_id,
        contract_number=contract_number,
        contract_type=None,
        start_date=data.start_date,
        end_date=end_date,
        duration_months=data.duration_months,
        salary_amount=data.salary_amount,
        job_title_on_contract=data.job_title_on_contract,
        workstation_site=data.workstation_site,
        probation_months=data.probation_months,
        signed_date=data.signed_date,
        employee_signed=data.employee_signed,
        employer_signed=data.employer_signed,
        notes=data.notes,
        status=ContractStatus.ACTIVE,
        created_by=user_id,
    )
    db.add(new_contract)
    await db.flush()  # get new_contract.id before committing

    warning = None
    if old_active:
        old_active.status = ContractStatus.EXPIRED
        old_active.auto_expired = True
        old_active.termination_reason = f"Superseded by new contract {contract_number}"
        old_active.superseded_by = new_contract.id
        warning = (
            f"Previous contract {old_active.contract_number} "
            f"(ending {old_active.end_date}) was automatically expired."
        )

    # Sync employee status
    employee.employment_status = EmploymentStatus.ACTIVE

    await db.commit()
    await db.refresh(new_contract)

    response = ContractResponse.model_validate(new_contract)
    response.warning = warning
    return response


@router.patch("/{contract_id}", response_model=ContractResponse)
async def patch_contract(
    contract_id: UUID,
    data: ContractPatch,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Update an active contract. Only salary_amount and notes may be changed."""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.id == contract_id,
            EmployeeContract.org_id == org_id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != ContractStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Only active contracts can be edited. Expired/terminated contracts are read-only.",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)

    await db.commit()
    await db.refresh(contract)
    return ContractResponse.model_validate(contract)


@router.post("/{contract_id}/terminate", response_model=ContractResponse)
async def terminate_contract(
    contract_id: UUID,
    data: TerminateRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Terminate an active contract (employer or mutual termination)."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.id == contract_id,
            EmployeeContract.org_id == org_id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != ContractStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot terminate a contract with status '{contract.status.value}'. Only active contracts can be terminated.",
        )

    # Set termination fields
    if data.termination_type == "terminated":
        contract.status = ContractStatus.TERMINATED
    else:
        contract.status = ContractStatus.MUTUAL_TERMINATION

    contract.termination_reason = data.termination_reason
    contract.termination_date = data.termination_date or date.today()
    contract.terminated_by = user_id

    # Sync employee status
    emp_result = await db.execute(
        select(Employee).where(Employee.id == contract.employee_id)
    )
    employee = emp_result.scalar_one_or_none()
    if employee:
        employee.employment_status = EmploymentStatus.TERMINATED

    await db.commit()
    await db.refresh(contract)
    return ContractResponse.model_validate(contract)


@router.post("/{contract_id}/renew", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def renew_contract(
    contract_id: UUID,
    data: RenewRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Renew a non-active contract. Creates a new contract (does not edit the old one)."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.id == contract_id,
            EmployeeContract.org_id == org_id,
        )
    )
    old_contract = result.scalar_one_or_none()
    if not old_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if old_contract.status == ContractStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Cannot renew an active contract. Use edit to update salary or notes.",
        )

    # Verify employee
    emp_result = await db.execute(
        select(Employee).where(Employee.id == old_contract.employee_id)
    )
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if there is already another active contract (e.g. someone already renewed)
    current_active = await get_active_contract(db, old_contract.employee_id, org_id)

    # Generate contract number
    contract_number = await generate_contract_number(db, org_id)

    # Auto-calculate end_date
    end_date = data.start_date + relativedelta(months=data.duration_months)

    # Create new contract
    new_contract = EmployeeContract(
        org_id=org_id,
        employee_id=old_contract.employee_id,
        contract_number=contract_number,
        contract_type=None,
        start_date=data.start_date,
        end_date=end_date,
        duration_months=data.duration_months,
        salary_amount=data.salary_amount,
        job_title_on_contract=data.job_title_on_contract,
        workstation_site=data.workstation_site,
        probation_months=data.probation_months,
        signed_date=data.signed_date,
        employee_signed=data.employee_signed,
        employer_signed=data.employer_signed,
        notes=data.notes,
        status=ContractStatus.ACTIVE,
        created_by=user_id,
    )
    db.add(new_contract)
    await db.flush()

    # Auto-expire any currently active contract (shouldn't normally exist for a renewal path)
    if current_active:
        current_active.status = ContractStatus.EXPIRED
        current_active.auto_expired = True
        current_active.termination_reason = f"Superseded by renewal contract {contract_number}"
        current_active.superseded_by = new_contract.id

    # Sync employee status
    employee.employment_status = EmploymentStatus.ACTIVE

    await db.commit()
    await db.refresh(new_contract)
    return ContractResponse.model_validate(new_contract)
