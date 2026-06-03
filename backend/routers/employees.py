# Employee Router - CRUD operations for HR Records module - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from fastapi.responses import RedirectResponse
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
    EmployeeContract, EmployeeDocument, EmploymentHistory, EmploymentPeriod
)
from models.enums import Gender, MaritalStatus, EmploymentStatus, IDType, ContractStatus, Relationship, DepartureReason, AvailabilityStatus
from models.inventory import InventoryIssuance, InventoryItem, AssetType
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
    photo_path: Optional[str] = None
    photo_url: Optional[str] = None
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
    total_employment_periods: int = 1
    original_hire_date: Optional[date] = None
    current_period_id: Optional[UUID] = None
    current_site_id: Optional[UUID] = None
    current_site_name: Optional[str] = None
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
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
    contract_number: Optional[str] = None
    contract_type: Optional[str] = None
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


class EmployeeIssuedAssetResponse(BaseModel):
    id: UUID
    item_id: UUID
    item_name: Optional[str] = None
    asset_type_name: Optional[str] = None
    quantity_issued: int
    quantity_returned: int
    outstanding_quantity: int
    issue_date: date
    expected_return_date: Optional[date] = None
    actual_return_date: Optional[date] = None
    issue_condition: str
    return_condition: Optional[str] = None
    status: str
    notes: Optional[str] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True


class EmploymentPeriodResponse(BaseModel):
    id: UUID
    employee_id: UUID
    period_number: int
    start_date: date
    end_date: Optional[date] = None
    departure_reason: Optional[DepartureReason] = None
    departure_notes: Optional[str] = None
    rehire_date: Optional[date] = None
    rehired_by: Optional[UUID] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class OffboardRequest(BaseModel):
    departure_reason: DepartureReason
    last_working_date: date
    departure_notes: Optional[str] = None
    end_active_contract: bool = True


class RehireRequest(BaseModel):
    rehire_date: date
    notes: Optional[str] = None


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
    responses = await build_employee_responses([employee], db)
    return responses[0]


async def build_employee_responses(employees: list[Employee], db: AsyncSession) -> list[dict]:
    """Enrich employees with region, zone, and current site labels using batched lookups."""
    from models.zone import Region, Zone
    from models.site import Site

    region_ids = {employee.region_id for employee in employees if employee.region_id}
    site_ids = {employee.current_site_id for employee in employees if employee.current_site_id}
    regions_by_id = {}
    zones_by_id = {}
    sites_by_id = {}

    if region_ids:
        regions_result = await db.execute(select(Region).where(Region.id.in_(region_ids)))
        regions = regions_result.scalars().all()
        regions_by_id = {region.id: region for region in regions}

        zone_ids = {region.zone_id for region in regions if region.zone_id}
        if zone_ids:
            zones_result = await db.execute(select(Zone).where(Zone.id.in_(zone_ids)))
            zones_by_id = {zone.id: zone for zone in zones_result.scalars().all()}

    if site_ids:
        sites_result = await db.execute(select(Site).where(Site.id.in_(site_ids)))
        sites_by_id = {site.id: site for site in sites_result.scalars().all()}

    responses = []
    for employee in employees:
        responses.append(build_employee_response_from_maps(employee, regions_by_id, zones_by_id, sites_by_id))
    return responses


def build_employee_response_from_maps(employee: Employee, regions_by_id: dict, zones_by_id: dict, sites_by_id: dict = None) -> dict:
    """Build an employee response from already-loaded region, zone, and site maps."""
    emp_dict = {c.key: getattr(employee, c.key) for c in employee.__table__.columns}
    emp_dict["region_name"] = None
    emp_dict["zone_name"] = None
    emp_dict["current_site_name"] = None
    emp_dict["photo_url"] = None
    emp_dict["profile_photo"] = normalize_local_upload_url(employee.profile_photo)

    if employee.photo_path:
        try:
            from services.storage_service import storage_service
            emp_dict["photo_url"] = storage_service.get_view_url(employee.photo_path, expiry_minutes=60)
        except Exception:
            emp_dict["photo_url"] = f"/api/employees/{employee.id}/photo/view"
    elif emp_dict["profile_photo"]:
        emp_dict["photo_url"] = emp_dict["profile_photo"]

    region = regions_by_id.get(employee.region_id)
    if region:
        emp_dict["region_name"] = region.region_name
        zone = zones_by_id.get(region.zone_id)
        emp_dict["zone_name"] = zone.zone_name if zone else None

    if sites_by_id and employee.current_site_id:
        site = sites_by_id.get(employee.current_site_id)
        emp_dict["current_site_name"] = site.site_name if site else None

    return emp_dict


