# Employee Router - CRUD operations for HR Records module

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid
import os
import shutil
from pathlib import Path

from utils.auth import get_token_data

router = APIRouter(prefix="/employees", tags=["Employees"])

# Database instance will be injected
db = None

def set_db(database):
    global db
    db = database


# Ensure uploads directories exist
UPLOAD_DIR = Path("/app/backend/uploads")
PHOTOS_DIR = UPLOAD_DIR / "photos"
DOCUMENTS_DIR = UPLOAD_DIR / "documents"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


# ============ ENUMS ============

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class MaritalStatus(str, Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"


class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"
    ON_LEAVE = "on_leave"


class IDType(str, Enum):
    NATIONAL_ID = "national_id"
    VOTER_ID = "voter_id"
    DRIVING_LICENSE = "driving_license"
    PASSPORT = "passport"
    OTHER = "other"


class ContractStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class ContractType(str, Enum):
    PERMANENT = "permanent"
    FIXED_TERM = "fixed_term"
    CASUAL = "casual"
    PROBATION = "probation"
    PART_TIME = "part_time"


# ============ EMPLOYEE SCHEMAS ============

class EmployeeCreate(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[MaritalStatus] = None
    nationality: Optional[str] = None
    nin: Optional[str] = Field(None, description="National Identification Number")
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    physical_address: Optional[str] = None
    postal_address: Optional[str] = None
    education_background: Optional[str] = None
    job_title: Optional[str] = None
    employment_status: EmploymentStatus = EmploymentStatus.ACTIVE
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    notes: Optional[str] = None


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
    postal_address: Optional[str] = None
    education_background: Optional[str] = None
    job_title: Optional[str] = None
    employment_status: Optional[EmploymentStatus] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    notes: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: str
    org_id: str
    employee_id: str
    guard_no: Optional[str] = None
    profile_photo: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    full_name: str
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    nin: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    physical_address: Optional[str] = None
    postal_address: Optional[str] = None
    education_background: Optional[str] = None
    job_title: Optional[str] = None
    employment_status: str
    hire_date: Optional[str] = None
    termination_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class EmployeeListResponse(BaseModel):
    employees: List[EmployeeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============ BANK ACCOUNT SCHEMAS ============

class BankAccountCreate(BaseModel):
    bank_name: str
    bank_branch: Optional[str] = None
    account_name: str
    account_number: str


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None


class BankAccountResponse(BaseModel):
    id: str
    employee_id: str
    bank_name: str
    bank_branch: Optional[str] = None
    account_name: str
    account_number: str
    created_at: str
    updated_at: str


# ============ REFEREE SCHEMAS ============

class RefereeCreate(BaseModel):
    full_name: str
    relationship: str
    phone_number: str
    alternate_phone: Optional[str] = None
    id_type: Optional[IDType] = None
    id_number: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    notes: Optional[str] = None


class RefereeUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship: Optional[str] = None
    phone_number: Optional[str] = None
    alternate_phone: Optional[str] = None
    id_type: Optional[IDType] = None
    id_number: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    notes: Optional[str] = None


class RefereeResponse(BaseModel):
    id: str
    employee_id: str
    full_name: str
    relationship: str
    phone_number: str
    alternate_phone: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    id_softcopy_file: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


# ============ NEXT OF KIN SCHEMAS ============

class NextOfKinCreate(BaseModel):
    full_name: str
    relationship: str
    phone_1: str
    phone_2: Optional[str] = None
    address: Optional[str] = None
    id_type: Optional[IDType] = None
    id_number: Optional[str] = None
    notes: Optional[str] = None


class NextOfKinUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    address: Optional[str] = None
    id_type: Optional[IDType] = None
    id_number: Optional[str] = None
    notes: Optional[str] = None


class NextOfKinResponse(BaseModel):
    id: str
    employee_id: str
    full_name: str
    relationship: str
    phone_1: str
    phone_2: Optional[str] = None
    address: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    id_softcopy_file: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    message: str


# ============ EMPLOYMENT HISTORY SCHEMAS ============

class EmploymentHistoryCreate(BaseModel):
    employer_name: str
    job_title: str
    start_date: date
    end_date: Optional[date] = None
    reason_for_leaving: Optional[str] = None
    reference_contact: Optional[str] = None
    notes: Optional[str] = None


class EmploymentHistoryUpdate(BaseModel):
    employer_name: Optional[str] = None
    job_title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason_for_leaving: Optional[str] = None
    reference_contact: Optional[str] = None
    notes: Optional[str] = None


class EmploymentHistoryResponse(BaseModel):
    id: str
    employee_id: str
    employer_name: str
    job_title: str
    start_date: str
    end_date: Optional[str] = None
    reason_for_leaving: Optional[str] = None
    reference_contact: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


# ============ CONTRACT SCHEMAS ============

class ContractCreate(BaseModel):
    contract_type: ContractType
    start_date: date
    end_date: Optional[date] = None
    duration_months: Optional[int] = None
    probation_months: Optional[int] = None
    salary_amount: Optional[float] = None
    job_title_on_contract: Optional[str] = None
    workstation_site: Optional[str] = None
    signed_date: Optional[date] = None
    employee_signed: bool = False
    employer_signed: bool = False
    status: ContractStatus = ContractStatus.DRAFT


class ContractUpdate(BaseModel):
    contract_type: Optional[ContractType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_months: Optional[int] = None
    probation_months: Optional[int] = None
    salary_amount: Optional[float] = None
    job_title_on_contract: Optional[str] = None
    workstation_site: Optional[str] = None
    signed_date: Optional[date] = None
    employee_signed: Optional[bool] = None
    employer_signed: Optional[bool] = None
    status: Optional[ContractStatus] = None


class ContractResponse(BaseModel):
    id: str
    employee_id: str
    org_id: Optional[str] = None
    contract_number: str
    contract_type: str
    start_date: str
    end_date: Optional[str] = None
    duration_months: Optional[int] = None
    probation_months: Optional[int] = None
    salary_amount: Optional[float] = None
    job_title_on_contract: Optional[str] = None
    workstation_site: Optional[str] = None
    signed_date: Optional[str] = None
    employee_signed: bool
    employer_signed: bool
    contract_document_file: Optional[str] = None
    status: str
    created_at: str
    updated_at: str


# ============ HELPER FUNCTIONS ============

async def generate_employee_id(org_id: str) -> str:
    """Generate auto-incrementing employee ID like EMP0001"""
    # Find the highest employee_id number
    cursor = db.employees.find(
        {"org_id": org_id, "employee_id": {"$regex": "^EMP"}},
        {"employee_id": 1, "_id": 0}
    ).sort("employee_id", -1).limit(1)
    
    last_emp = await cursor.to_list(length=1)
    
    if last_emp and last_emp[0].get("employee_id"):
        try:
            num = int(last_emp[0]["employee_id"].replace("EMP", ""))
            return f"EMP{str(num + 1).zfill(4)}"
        except ValueError:
            pass
    
    return "EMP0001"


async def generate_guard_no(org_id: str) -> str:
    """Generate auto-incrementing guard number like G0001"""
    cursor = db.employees.find(
        {"org_id": org_id, "guard_no": {"$regex": "^G"}},
        {"guard_no": 1, "_id": 0}
    ).sort("guard_no", -1).limit(1)
    
    last_guard = await cursor.to_list(length=1)
    
    if last_guard and last_guard[0].get("guard_no"):
        try:
            num = int(last_guard[0]["guard_no"].replace("G", ""))
            return f"G{str(num + 1).zfill(4)}"
        except ValueError:
            pass
    
    return "G0001"


def serialize_employee(doc: dict) -> EmployeeResponse:
    """Convert MongoDB document to EmployeeResponse"""
    return EmployeeResponse(
        id=doc["id"],
        org_id=doc["org_id"],
        employee_id=doc["employee_id"],
        guard_no=doc.get("guard_no"),
        profile_photo=doc.get("profile_photo"),
        first_name=doc["first_name"],
        middle_name=doc.get("middle_name"),
        last_name=doc["last_name"],
        full_name=f"{doc['first_name']} {doc.get('middle_name', '')} {doc['last_name']}".replace("  ", " ").strip(),
        gender=doc.get("gender"),
        date_of_birth=doc.get("date_of_birth"),
        marital_status=doc.get("marital_status"),
        nationality=doc.get("nationality"),
        nin=doc.get("nin"),
        phone_1=doc.get("phone_1"),
        phone_2=doc.get("phone_2"),
        email=doc.get("email"),
        physical_address=doc.get("physical_address"),
        postal_address=doc.get("postal_address"),
        education_background=doc.get("education_background"),
        job_title=doc.get("job_title"),
        employment_status=doc.get("employment_status", "active"),
        hire_date=doc.get("hire_date"),
        termination_date=doc.get("termination_date"),
        notes=doc.get("notes"),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
        created_by=doc.get("created_by")
    )


async def verify_employee_access(employee_uuid: str, org_id: str):
    """Verify employee exists and belongs to org"""
    employee = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0, "id": 1}
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return employee


# ============ EMPLOYEE ENDPOINTS ============

@router.get("", response_model=EmployeeListResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name, email, employee_id, or guard_no"),
    status: Optional[EmploymentStatus] = Query(None, description="Filter by employment status"),
    token_data: dict = Depends(get_token_data)
):
    """List all employees with pagination, search, and filtering"""
    org_id = token_data.get("org_id")
    
    query = {"org_id": org_id}
    
    if status:
        query["employment_status"] = status.value
    
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"first_name": search_regex},
            {"middle_name": search_regex},
            {"last_name": search_regex},
            {"email": search_regex},
            {"employee_id": search_regex},
            {"guard_no": search_regex},
            {"phone_1": search_regex},
        ]
    
    total = await db.employees.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    cursor = db.employees.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    employees = await cursor.to_list(length=page_size)
    
    return EmployeeListResponse(
        employees=[serialize_employee(emp) for emp in employees],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee: EmployeeCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a new employee with auto-generated IDs"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")
    
    # Auto-generate employee_id and guard_no
    employee_id = await generate_employee_id(org_id)
    guard_no = await generate_guard_no(org_id)
    
    now = datetime.now(timezone.utc).isoformat()
    employee_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "employee_id": employee_id,
        "guard_no": guard_no,
        "profile_photo": None,
        "first_name": employee.first_name,
        "middle_name": employee.middle_name,
        "last_name": employee.last_name,
        "gender": employee.gender.value if employee.gender else None,
        "date_of_birth": employee.date_of_birth.isoformat() if employee.date_of_birth else None,
        "marital_status": employee.marital_status.value if employee.marital_status else None,
        "nationality": employee.nationality,
        "nin": employee.nin,
        "phone_1": employee.phone_1,
        "phone_2": employee.phone_2,
        "email": employee.email,
        "physical_address": employee.physical_address,
        "postal_address": employee.postal_address,
        "education_background": employee.education_background,
        "job_title": employee.job_title,
        "employment_status": employee.employment_status.value,
        "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None,
        "notes": employee.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }
    
    await db.employees.insert_one(employee_doc)
    return serialize_employee(employee_doc)


