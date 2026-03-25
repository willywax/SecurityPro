# Employee Router - CRUD operations for HR Records module - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone, date
from uuid import UUID
import uuid
import os
import shutil
from pathlib import Path
import re

from db.dependencies import get_db
from models.employee import (
    Employee, EmployeeBankAccount, EmployeeReferee, EmployeeNextOfKin,
    EmployeeContract, EmployeeDocument, EmploymentHistory
)
from models.enums import Gender, MaritalStatus, EmploymentStatus, IDType, ContractStatus, Relationship
from utils.auth import get_token_data

router = APIRouter(prefix="/employees", tags=["Employees"])


# Ensure uploads directories exist
UPLOAD_DIR = Path("/app/backend/uploads")
PHOTOS_DIR = UPLOAD_DIR / "photos"
DOCUMENTS_DIR = UPLOAD_DIR / "documents"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


# ============ SCHEMAS ============

class EmployeeCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    middle_name: Optional[str] = None
    last_name: str = Field(..., min_length=1)
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[MaritalStatus] = None
    nationality: str = Field(..., min_length=1)  # Made required
    nin: Optional[str] = None
    phone_1: str = Field(..., min_length=1)
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    physical_address: str = Field(..., min_length=5)
    region: Optional[str] = None
    region_id: Optional[UUID] = None
    # postal_address is replaced by region_id and kept for backward compatibility
    postal_address: Optional[str] = None
    education_background: Optional[str] = None
    job_title: str = Field(..., min_length=1)
    employment_status: EmploymentStatus = EmploymentStatus.ACTIVE
    hire_date: Optional[date] = None
    date_joined: Optional[date] = None
    termination_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator('nin')
    @classmethod
    def validate_nin(cls, v):
        if v is not None and (not v.isdigit() or len(v) != 20):
            raise ValueError('NIN must be exactly 20 digits')
        return v

    @field_validator('phone_1', 'phone_2')
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            # Tanzanian phone number validation: +255XXXXXXXXX or 0XXXXXXXXX
            pattern = r'^(\+255|0)[67]\d{8}$'
            if not re.match(pattern, v):
                raise ValueError('Phone number must be a valid Tanzanian number (+255XXXXXXXXX or 0XXXXXXXXX)')
        return v

    @field_validator('nationality')
    @classmethod
    def validate_nationality(cls, v):
        # For now, just ensure it's not empty, but could add country validation later
        return v


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[MaritalStatus] = None
    nationality: Optional[str] = None
    nin: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    physical_address: Optional[str] = None
    region: Optional[str] = None
    region_id: Optional[UUID] = None
    postal_address: Optional[str] = None
    education_background: Optional[str] = None
    job_title: Optional[str] = None
    employment_status: Optional[EmploymentStatus] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    notes: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: UUID
    org_id: UUID
    employee_id: str
    guard_no: Optional[str] = None
    profile_photo: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[MaritalStatus] = None
    nationality: Optional[str] = None
    nin: Optional[str] = None
    phone_1: str
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    physical_address: str
    region: Optional[str] = None
    region_id: Optional[UUID] = None
    region_name: Optional[str] = None
    zone_name: Optional[str] = None
    postal_address: Optional[str] = None
    education_background: Optional[str] = None
    job_title: Optional[str] = None
    employment_status: EmploymentStatus
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    employees: List[EmployeeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Bank Account Schemas
class BankAccountCreate(BaseModel):
    bank_name: str
    bank_branch: Optional[str] = None
    account_name: str
    account_number: str


class BankAccountResponse(BaseModel):
    id: UUID
    employee_id: UUID
    bank_name: str
    bank_branch: Optional[str] = None
    account_name: str
    account_number: str
    created_at: datetime

    class Config:
        from_attributes = True


# Referee Schemas
class RefereeCreate(BaseModel):
    full_name: str
    referee_relationship: Relationship
    phone_number: str
    alternate_phone: Optional[str] = None
    id_type: IDType
    id_number: str
    address: str
    occupation: str
    notes: Optional[str] = None


class RefereeResponse(BaseModel):
    id: UUID
    employee_id: UUID
    full_name: str
    referee_relationship: Relationship
    phone_number: str
    alternate_phone: Optional[str] = None
    id_type: IDType
    id_number: str
    address: str
    occupation: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Next of Kin Schemas
class NextOfKinCreate(BaseModel):
    full_name: str
    kin_relationship: Relationship
    phone_1: str
    phone_2: Optional[str] = None
    address: str
    occupation: str
    id_type: IDType
    id_number: str
    notes: Optional[str] = None


class NextOfKinResponse(BaseModel):
    id: UUID
    employee_id: UUID
    full_name: str
    kin_relationship: Relationship
    phone_1: str
    phone_2: Optional[str] = None
    address: str
    occupation: Optional[str] = None
    id_type: IDType
    id_number: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Contract Schemas
class ContractCreate(BaseModel):
    contract_type: str
    start_date: date
    end_date: Optional[date] = None
    salary: float
    allowances: float = 0.0
    status: ContractStatus = ContractStatus.DRAFT
    notes: Optional[str] = None


class ContractResponse(BaseModel):
    id: UUID
    employee_id: UUID
    contract_type: str
    start_date: date
    end_date: Optional[date] = None
    salary: Optional[float] = Field(None, alias='salary_amount')
    allowances: float = 0.0
    status: ContractStatus
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# Document Schemas
class DocumentCreate(BaseModel):
    document_type: str
    document_name: str
    file_path: str
    notes: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    employee_id: UUID
    document_type: str
    document_name: str
    file_path: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Employment History Schemas
class EmploymentHistoryCreate(BaseModel):
    employer: str
    position: str
    start_date: date
    end_date: Optional[date] = None
    responsibilities: Optional[str] = None
    reason_for_leaving: Optional[str] = None


class EmploymentHistoryResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employer: Optional[str] = Field(None, alias='employer_name')
    position: Optional[str] = Field(None, alias='job_title')
    start_date: date
    end_date: Optional[date] = None
    responsibilities: Optional[str] = Field(None, alias='notes')
    reason_for_leaving: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_employee_id(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing employee ID like EMP0001"""
    result = await db.execute(
        select(Employee.employee_id)
        .where(Employee.org_id == org_id)
        .where(Employee.employee_id.like("EMP%"))
        .order_by(Employee.employee_id.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("EMP", ""))
            return f"EMP{str(num + 1).zfill(4)}"
        except ValueError:
            return "EMP0001"
    return "EMP0001"


async def generate_guard_no(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing guard number like G0001"""
    result = await db.execute(
        select(Employee.guard_no)
        .where(Employee.org_id == org_id)
        .where(Employee.guard_no.like("G%"))
        .order_by(Employee.guard_no.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("G", ""))
            return f"G{str(num + 1).zfill(4)}"
        except ValueError:
            return "G0001"
    return "G0001"


async def build_employee_response(employee: Employee, db: AsyncSession) -> dict:
    """Enrich an employee with region and zone labels for API responses."""
    from models.zone import Region, Zone

    emp_dict = {c.key: getattr(employee, c.key) for c in employee.__table__.columns}
    emp_dict["region_name"] = None
    emp_dict["zone_name"] = None

    if employee.region_id:
        region_result = await db.execute(select(Region).where(Region.id == employee.region_id))
        region = region_result.scalar_one_or_none()
        if region:
            emp_dict["region_name"] = region.region_name
            zone_result = await db.execute(select(Zone).where(Zone.id == region.zone_id))
            zone = zone_result.scalar_one_or_none()
            emp_dict["zone_name"] = zone.zone_name if zone else None

    return emp_dict


# ============ EMPLOYEE CRUD ENDPOINTS ============

@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a new employee"""
    from models.zone import Region

    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Generate employee ID and guard number
    employee_id = await generate_employee_id(db, org_id)
    guard_no = await generate_guard_no(db, org_id)

    # Map old inputs into the new hire_date semantics (date_joined is now used for join date)
    payload = employee.model_dump()

    if payload.get('date_joined'):
        payload['hire_date'] = payload['date_joined']
    payload.pop('date_joined', None)

    if payload.get('termination_date') and not payload.get('hire_date'):
        # legacy behavior: interpret termination_date as join date when used this way
        payload['hire_date'] = payload['termination_date']
        payload['termination_date'] = None

    payload.pop('date_left', None)

    if payload.get("region_id"):
        region_result = await db.execute(
            select(Region.id).where(Region.id == payload["region_id"], Region.org_id == org_id)
        )
        if not region_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Region not found")

    # Create employee
    new_employee = Employee(
        org_id=org_id,
        employee_id=employee_id,
        guard_no=guard_no,
        created_by=user_id,
        **payload
    )

    db.add(new_employee)
    await db.commit()
    await db.refresh(new_employee)

    return await build_employee_response(new_employee, db)


@router.get("", response_model=EmployeeListResponse)
async def get_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[EmploymentStatus] = None,
    region_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all employees with pagination and filters"""
    org_id = UUID(token_data.get("org_id"))

    # Base query
    query = select(Employee).where(Employee.org_id == org_id)

    # Apply filters
    if search:
        query = query.where(
            or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.employee_id.ilike(f"%{search}%"),
                Employee.guard_no.ilike(f"%{search}%"),
                Employee.phone_1.ilike(f"%{search}%")
            )
        )
    if status_filter:
        query = query.where(Employee.employment_status == status_filter)
    if region_id:
        query = query.where(Employee.region_id == region_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Employee.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    employees = result.scalars().all()

    # Enrich with region/zone names
    enriched = []
    for emp in employees:
        enriched.append(await build_employee_response(emp, db))

    return EmployeeListResponse(
        employees=enriched,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get a single employee by ID"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return await build_employee_response(employee, db)


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    employee_update: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Update fields
    update_data = employee_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    await db.commit()
    await db.refresh(employee)

    return await build_employee_response(employee, db)


@router.delete("/{employee_id}", response_model=MessageResponse)
async def delete_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    await db.delete(employee)
    await db.commit()

    return MessageResponse(message="Employee deleted successfully")


# ============ BANK ACCOUNT ENDPOINTS ============

@router.post("/{employee_id}/bank-accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def add_bank_account(
    employee_id: UUID,
    bank_account: BankAccountCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Add a bank account to an employee"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create bank account
    new_account = EmployeeBankAccount(
        org_id=org_id,
        employee_id=employee_id,
        created_by=user_id,
        **bank_account.model_dump()
    )

    db.add(new_account)
    await db.commit()
    await db.refresh(new_account)

    return new_account


@router.get("/{employee_id}/bank-accounts", response_model=List[BankAccountResponse])
async def get_bank_accounts(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all bank accounts for an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeBankAccount)
        .where(EmployeeBankAccount.employee_id == employee_id, EmployeeBankAccount.org_id == org_id)
        .order_by(EmployeeBankAccount.created_at.desc())
    )
    accounts = result.scalars().all()

    return accounts


@router.delete("/{employee_id}/bank-accounts/{account_id}", response_model=MessageResponse)
async def delete_bank_account(
    employee_id: UUID,
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a bank account"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeBankAccount).where(
            EmployeeBankAccount.id == account_id,
            EmployeeBankAccount.employee_id == employee_id,
            EmployeeBankAccount.org_id == org_id
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    await db.delete(account)
    await db.commit()

    return MessageResponse(message="Bank account deleted successfully")


# ============ REFEREE ENDPOINTS ============

@router.post("/{employee_id}/referees", response_model=RefereeResponse, status_code=status.HTTP_201_CREATED)
async def add_referee(
    employee_id: UUID,
    referee: RefereeCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Add a referee to an employee"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create referee
    new_referee = EmployeeReferee(
        org_id=org_id,
        employee_id=employee_id,
        created_by=user_id,
        **referee.model_dump()
    )

    db.add(new_referee)
    await db.commit()
    await db.refresh(new_referee)

    return new_referee


@router.get("/{employee_id}/referees", response_model=List[RefereeResponse])
async def get_referees(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all referees for an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeReferee)
        .where(EmployeeReferee.employee_id == employee_id, EmployeeReferee.org_id == org_id)
        .order_by(EmployeeReferee.created_at.desc())
    )
    referees = result.scalars().all()

    return referees


@router.delete("/{employee_id}/referees/{referee_id}", response_model=MessageResponse)
async def delete_referee(
    employee_id: UUID,
    referee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a referee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeReferee).where(
            EmployeeReferee.id == referee_id,
            EmployeeReferee.employee_id == employee_id,
            EmployeeReferee.org_id == org_id
        )
    )
    referee = result.scalar_one_or_none()

    if not referee:
        raise HTTPException(status_code=404, detail="Referee not found")

    await db.delete(referee)
    await db.commit()

    return MessageResponse(message="Referee deleted successfully")


# ============ NEXT OF KIN ENDPOINTS ============

@router.post("/{employee_id}/next-of-kin", response_model=NextOfKinResponse, status_code=status.HTTP_201_CREATED)
async def add_next_of_kin(
    employee_id: UUID,
    next_of_kin: NextOfKinCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Add next of kin to an employee"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create next of kin
    new_kin = EmployeeNextOfKin(
        org_id=org_id,
        employee_id=employee_id,
        created_by=user_id,
        **next_of_kin.model_dump()
    )

    db.add(new_kin)
    await db.commit()
    await db.refresh(new_kin)

    return new_kin


@router.get("/{employee_id}/next-of-kin", response_model=List[NextOfKinResponse])
async def get_next_of_kin(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all next of kin for an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeNextOfKin)
        .where(EmployeeNextOfKin.employee_id == employee_id, EmployeeNextOfKin.org_id == org_id)
        .order_by(EmployeeNextOfKin.created_at.desc())
    )
    next_of_kin = result.scalars().all()

    return next_of_kin


@router.delete("/{employee_id}/next-of-kin/{kin_id}", response_model=MessageResponse)
async def delete_next_of_kin(
    employee_id: UUID,
    kin_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete next of kin"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeNextOfKin).where(
            EmployeeNextOfKin.id == kin_id,
            EmployeeNextOfKin.employee_id == employee_id,
            EmployeeNextOfKin.org_id == org_id
        )
    )
    kin = result.scalar_one_or_none()

    if not kin:
        raise HTTPException(status_code=404, detail="Next of kin not found")

    await db.delete(kin)
    await db.commit()

    return MessageResponse(message="Next of kin deleted successfully")


# ============ CONTRACT ENDPOINTS ============

@router.post("/{employee_id}/contracts", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def add_contract(
    employee_id: UUID,
    contract: ContractCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Add a contract to an employee"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate contract number
    count_result = await db.execute(
        select(func.count()).select_from(EmployeeContract).where(EmployeeContract.org_id == org_id)
    )
    count = (count_result.scalar_one() or 0) + 1

    # Create contract (map schema fields to model columns)
    new_contract = EmployeeContract(
        org_id=org_id,
        employee_id=employee_id,
        created_by=user_id,
        contract_number=f"CON{count:04d}",
        contract_type=contract.contract_type,
        start_date=contract.start_date,
        end_date=contract.end_date,
        salary_amount=contract.salary,
        status=contract.status,
    )

    db.add(new_contract)
    await db.commit()
    await db.refresh(new_contract)

    return new_contract


@router.get("/{employee_id}/contracts", response_model=List[ContractResponse])
async def get_contracts(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all contracts for an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeContract)
        .where(EmployeeContract.employee_id == employee_id, EmployeeContract.org_id == org_id)
        .order_by(EmployeeContract.start_date.desc())
    )
    contracts = result.scalars().all()

    return contracts


@router.put("/{employee_id}/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(
    employee_id: UUID,
    contract_id: UUID,
    contract_update: ContractCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update a contract"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.id == contract_id,
            EmployeeContract.employee_id == employee_id,
            EmployeeContract.org_id == org_id
        )
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Update fields (map schema names to model column names)
    contract.contract_type = contract_update.contract_type
    contract.start_date = contract_update.start_date
    contract.end_date = contract_update.end_date
    contract.salary_amount = contract_update.salary
    contract.status = contract_update.status

    await db.commit()
    await db.refresh(contract)

    return contract


@router.delete("/{employee_id}/contracts/{contract_id}", response_model=MessageResponse)
async def delete_contract(
    employee_id: UUID,
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a contract"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.id == contract_id,
            EmployeeContract.employee_id == employee_id,
            EmployeeContract.org_id == org_id
        )
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    await db.delete(contract)
    await db.commit()

    return MessageResponse(message="Contract deleted successfully")


# ============ DOCUMENT ENDPOINTS ============

@router.post("/{employee_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def add_document(
    employee_id: UUID,
    document: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Add a document to an employee"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create document
    new_document = EmployeeDocument(
        org_id=org_id,
        employee_id=employee_id,
        created_by=user_id,
        **document.model_dump()
    )

    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)

    return new_document


@router.get("/{employee_id}/documents", response_model=List[DocumentResponse])
async def get_documents(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all documents for an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeDocument)
        .where(EmployeeDocument.employee_id == employee_id, EmployeeDocument.org_id == org_id)
        .order_by(EmployeeDocument.created_at.desc())
    )
    documents = result.scalars().all()

    return documents


@router.delete("/{employee_id}/documents/{document_id}", response_model=MessageResponse)
async def delete_document(
    employee_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a document"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeDocument).where(
            EmployeeDocument.id == document_id,
            EmployeeDocument.employee_id == employee_id,
            EmployeeDocument.org_id == org_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete physical file if exists
    if document.file_path and os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except Exception:
            pass  # Continue even if file deletion fails

    await db.delete(document)
    await db.commit()

    return MessageResponse(message="Document deleted successfully")


# ============ EMPLOYMENT HISTORY ENDPOINTS ============

@router.post("/{employee_id}/employment-history", response_model=EmploymentHistoryResponse, status_code=status.HTTP_201_CREATED)
async def add_employment_history(
    employee_id: UUID,
    history: EmploymentHistoryCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Add employment history to an employee"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create employment history (map schema fields to model columns)
    new_history = EmploymentHistory(
        org_id=org_id,
        employee_id=employee_id,
        created_by=user_id,
        employer_name=history.employer,
        job_title=history.position,
        start_date=history.start_date,
        end_date=history.end_date,
        notes=history.responsibilities,
        reason_for_leaving=history.reason_for_leaving,
    )

    db.add(new_history)
    await db.commit()
    await db.refresh(new_history)

    return new_history


@router.get("/{employee_id}/employment-history", response_model=List[EmploymentHistoryResponse])
async def get_employment_history(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all employment history for an employee"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmploymentHistory)
        .where(EmploymentHistory.employee_id == employee_id, EmploymentHistory.org_id == org_id)
        .order_by(EmploymentHistory.start_date.desc())
    )
    history = result.scalars().all()

    return history


@router.delete("/{employee_id}/employment-history/{history_id}", response_model=MessageResponse)
async def delete_employment_history(
    employee_id: UUID,
    history_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete employment history"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmploymentHistory).where(
            EmploymentHistory.id == history_id,
            EmploymentHistory.employee_id == employee_id,
            EmploymentHistory.org_id == org_id
        )
    )
    history = result.scalar_one_or_none()

    if not history:
        raise HTTPException(status_code=404, detail="Employment history not found")

    await db.delete(history)
    await db.commit()

    return MessageResponse(message="Employment history deleted successfully")


# ============ FILE UPLOAD ENDPOINTS ============

@router.post("/{employee_id}/upload-photo", response_model=EmployeeResponse)
async def upload_photo(
    employee_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Upload employee profile photo"""
    org_id = UUID(token_data.get("org_id"))

    # Verify employee exists
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are allowed")

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{employee_id}_{uuid.uuid4()}.{file_extension}"
    file_path = PHOTOS_DIR / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

    # Delete old photo if exists
    if employee.profile_photo and os.path.exists(employee.profile_photo):
        try:
            os.remove(employee.profile_photo)
        except Exception:
            pass  # Continue even if old file deletion fails

    # Update employee
    employee.profile_photo = str(file_path)
    await db.commit()
    await db.refresh(employee)

    return await build_employee_response(employee, db)


@router.post("/{employee_id}/upload-document", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    employee_id: UUID,
    document_type: str = Query(...),
    document_name: str = Query(...),
    notes: Optional[str] = Query(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Upload employee document"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    unique_filename = f"{employee_id}_{uuid.uuid4()}.{file_extension}"
    file_path = DOCUMENTS_DIR / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

    # Create document record
    new_document = EmployeeDocument(
        org_id=org_id,
        employee_id=employee_id,
        document_type=document_type,
        document_name=document_name,
        file_path=str(file_path),
        notes=notes,
        created_by=user_id
    )

    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)

    return new_document
