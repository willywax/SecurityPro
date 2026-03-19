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


# Ensure uploads directory exists
UPLOAD_DIR = Path("/app/backend/uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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


class EducationLevel(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    DIPLOMA = "diploma"
    BACHELORS = "bachelors"
    MASTERS = "masters"
    PHD = "phd"
    OTHER = "other"


# ============ SCHEMAS ============

class EmployeeCreate(BaseModel):
    employee_id: str = Field(..., description="Unique employee identifier")
    guard_no: Optional[str] = None
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
    employee_id: Optional[str] = None
    guard_no: Optional[str] = None
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


class MessageResponse(BaseModel):
    message: str


# ============ HELPER FUNCTIONS ============

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


# ============ ENDPOINTS ============

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
    
    # Build query
    query = {"org_id": org_id}
    
    # Add status filter
    if status:
        query["employment_status"] = status.value
    
    # Add search filter
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
    
    # Get total count
    total = await db.employees.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    # Fetch employees
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
    """Create a new employee"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")
    
    # Check if employee_id already exists in this org
    existing = await db.employees.find_one({
        "org_id": org_id,
        "employee_id": employee.employee_id
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with ID '{employee.employee_id}' already exists"
        )
    
    # Create employee document
    now = datetime.now(timezone.utc).isoformat()
    employee_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "employee_id": employee.employee_id,
        "guard_no": employee.guard_no,
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
    
    # Check if employee exists
    existing = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # If changing employee_id, check uniqueness
    if update_data.employee_id and update_data.employee_id != existing.get("employee_id"):
        conflict = await db.employees.find_one({
            "org_id": org_id,
            "employee_id": update_data.employee_id,
            "id": {"$ne": employee_uuid}
        })
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with ID '{update_data.employee_id}' already exists"
            )
    
    # Build update document
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
    
    # Fetch updated document
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
    """Delete an employee"""
    org_id = token_data.get("org_id")
    
    result = await db.employees.delete_one(
        {"id": employee_uuid, "org_id": org_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return MessageResponse(message="Employee deleted successfully")


@router.post("/{employee_uuid}/photo", response_model=EmployeeResponse)
async def upload_photo(
    employee_uuid: str,
    file: UploadFile = File(...),
    token_data: dict = Depends(get_token_data)
):
    """Upload profile photo for an employee"""
    org_id = token_data.get("org_id")
    
    # Check if employee exists
    existing = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{employee_uuid}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Delete old photo if exists
    if existing.get("profile_photo"):
        old_path = UPLOAD_DIR / existing["profile_photo"].split("/")[-1]
        if old_path.exists():
            old_path.unlink()
    
    # Save new photo
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Update employee record
    photo_url = f"/uploads/photos/{filename}"
    await db.employees.update_one(
        {"id": employee_uuid, "org_id": org_id},
        {"$set": {
            "profile_photo": photo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Fetch updated document
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
    
    # Check if employee exists
    existing = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Delete photo file if exists
    if existing.get("profile_photo"):
        filepath = UPLOAD_DIR / existing["profile_photo"].split("/")[-1]
        if filepath.exists():
            filepath.unlink()
    
    # Update employee record
    await db.employees.update_one(
        {"id": employee_uuid, "org_id": org_id},
        {"$set": {
            "profile_photo": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Fetch updated document
    updated = await db.employees.find_one(
        {"id": employee_uuid, "org_id": org_id},
        {"_id": 0}
    )
    
    return serialize_employee(updated)