@router.get("/{employee_uuid}", response_model=EmployeeResponse)
async def get_employee(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single employee by UUID"""
    org_id = token_data.get("org_id")
    
    employee = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return serialize_employee(employee)


@router.put("/{employee_uuid}", response_model=EmployeeResponse)
async def update_employee(
    employee_uuid: str,
    update_data: EmployeeUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update an employee"""
    org_id = token_data.get("org_id")
    
    existing = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key in ["date_of_birth", "hire_date", "termination_date"] and isinstance(value, date):
                update_doc[key] = value.isoformat()
            elif key in ["gender", "marital_status", "employment_status"] and hasattr(value, "value"):
                update_doc[key] = value.value
            else:
                update_doc[key] = value
    
    await db.employees.update_one(
        {"id": employee_uuid, "org_id": org_id},
        {"$set": update_doc}
    )
    
    updated = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    return serialize_employee(updated)


@router.delete("/{employee_uuid}", response_model=MessageResponse)
async def delete_employee(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete an employee and all related records"""
    org_id = token_data.get("org_id")
    
    result = await db.employees.delete_one(
        {"id": employee_uuid, "org_id": org_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Delete related records
    await db.employee_bank_accounts.delete_many({"employee_id": employee_uuid})
    await db.employee_referees.delete_many({"employee_id": employee_uuid})
    await db.employee_next_of_kin.delete_many({"employee_id": employee_uuid})
    
    return MessageResponse(message="Employee deleted successfully")


@router.post("/{employee_uuid}/photo", response_model=EmployeeResponse)
async def upload_photo(
    employee_uuid: str,
    file: UploadFile = File(...),
    token_data: dict = Depends(get_token_data)
):
    """Upload profile photo for an employee"""
    org_id = token_data.get("org_id")
    
    existing = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{employee_uuid}.{ext}"
    filepath = PHOTOS_DIR / filename
    
    if existing.get("profile_photo"):
        old_path = PHOTOS_DIR / existing["profile_photo"].split("/")[-1]
        if old_path.exists():
            old_path.unlink()
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    photo_url = f"/uploads/photos/{filename}"
    await db.employees.update_one(
        {"id": employee_uuid, "org_id": org_id},
        {"$set": {
            "profile_photo": photo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    return serialize_employee(updated)


@router.delete("/{employee_uuid}/photo", response_model=EmployeeResponse)
async def delete_photo(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete profile photo for an employee"""
    org_id = token_data.get("org_id")
    
    existing = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    if existing.get("profile_photo"):
        filepath = PHOTOS_DIR / existing["profile_photo"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employees.update_one(
        {"id": employee_uuid, "org_id": org_id},
        {"$set": {
            "profile_photo": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    return serialize_employee(updated)


# ============ BANK ACCOUNT ENDPOINTS ============

@router.get("/{employee_uuid}/bank-account", response_model=Optional[BankAccountResponse])
async def get_bank_account(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Get bank account for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    account = await db.employee_bank_accounts.find_one(
        {"employee_id": employee_uuid},
        {"_id": 0}
    )
    
    if not account:
        return None
    
    return BankAccountResponse(**account)


@router.post("/{employee_uuid}/bank-account", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    employee_uuid: str,
    data: BankAccountCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create or update bank account for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if account already exists
    existing = await db.employee_bank_accounts.find_one({"employee_id": employee_uuid})
    
    if existing:
        # Update existing
        await db.employee_bank_accounts.update_one(
            {"employee_id": employee_uuid},
            {"$set": {
                "bank_name": data.bank_name,
                "bank_branch": data.bank_branch,
                "account_name": data.account_name,
                "account_number": data.account_number,
                "updated_at": now
            }}
        )
        updated = await db.employee_bank_accounts.find_one(
            {"employee_id": employee_uuid},
            {"_id": 0}
        )
        return BankAccountResponse(**updated)
    
    # Create new
    account_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_uuid,
        "bank_name": data.bank_name,
        "bank_branch": data.bank_branch,
        "account_name": data.account_name,
        "account_number": data.account_number,
        "created_at": now,
        "updated_at": now
    }
    
    await db.employee_bank_accounts.insert_one(account_doc)
    return BankAccountResponse(**account_doc)


@router.put("/{employee_uuid}/bank-account", response_model=BankAccountResponse)
async def update_bank_account(
    employee_uuid: str,
    data: BankAccountUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update bank account for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    existing = await db.employee_bank_accounts.find_one({"employee_id": employee_uuid})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found"
        )
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            update_doc[key] = value
    
    await db.employee_bank_accounts.update_one(
        {"employee_id": employee_uuid},
        {"$set": update_doc}
    )
    
    updated = await db.employee_bank_accounts.find_one(
        {"employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return BankAccountResponse(**updated)


@router.delete("/{employee_uuid}/bank-account", response_model=MessageResponse)
async def delete_bank_account(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete bank account for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    result = await db.employee_bank_accounts.delete_one({"employee_id": employee_uuid})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found"
        )
    
    return MessageResponse(message="Bank account deleted successfully")


# ============ REFEREE ENDPOINTS ============

@router.get("/{employee_uuid}/referees", response_model=List[RefereeResponse])
async def list_referees(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """List all referees for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    cursor = db.employee_referees.find(
        {"employee_id": employee_uuid},
        {"_id": 0}
    ).sort("created_at", -1)
    
    referees = await cursor.to_list(length=100)
    return [RefereeResponse(**ref) for ref in referees]


@router.post("/{employee_uuid}/referees", response_model=RefereeResponse, status_code=status.HTTP_201_CREATED)
async def create_referee(
    employee_uuid: str,
    data: RefereeCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a referee for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    now = datetime.now(timezone.utc).isoformat()
    referee_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_uuid,
        "full_name": data.full_name,
        "relationship": data.relationship,
        "phone_number": data.phone_number,
        "alternate_phone": data.alternate_phone,
        "id_type": data.id_type.value if data.id_type else None,
        "id_number": data.id_number,
        "id_softcopy_file": None,
        "address": data.address,
        "occupation": data.occupation,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.employee_referees.insert_one(referee_doc)
    return RefereeResponse(**referee_doc)


@router.get("/{employee_uuid}/referees/{referee_id}", response_model=RefereeResponse)
async def get_referee(
    employee_uuid: str,
    referee_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single referee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    referee = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found"
        )
    
    return RefereeResponse(**referee)


@router.put("/{employee_uuid}/referees/{referee_id}", response_model=RefereeResponse)
async def update_referee(
    employee_uuid: str,
    referee_id: str,
    data: RefereeUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update a referee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    existing = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found"
        )
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key == "id_type" and hasattr(value, "value"):
                update_doc[key] = value.value
            else:
                update_doc[key] = value
    
    await db.employee_referees.update_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"$set": update_doc}
    )
    
    updated = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return RefereeResponse(**updated)


@router.delete("/{employee_uuid}/referees/{referee_id}", response_model=MessageResponse)
async def delete_referee(
    employee_uuid: str,
    referee_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete a referee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    # Get referee to delete file if exists
    referee = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid}
    )
    
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found"
        )
    
    # Delete file if exists
    if referee.get("id_softcopy_file"):
        filepath = DOCUMENTS_DIR / referee["id_softcopy_file"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employee_referees.delete_one({"id": referee_id, "employee_id": employee_uuid})
    
    return MessageResponse(message="Referee deleted successfully")


@router.post("/{employee_uuid}/referees/{referee_id}/id-document", response_model=RefereeResponse)
async def upload_referee_id_document(
    employee_uuid: str,
    referee_id: str,
    file: UploadFile = File(...),
    token_data: dict = Depends(get_token_data)
):
    """Upload ID softcopy for a referee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    referee = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid}
    )
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found"
        )
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WebP, PDF"
        )
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"referee_{referee_id}.{ext}"
    filepath = DOCUMENTS_DIR / filename
    
    # Delete old file
    if referee.get("id_softcopy_file"):
        old_path = DOCUMENTS_DIR / referee["id_softcopy_file"].split("/")[-1]
        if old_path.exists():
            old_path.unlink()
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    file_url = f"/uploads/documents/{filename}"
    await db.employee_referees.update_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"$set": {
            "id_softcopy_file": file_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return RefereeResponse(**updated)


@router.delete("/{employee_uuid}/referees/{referee_id}/id-document", response_model=RefereeResponse)
async def delete_referee_id_document(
    employee_uuid: str,
    referee_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete ID softcopy for a referee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    referee = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid}
    )
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found"
        )
    
    if referee.get("id_softcopy_file"):
        filepath = DOCUMENTS_DIR / referee["id_softcopy_file"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employee_referees.update_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"$set": {
            "id_softcopy_file": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employee_referees.find_one(
        {"id": referee_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return RefereeResponse(**updated)


# ============ NEXT OF KIN ENDPOINTS ============

@router.get("/{employee_uuid}/next-of-kin", response_model=Optional[NextOfKinResponse])
async def get_next_of_kin(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Get next of kin for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    nok = await db.employee_next_of_kin.find_one(
        {"employee_id": employee_uuid},
        {"_id": 0}
    )
    
    if not nok:
        return None
    
    return NextOfKinResponse(**nok)


@router.post("/{employee_uuid}/next-of-kin", response_model=NextOfKinResponse, status_code=status.HTTP_201_CREATED)
async def create_next_of_kin(
    employee_uuid: str,
    data: NextOfKinCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create or update next of kin for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.employee_next_of_kin.find_one({"employee_id": employee_uuid})
    
    if existing:
        await db.employee_next_of_kin.update_one(
            {"employee_id": employee_uuid},
            {"$set": {
                "full_name": data.full_name,
                "relationship": data.relationship,
                "phone_1": data.phone_1,
                "phone_2": data.phone_2,
                "address": data.address,
                "id_type": data.id_type.value if data.id_type else None,
                "id_number": data.id_number,
                "notes": data.notes,
                "updated_at": now
            }}
        )
        updated = await db.employee_next_of_kin.find_one(
            {"employee_id": employee_uuid},
            {"_id": 0}
        )
        return NextOfKinResponse(**updated)
    
    nok_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_uuid,
        "full_name": data.full_name,
        "relationship": data.relationship,
        "phone_1": data.phone_1,
        "phone_2": data.phone_2,
        "address": data.address,
        "id_type": data.id_type.value if data.id_type else None,
        "id_number": data.id_number,
        "id_softcopy_file": None,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.employee_next_of_kin.insert_one(nok_doc)
    return NextOfKinResponse(**nok_doc)


@router.put("/{employee_uuid}/next-of-kin", response_model=NextOfKinResponse)
async def update_next_of_kin(
    employee_uuid: str,
    data: NextOfKinUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update next of kin for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    existing = await db.employee_next_of_kin.find_one({"employee_id": employee_uuid})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next of kin not found"
        )
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key == "id_type" and hasattr(value, "value"):
                update_doc[key] = value.value
            else:
                update_doc[key] = value
    
    await db.employee_next_of_kin.update_one(
        {"employee_id": employee_uuid},
        {"$set": update_doc}
    )
    
    updated = await db.employee_next_of_kin.find_one(
        {"employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return NextOfKinResponse(**updated)


@router.delete("/{employee_uuid}/next-of-kin", response_model=MessageResponse)
async def delete_next_of_kin(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete next of kin for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    nok = await db.employee_next_of_kin.find_one({"employee_id": employee_uuid})
    
    if not nok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next of kin not found"
        )
    
    if nok.get("id_softcopy_file"):
        filepath = DOCUMENTS_DIR / nok["id_softcopy_file"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employee_next_of_kin.delete_one({"employee_id": employee_uuid})
    
    return MessageResponse(message="Next of kin deleted successfully")


@router.post("/{employee_uuid}/next-of-kin/id-document", response_model=NextOfKinResponse)
async def upload_next_of_kin_id_document(
    employee_uuid: str,
    file: UploadFile = File(...),
    token_data: dict = Depends(get_token_data)
):
    """Upload ID softcopy for next of kin"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    nok = await db.employee_next_of_kin.find_one({"employee_id": employee_uuid})
    if not nok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next of kin not found"
        )
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WebP, PDF"
        )
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"nok_{employee_uuid}.{ext}"
    filepath = DOCUMENTS_DIR / filename
    
    if nok.get("id_softcopy_file"):
        old_path = DOCUMENTS_DIR / nok["id_softcopy_file"].split("/")[-1]
        if old_path.exists():
            old_path.unlink()
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    file_url = f"/uploads/documents/{filename}"
    await db.employee_next_of_kin.update_one(
        {"employee_id": employee_uuid},
        {"$set": {
            "id_softcopy_file": file_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employee_next_of_kin.find_one(
        {"employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return NextOfKinResponse(**updated)


@router.delete("/{employee_uuid}/next-of-kin/id-document", response_model=NextOfKinResponse)
async def delete_next_of_kin_id_document(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete ID softcopy for next of kin"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    nok = await db.employee_next_of_kin.find_one({"employee_id": employee_uuid})
    if not nok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next of kin not found"
        )
    
    if nok.get("id_softcopy_file"):
        filepath = DOCUMENTS_DIR / nok["id_softcopy_file"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employee_next_of_kin.update_one(
        {"employee_id": employee_uuid},
        {"$set": {
            "id_softcopy_file": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employee_next_of_kin.find_one(
        {"employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return NextOfKinResponse(**updated)



# ============ EMPLOYMENT HISTORY ENDPOINTS ============

@router.get("/{employee_uuid}/employment-history", response_model=List[EmploymentHistoryResponse])
async def list_employment_history(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """List all employment history for an employee (chronological order)"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    cursor = db.employee_employment_history.find(
        {"employee_id": employee_uuid},
        {"_id": 0}
    ).sort("start_date", -1)
    
    history = await cursor.to_list(length=100)
    return [EmploymentHistoryResponse(**h) for h in history]


@router.post("/{employee_uuid}/employment-history", response_model=EmploymentHistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_employment_history(
    employee_uuid: str,
    data: EmploymentHistoryCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create employment history entry"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    now = datetime.now(timezone.utc).isoformat()
    history_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_uuid,
        "employer_name": data.employer_name,
        "job_title": data.job_title,
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat() if data.end_date else None,
        "reason_for_leaving": data.reason_for_leaving,
        "reference_contact": data.reference_contact,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.employee_employment_history.insert_one(history_doc)
    return EmploymentHistoryResponse(**history_doc)


@router.get("/{employee_uuid}/employment-history/{history_id}", response_model=EmploymentHistoryResponse)
async def get_employment_history(
    employee_uuid: str,
    history_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single employment history entry"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    history = await db.employee_employment_history.find_one(
        {"id": history_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment history not found"
        )
    
    return EmploymentHistoryResponse(**history)


@router.put("/{employee_uuid}/employment-history/{history_id}", response_model=EmploymentHistoryResponse)
async def update_employment_history(
    employee_uuid: str,
    history_id: str,
    data: EmploymentHistoryUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update employment history entry"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    existing = await db.employee_employment_history.find_one(
        {"id": history_id, "employee_id": employee_uuid}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment history not found"
        )
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key in ["start_date", "end_date"] and isinstance(value, date):
                update_doc[key] = value.isoformat()
            else:
                update_doc[key] = value
    
    await db.employee_employment_history.update_one(
        {"id": history_id, "employee_id": employee_uuid},
        {"$set": update_doc}
    )
    
    updated = await db.employee_employment_history.find_one(
        {"id": history_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return EmploymentHistoryResponse(**updated)


@router.delete("/{employee_uuid}/employment-history/{history_id}", response_model=MessageResponse)
async def delete_employment_history(
    employee_uuid: str,
    history_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete employment history entry"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    result = await db.employee_employment_history.delete_one(
        {"id": history_id, "employee_id": employee_uuid}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment history not found"
        )
    
    return MessageResponse(message="Employment history deleted successfully")


# ============ CONTRACT ENDPOINTS ============

CONTRACTS_DIR = UPLOAD_DIR / "contracts"
CONTRACTS_DIR.mkdir(parents=True, exist_ok=True)


async def auto_update_contract_status(employee_uuid: str):
    """Auto-update contract statuses: active → expired when end_date passes"""
    today = datetime.now(timezone.utc).date().isoformat()

    # Find active contracts with passed end_date
    await db.employee_contracts.update_many(
        {
            "employee_id": employee_uuid,
            "status": "active",
            "end_date": {"$ne": None, "$lt": today}
        },
        {"$set": {"status": "expired", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )


async def generate_contract_number(org_id: str) -> str:
    """Generate contract number like CTR-2026-0001 per org per year"""
    year = datetime.now(timezone.utc).year
    cursor = db.employee_contracts.find(
        {"org_id": org_id, "contract_number": {"$regex": f"^CTR-{year}-"}},
        {"contract_number": 1, "_id": 0}
    ).sort("contract_number", -1).limit(1)

    last = await cursor.to_list(length=1)

    if last and last[0].get("contract_number"):
        try:
            seq = int(last[0]["contract_number"].split("-")[-1])
            return f"CTR-{year}-{str(seq + 1).zfill(4)}"
        except ValueError:
            pass

    return f"CTR-{year}-0001"


@router.get("/{employee_uuid}/contracts", response_model=List[ContractResponse])
async def list_contracts(
    employee_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """List all contracts for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    # Auto-update expired contracts
    await auto_update_contract_status(employee_uuid)
    
    cursor = db.employee_contracts.find(
        {"employee_id": employee_uuid},
        {"_id": 0}
    ).sort("created_at", -1)
    
    contracts = await cursor.to_list(length=100)
    return [ContractResponse(**c) for c in contracts]


@router.post("/{employee_uuid}/contracts", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    employee_uuid: str,
    data: ContractCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a contract for an employee"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    # Auto-generate contract number
    contract_number = await generate_contract_number(org_id)
    now = datetime.now(timezone.utc).isoformat()
    contract_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "employee_id": employee_uuid,
        "contract_number": contract_number,
        "contract_type": data.contract_type.value,
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat() if data.end_date else None,
        "duration_months": data.duration_months,
        "probation_months": data.probation_months,
        "salary_amount": data.salary_amount,
        "job_title_on_contract": data.job_title_on_contract,
        "workstation_site": data.workstation_site,
        "signed_date": data.signed_date.isoformat() if data.signed_date else None,
        "employee_signed": data.employee_signed,
        "employer_signed": data.employer_signed,
        "contract_document_file": None,
        "status": data.status.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.employee_contracts.insert_one(contract_doc)
    return ContractResponse(**contract_doc)


@router.get("/{employee_uuid}/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(
    employee_uuid: str,
    contract_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single contract"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    contract = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    return ContractResponse(**contract)


@router.put("/{employee_uuid}/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(
    employee_uuid: str,
    contract_id: str,
    data: ContractUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update a contract"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    existing = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key in ["start_date", "end_date", "signed_date"] and isinstance(value, date):
                update_doc[key] = value.isoformat()
            elif key in ["contract_type", "status"] and hasattr(value, "value"):
                update_doc[key] = value.value
            else:
                update_doc[key] = value
    
    await db.employee_contracts.update_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"$set": update_doc}
    )
    
    updated = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return ContractResponse(**updated)


@router.delete("/{employee_uuid}/contracts/{contract_id}", response_model=MessageResponse)
async def delete_contract(
    employee_uuid: str,
    contract_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete a contract"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    contract = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid}
    )
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Delete file if exists
    if contract.get("contract_document_file"):
        filepath = CONTRACTS_DIR / contract["contract_document_file"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employee_contracts.delete_one({"id": contract_id, "employee_id": employee_uuid})
    
    return MessageResponse(message="Contract deleted successfully")


@router.post("/{employee_uuid}/contracts/{contract_id}/document", response_model=ContractResponse)
async def upload_contract_document(
    employee_uuid: str,
    contract_id: str,
    file: UploadFile = File(...),
    token_data: dict = Depends(get_token_data)
):
    """Upload contract document (PDF)"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    contract = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid}
    )
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: PDF, JPEG, PNG, WebP"
        )
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 20MB limit"
        )
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    filename = f"contract_{contract_id}.{ext}"
    filepath = CONTRACTS_DIR / filename
    
    # Delete old file
    if contract.get("contract_document_file"):
        old_path = CONTRACTS_DIR / contract["contract_document_file"].split("/")[-1]
        if old_path.exists():
            old_path.unlink()
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    file_url = f"/uploads/contracts/{filename}"
    await db.employee_contracts.update_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"$set": {
            "contract_document_file": file_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return ContractResponse(**updated)


@router.delete("/{employee_uuid}/contracts/{contract_id}/document", response_model=ContractResponse)
async def delete_contract_document(
    employee_uuid: str,
    contract_id: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete contract document"""
    org_id = token_data.get("org_id")
    await verify_employee_access(employee_uuid, org_id)
    
    contract = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid}
    )
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    if contract.get("contract_document_file"):
        filepath = CONTRACTS_DIR / contract["contract_document_file"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    await db.employee_contracts.update_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"$set": {
            "contract_document_file": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.employee_contracts.find_one(
        {"id": contract_id, "employee_id": employee_uuid},
        {"_id": 0}
    )
    
    return ContractResponse(**updated)
