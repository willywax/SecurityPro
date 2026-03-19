# Payroll Router - Record-based payroll management (no accounting logic)

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid
import re

from utils.auth import get_token_data

router = APIRouter(prefix="/payroll", tags=["Payroll"])

db = None

def set_db(database):
    global db
    db = database


# ============ ENUMS ============

class PayrollStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    PAID = "paid"


# ============ SCHEMAS ============

class PayrollCreate(BaseModel):
    payroll_month: str          # YYYY-MM format
    employee_id: str
    base_salary: float
    allowances: float = 0.0
    deductions: float = 0.0
    overtime: float = 0.0
    status: PayrollStatus = PayrollStatus.DRAFT
    notes: Optional[str] = None

    @field_validator('payroll_month')
    @classmethod
    def validate_month(cls, v):
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError('payroll_month must be YYYY-MM format (e.g. 2026-03)')
        return v


class PayrollUpdate(BaseModel):
    base_salary: Optional[float] = None
    allowances: Optional[float] = None
    deductions: Optional[float] = None
    overtime: Optional[float] = None
    status: Optional[PayrollStatus] = None
    notes: Optional[str] = None


class PayrollResponse(BaseModel):
    id: str
    org_id: str
    payroll_id: str
    payroll_month: str
    employee_id: str
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    base_salary: float
    allowances: float
    deductions: float
    overtime: float
    net_pay: float
    status: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class PayrollListResponse(BaseModel):
    payrolls: List[PayrollResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BulkPayrollItem(BaseModel):
    employee_id: str
    base_salary: float
    allowances: float = 0.0
    deductions: float = 0.0
    overtime: float = 0.0
    notes: Optional[str] = None


class BulkPayrollCreate(BaseModel):
    payroll_month: str
    status: PayrollStatus = PayrollStatus.DRAFT
    entries: List[BulkPayrollItem]

    @field_validator('payroll_month')
    @classmethod
    def validate_month(cls, v):
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError('payroll_month must be YYYY-MM format')
        return v


class BulkPayrollResponse(BaseModel):
    created: List[PayrollResponse]
    skipped: List[str]


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

def compute_net_pay(base: float, allowances: float, overtime: float, deductions: float) -> float:
    return round(base + allowances + overtime - deductions, 2)


async def generate_payroll_id(org_id: str) -> str:
    """Generate payroll ID like PAY0001"""
    cursor = db.payrolls.find(
        {"org_id": org_id, "payroll_id": {"$regex": "^PAY"}},
        {"payroll_id": 1, "_id": 0}
    ).sort("payroll_id", -1).limit(1)

    last = await cursor.to_list(length=1)
    if last and last[0].get("payroll_id"):
        try:
            num = int(last[0]["payroll_id"].replace("PAY", ""))
            return f"PAY{str(num + 1).zfill(4)}"
        except ValueError:
            pass
    return "PAY0001"


async def enrich_payroll(doc: dict, org_id: str) -> dict:
    """Add employee_name and employee_code"""
    enriched = {**doc}
    if doc.get("employee_id"):
        emp = await db.employees.find_one(
            {"id": doc["employee_id"], "org_id": org_id},
            {"first_name": 1, "last_name": 1, "employee_id": 1, "_id": 0}
        )
        if emp:
            enriched["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()
            enriched["employee_code"] = emp.get("employee_id")
    return enriched


# ============ PAYROLL ENDPOINTS ============
# NOTE: /bulk must be defined before /{payroll_uuid} to avoid route conflict

@router.get("", response_model=PayrollListResponse)
async def list_payrolls(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
    employee_id: Optional[str] = Query(None),
    status: Optional[PayrollStatus] = Query(None),
    token_data: dict = Depends(get_token_data)
):
    """List payroll records with optional filters"""
    org_id = token_data.get("org_id")

    query = {"org_id": org_id}
    if month:
        query["payroll_month"] = month
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status.value

    total = await db.payrolls.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    cursor = db.payrolls.find(query, {"_id": 0}).sort(
        [("payroll_month", -1), ("created_at", -1)]
    ).skip(skip).limit(page_size)
    payrolls = await cursor.to_list(length=page_size)

    enriched = []
    for p in payrolls:
        enriched.append(PayrollResponse(**(await enrich_payroll(p, org_id))))

    return PayrollListResponse(
        payrolls=enriched,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/bulk", response_model=BulkPayrollResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_payroll(
    data: BulkPayrollCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create multiple payroll entries for a month"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    if not data.entries:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No entries provided")

    created = []
    skipped = []

    for entry in data.entries:
        emp = await db.employees.find_one(
            {"id": entry.employee_id, "org_id": org_id},
            {"first_name": 1, "last_name": 1, "employee_id": 1, "_id": 0}
        )
        if not emp:
            skipped.append(f"Employee {entry.employee_id}: not found")
            continue

        emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

        existing = await db.payrolls.find_one({
            "employee_id": entry.employee_id,
            "payroll_month": data.payroll_month,
            "org_id": org_id
        })
        if existing:
            skipped.append(f"{emp_name}: payroll already exists for {data.payroll_month}")
            continue

        payroll_id = await generate_payroll_id(org_id)
        net_pay = compute_net_pay(entry.base_salary, entry.allowances, entry.overtime, entry.deductions)
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "id": str(uuid.uuid4()),
            "org_id": org_id,
            "payroll_id": payroll_id,
            "payroll_month": data.payroll_month,
            "employee_id": entry.employee_id,
            "base_salary": entry.base_salary,
            "allowances": entry.allowances,
            "deductions": entry.deductions,
            "overtime": entry.overtime,
            "net_pay": net_pay,
            "status": data.status.value,
            "notes": entry.notes,
            "created_at": now,
            "updated_at": now,
            "created_by": user_id
        }
        await db.payrolls.insert_one(doc)
        created.append(PayrollResponse(**(await enrich_payroll(doc, org_id))))

    if not created:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No records created. " + " | ".join(skipped)
        )

    return BulkPayrollResponse(created=created, skipped=skipped)