def normalize_local_upload_url(file_path: Optional[str]) -> Optional[str]:
    """Convert stored local upload paths into URLs served by StaticFiles."""
    if not file_path:
        return None
    if file_path.startswith(("http://", "https://", "/uploads/")):
        return file_path

    try:
        path = Path(file_path)
        relative_path = path.resolve().relative_to(UPLOAD_DIR.resolve())
        return f"/uploads/{relative_path.as_posix()}"
    except Exception:
        filename = Path(file_path).name
        return f"/uploads/photos/{filename}" if filename else None


async def build_employee_issued_asset_response(issuance: InventoryIssuance, db: AsyncSession) -> dict:
    item = (await db.execute(select(InventoryItem).where(InventoryItem.id == issuance.item_id))).scalar_one_or_none()
    asset_type_name = None
    item_name = None
    if item:
        item_name = item.item_name
        asset_type = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
        asset_type_name = asset_type.type_name if asset_type else None

    outstanding_quantity = max(0, issuance.quantity_issued - issuance.quantity_returned)
    is_overdue = bool(
        issuance.expected_return_date
        and issuance.status in ("active", "partially_returned")
        and issuance.expected_return_date < date.today()
    )

    return {
        "id": issuance.id,
        "item_id": issuance.item_id,
        "item_name": item_name,
        "asset_type_name": asset_type_name,
        "quantity_issued": issuance.quantity_issued,
        "quantity_returned": issuance.quantity_returned,
        "outstanding_quantity": outstanding_quantity,
        "issue_date": issuance.issue_date,
        "expected_return_date": issuance.expected_return_date,
        "actual_return_date": issuance.actual_return_date,
        "issue_condition": issuance.issue_condition,
        "return_condition": issuance.return_condition,
        "status": issuance.status,
        "notes": issuance.notes,
        "is_overdue": is_overdue,
    }


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
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    status_filter: Optional[EmploymentStatus] = None,
    status_in: Optional[str] = None,
    availability_status: Optional[AvailabilityStatus] = None,
    region_id: Optional[UUID] = None,
    zone_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all employees with pagination and filters"""
    from models.zone import Region
    from middleware.zone_scope import get_zone_ids_for_user

    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    # Base query
    query = select(Employee).where(Employee.org_id == org_id)

    # Zone-based data scoping
    allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
    if allowed_zone_ids is not None:
        scoped_region_ids = select(Region.id).where(
            Region.zone_id.in_(allowed_zone_ids), Region.org_id == org_id
        )
        query = query.where(Employee.region_id.in_(scoped_region_ids))

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
    elif status_in:
        raw_statuses = [s.strip() for s in status_in.split(',') if s.strip()]
        invalid_statuses = [s for s in raw_statuses if s not in EmploymentStatus._value2member_map_]
        if invalid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid employment status: {', '.join(invalid_statuses)}",
            )
        statuses = [EmploymentStatus(s) for s in raw_statuses]
        if statuses:
            query = query.where(Employee.employment_status.in_(statuses))
    if availability_status:
        query = query.where(Employee.availability_status == availability_status)
    if region_id:
        query = query.where(Employee.region_id == region_id)
    elif zone_id:
        region_ids = select(Region.id).where(Region.zone_id == zone_id, Region.org_id == org_id)
        query = query.where(Employee.region_id.in_(region_ids))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Employee.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    employees = result.scalars().all()

    # Enrich with region/zone names without N+1 lookups.
    enriched = await build_employee_responses(employees, db)

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


@router.get("/{employee_id}/issued-assets", response_model=List[EmployeeIssuedAssetResponse])
async def get_employee_issued_assets(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Get inventory assets issued to a specific employee."""
    org_id = UUID(token_data.get("org_id"))

    employee_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = employee_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    result = await db.execute(
        select(InventoryIssuance)
        .where(
            InventoryIssuance.org_id == org_id,
            InventoryIssuance.issued_to_type == "employee",
            InventoryIssuance.issued_to_id == employee_id,
        )
        .order_by(InventoryIssuance.issue_date.desc(), InventoryIssuance.created_at.desc())
    )
    issuances = result.scalars().all()
    return [await build_employee_issued_asset_response(issuance, db) for issuance in issuances]


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


# ============ ACTIVE CONTRACT ENDPOINT ============

@router.get("/{employee_id}/active-contract")
async def get_active_contract(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get the active contract for an employee (used by payroll to pull salary)."""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeContract).where(
            EmployeeContract.employee_id == employee_id,
            EmployeeContract.org_id == org_id,
            EmployeeContract.status == ContractStatus.ACTIVE,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(
            status_code=404,
            detail="No active contract found for this employee"
        )

    return {
        "id": str(contract.id),
        "contract_number": contract.contract_number,
        "salary_amount": contract.salary_amount,
        "start_date": str(contract.start_date),
        "end_date": str(contract.end_date) if contract.end_date else None,
        "duration_months": contract.duration_months,
        "job_title_on_contract": contract.job_title_on_contract,
        "status": contract.status.value,
    }


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


# ============ GCS PHOTO + DOCUMENT ENDPOINTS ============

VALID_PHOTO_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
PHOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

VALID_DOC_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"}
DOC_MAX_BYTES = 20 * 1024 * 1024  # 20 MB

VALID_DOCUMENT_TYPES = {
    "national_id", "referee_id", "next_of_kin_id",
    "contract", "certificate", "disciplinary_letter", "other",
}


class GCSDocumentResponse(BaseModel):
    id: UUID
    employee_id: UUID
    document_type: str
    title: Optional[str] = None
    original_filename: Optional[str] = None
    gcs_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploaded_by_name: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    view_url: Optional[str] = None
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


def _build_doc_response(doc: EmployeeDocument, uploaded_by_name: Optional[str] = None) -> dict:
    from services.storage_service import storage_service
    view_url = None
    download_url = None
    if doc.gcs_path:
        try:
            view_url = storage_service.get_signed_url(doc.gcs_path, expiry_minutes=60)
            download_url = storage_service.get_download_url(
                doc.gcs_path,
                original_filename=doc.original_filename or "document",
                expiry_minutes=60,
            )
        except Exception:
            pass

    return {
        "id": doc.id,
        "employee_id": doc.employee_id,
        "document_type": doc.document_type,
        "title": doc.title,
        "original_filename": doc.original_filename,
        "gcs_path": doc.gcs_path,
        "file_size_bytes": doc.file_size_bytes,
        "mime_type": doc.mime_type,
        "uploaded_by": doc.uploaded_by,
        "uploaded_by_name": uploaded_by_name,
        "uploaded_at": doc.uploaded_at,
        "notes": doc.notes,
        "created_at": doc.created_at,
        "view_url": view_url,
        "download_url": download_url,
    }


@router.post("/{employee_id}/photo")
async def upload_gcs_photo(
    employee_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Upload employee profile photo to GCS. Returns { photo_url }."""
    from services.storage_service import storage_service

    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if file.content_type not in VALID_PHOTO_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only jpg, png, webp photos are allowed")

    contents = await file.read()
    if len(contents) > PHOTO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be under 5 MB")

    if employee.photo_path:
        storage_service.delete_file(employee.photo_path)

    gcs_path = storage_service.upload_file(
        file_bytes=contents,
        folder="employees/photos",
        entity_id=str(employee_id),
        original_filename=file.filename or "profile.jpg",
        content_type=file.content_type,
        cache_control="public, max-age=31536000, immutable",
    )

    employee.photo_path = gcs_path
    await db.commit()

    photo_url = storage_service.get_view_url(gcs_path, expiry_minutes=60)
    return {"photo_url": photo_url, "gcs_path": gcs_path}


@router.get("/{employee_id}/photo")
async def get_gcs_photo(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Return a fresh signed URL for the employee's current photo."""
    from services.storage_service import storage_service

    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not employee.photo_path:
        return {"photo_url": None}

    try:
        photo_url = storage_service.get_view_url(employee.photo_path, expiry_minutes=60)
        return {"photo_url": photo_url, "gcs_path": employee.photo_path}
    except Exception:
        return {"photo_url": f"/api/employees/{employee_id}/photo/view", "gcs_path": employee.photo_path}


@router.get("/{employee_id}/photo/view")
async def view_employee_photo(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Redirect browsers to a viewable employee photo URL."""
    from services.storage_service import storage_service

    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee or not employee.photo_path:
        raise HTTPException(status_code=404, detail="Photo not found")

    photo_url = storage_service.get_view_url(employee.photo_path, expiry_minutes=60)
    return RedirectResponse(photo_url, status_code=302)


@router.delete("/{employee_id}/photo")
async def delete_gcs_photo(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Remove the employee's current profile photo from GCS."""
    from services.storage_service import storage_service

    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if employee.photo_path:
        storage_service.delete_file(employee.photo_path)
        employee.photo_path = None

    if employee.profile_photo and os.path.exists(employee.profile_photo):
        try:
            os.remove(employee.profile_photo)
        except OSError:
            pass
    employee.profile_photo = None

    await db.commit()
    return {"message": "Photo removed"}


@router.post("/{employee_id}/documents", response_model=GCSDocumentResponse, status_code=201)
async def upload_gcs_document(
    employee_id: UUID,
    file: UploadFile = File(...),
    document_type: str = Query(...),
    title: str = Query(...),
    notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Upload a document for an employee to GCS."""
    from services.storage_service import storage_service
    from datetime import timezone as tz

    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document_type. Must be one of: {', '.join(sorted(VALID_DOCUMENT_TYPES))}",
        )

    if file.content_type not in VALID_DOC_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Allowed formats: pdf, jpg, jpeg, png, webp")

    emp_result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))
    if not emp_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Employee not found")

    contents = await file.read()
    if len(contents) > DOC_MAX_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 20 MB")

    gcs_path = storage_service.upload_file(
        file_bytes=contents,
        folder="employees/documents",
        entity_id=str(employee_id),
        original_filename=file.filename or "document",
        content_type=file.content_type,
    )

    doc = EmployeeDocument(
        org_id=org_id,
        employee_id=employee_id,
        document_type=document_type,
        title=title,
        original_filename=file.filename,
        gcs_path=gcs_path,
        file_size_bytes=len(contents),
        mime_type=file.content_type,
        uploaded_by=user_id,
        uploaded_at=datetime.now(tz=tz.utc),
        notes=notes,
        created_by=user_id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return _build_doc_response(doc)


@router.get("/{employee_id}/documents", response_model=List[GCSDocumentResponse])
async def list_gcs_documents(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """List all GCS documents for an employee with fresh signed URLs."""
    from models.auth import User

    org_id = UUID(token_data.get("org_id"))

    emp_result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))
    if not emp_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Employee not found")

    docs_result = await db.execute(
        select(EmployeeDocument)
        .where(EmployeeDocument.employee_id == employee_id, EmployeeDocument.org_id == org_id)
        .where(EmployeeDocument.gcs_path.isnot(None))
        .order_by(EmployeeDocument.created_at.desc())
    )
    docs = docs_result.scalars().all()

    uploader_ids = {d.uploaded_by for d in docs if d.uploaded_by}
    name_map: dict = {}
    if uploader_ids:
        users_result = await db.execute(select(User).where(User.id.in_(uploader_ids)))
        for u in users_result.scalars().all():
            name_map[u.id] = f"{u.first_name} {u.last_name}".strip()

    return [_build_doc_response(d, name_map.get(d.uploaded_by)) for d in docs]


# ============ OFFBOARD / REHIRE / PERIODS ENDPOINTS ============

_DEPARTURE_TO_STATUS = {
    DepartureReason.RESIGNED: EmploymentStatus.RESIGNED,
    DepartureReason.TERMINATED: EmploymentStatus.TERMINATED,
    DepartureReason.CONTRACT_EXPIRED: EmploymentStatus.INACTIVE,
    DepartureReason.ABSCONDED: EmploymentStatus.ABSCONDED,
    DepartureReason.OTHER: EmploymentStatus.INACTIVE,
}


@router.post("/{employee_id}/offboard", response_model=EmployeeResponse)
async def offboard_employee(
    employee_id: UUID,
    body: OffboardRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Offboard an active employee: close current period, update status, optionally terminate contract."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if employee.employment_status not in (EmploymentStatus.ACTIVE, EmploymentStatus.REHIRED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot offboard employee with status '{employee.employment_status.value}'"
        )

    # Close current employment period
    if employee.current_period_id:
        period_result = await db.execute(
            select(EmploymentPeriod).where(EmploymentPeriod.id == employee.current_period_id)
        )
        period = period_result.scalar_one_or_none()
        if period:
            period.end_date = body.last_working_date
            period.departure_reason = body.departure_reason
            period.departure_notes = body.departure_notes
            period.status = "ended"

    # Update employee record
    employee.employment_status = _DEPARTURE_TO_STATUS[body.departure_reason]
    employee.termination_date = body.last_working_date

    # Terminate active contract if requested
    if body.end_active_contract:
        contract_result = await db.execute(
            select(EmployeeContract).where(
                EmployeeContract.employee_id == employee_id,
                EmployeeContract.org_id == org_id,
                EmployeeContract.status == ContractStatus.ACTIVE,
            )
        )
        active_contract = contract_result.scalar_one_or_none()
        if active_contract:
            active_contract.status = ContractStatus.TERMINATED
            active_contract.termination_date = body.last_working_date
            active_contract.termination_reason = body.departure_notes or body.departure_reason.value
            active_contract.terminated_by = user_id

    await db.commit()
    await db.refresh(employee)
    return await build_employee_response(employee, db)


@router.post("/{employee_id}/rehire", response_model=EmployeeResponse)
async def rehire_employee(
    employee_id: UUID,
    body: RehireRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Rehire a former employee: create new employment period, update status."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    rehireable = (
        EmploymentStatus.RESIGNED,
        EmploymentStatus.TERMINATED,
        EmploymentStatus.ABSCONDED,
        EmploymentStatus.INACTIVE,
    )
    if employee.employment_status not in rehireable:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot rehire employee with status '{employee.employment_status.value}'"
        )

    new_period_number = employee.total_employment_periods + 1

    new_period = EmploymentPeriod(
        org_id=org_id,
        employee_id=employee_id,
        period_number=new_period_number,
        start_date=body.rehire_date,
        rehire_date=body.rehire_date,
        rehired_by=user_id,
        departure_notes=body.notes,
        status="active",
        created_by=user_id,
    )
    db.add(new_period)
    await db.flush()  # get new_period.id

    employee.employment_status = EmploymentStatus.REHIRED
    employee.hire_date = body.rehire_date
    employee.termination_date = None
    employee.total_employment_periods = new_period_number
    employee.current_period_id = new_period.id

    await db.commit()
    await db.refresh(employee)
    return await build_employee_response(employee, db)


@router.get("/{employee_id}/employment-periods", response_model=List[EmploymentPeriodResponse])
async def get_employment_periods(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Return all employment periods for an employee in chronological order."""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Employee not found")

    periods_result = await db.execute(
        select(EmploymentPeriod)
        .where(EmploymentPeriod.employee_id == employee_id)
        .order_by(EmploymentPeriod.period_number)
    )
    return periods_result.scalars().all()


@router.get("/{employee_id}/documents/{doc_id}", response_model=GCSDocumentResponse)
async def get_gcs_document(
    employee_id: UUID,
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Get a single document with fresh signed URLs."""
    from models.auth import User

    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeDocument).where(
            EmployeeDocument.id == doc_id,
            EmployeeDocument.employee_id == employee_id,
            EmployeeDocument.org_id == org_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    uploader_name = None
    if doc.uploaded_by:
        u = (await db.execute(select(User).where(User.id == doc.uploaded_by))).scalar_one_or_none()
        if u:
            uploader_name = f"{u.first_name} {u.last_name}".strip()

    return _build_doc_response(doc, uploader_name)


@router.delete("/{employee_id}/documents/{doc_id}")
async def delete_gcs_document(
    employee_id: UUID,
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Delete a document from GCS and the database."""
    from services.storage_service import storage_service

    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(EmployeeDocument).where(
            EmployeeDocument.id == doc_id,
            EmployeeDocument.employee_id == employee_id,
            EmployeeDocument.org_id == org_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.gcs_path:
        storage_service.delete_file(doc.gcs_path)

    await db.delete(doc)
    await db.commit()

    return {"message": "Document deleted"}