@router.post("", response_model=PayrollResponse, status_code=status.HTTP_201_CREATED)
async def create_payroll(
    data: PayrollCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a single payroll entry"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    emp = await db.employees.find_one({"id": data.employee_id, "org_id": org_id})
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    existing = await db.payrolls.find_one({
        "employee_id": data.employee_id,
        "payroll_month": data.payroll_month,
        "org_id": org_id
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payroll already exists for this employee in {data.payroll_month}"
        )

    payroll_id = await generate_payroll_id(org_id)
    net_pay = compute_net_pay(data.base_salary, data.allowances, data.overtime, data.deductions)
    now = datetime.now(timezone.utc).isoformat()

    payroll_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "payroll_id": payroll_id,
        "payroll_month": data.payroll_month,
        "employee_id": data.employee_id,
        "base_salary": data.base_salary,
        "allowances": data.allowances,
        "deductions": data.deductions,
        "overtime": data.overtime,
        "net_pay": net_pay,
        "status": data.status.value,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }

    await db.payrolls.insert_one(payroll_doc)
    return PayrollResponse(**(await enrich_payroll(payroll_doc, org_id)))


@router.get("/{payroll_uuid}", response_model=PayrollResponse)
async def get_payroll(
    payroll_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    payroll = await db.payrolls.find_one({"id": payroll_uuid, "org_id": org_id}, {"_id": 0})
    if not payroll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")
    return PayrollResponse(**(await enrich_payroll(payroll, org_id)))


@router.put("/{payroll_uuid}", response_model=PayrollResponse)
async def update_payroll(
    payroll_uuid: str,
    data: PayrollUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update a payroll record. Net pay is recalculated automatically."""
    org_id = token_data.get("org_id")

    existing = await db.payrolls.find_one({"id": payroll_uuid, "org_id": org_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            update_doc[key] = value.value if key == "status" and hasattr(value, "value") else value

    # Recalculate net_pay from merged values
    base = update_doc.get("base_salary", existing.get("base_salary", 0))
    allowances = update_doc.get("allowances", existing.get("allowances", 0))
    overtime = update_doc.get("overtime", existing.get("overtime", 0))
    deductions = update_doc.get("deductions", existing.get("deductions", 0))
    update_doc["net_pay"] = compute_net_pay(base, allowances, overtime, deductions)

    await db.payrolls.update_one({"id": payroll_uuid, "org_id": org_id}, {"$set": update_doc})
    updated = await db.payrolls.find_one({"id": payroll_uuid, "org_id": org_id}, {"_id": 0})
    return PayrollResponse(**(await enrich_payroll(updated, org_id)))


@router.delete("/{payroll_uuid}", response_model=MessageResponse)
async def delete_payroll(
    payroll_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete a payroll record. Only draft records can be deleted."""
    org_id = token_data.get("org_id")

    existing = await db.payrolls.find_one({"id": payroll_uuid, "org_id": org_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    if existing.get("status") != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft payroll records can be deleted"
        )

    await db.payrolls.delete_one({"id": payroll_uuid, "org_id": org_id})
    return MessageResponse(message="Payroll record deleted")
