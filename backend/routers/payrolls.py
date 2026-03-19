# Payroll Router - Record-based payroll management - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import uuid
import re

from db.dependencies import get_db
from models.payroll import Payroll
from models.employee import Employee
from models.enums import PayrollStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/payroll", tags=["Payroll"])


# ============ SCHEMAS ============

class PayrollCreate(BaseModel):
    payroll_month: str          # YYYY-MM format
    employee_id: UUID
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
    id: UUID
    org_id: UUID
    payroll_id: str
    payroll_month: str
    employee_id: UUID
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    base_salary: float
    allowances: float
    deductions: float
    overtime: float
    net_pay: float
    status: PayrollStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class PayrollListResponse(BaseModel):
    payrolls: List[PayrollResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BulkPayrollItem(BaseModel):
    employee_id: UUID
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
            raise ValueError('payroll_month must be YYYY-MM format (e.g. 2026-03)')
        return v


class BulkPayrollResponse(BaseModel):
    created: int
    skipped: int
    errors: List[str]


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_payroll_id(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing payroll ID like PAY0001"""
    result = await db.execute(
        select(Payroll.payroll_id)
        .where(Payroll.org_id == org_id)
        .where(Payroll.payroll_id.like("PAY%"))
        .order_by(Payroll.payroll_id.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("PAY", ""))
            return f"PAY{str(num + 1).zfill(4)}"
        except ValueError:
            return "PAY0001"
    return "PAY0001"


def calculate_net_pay(base: float, allowances: float, overtime: float, deductions: float) -> float:
    """Calculate net pay"""
    return base + allowances + overtime - deductions


# ============ CRUD ENDPOINTS ============

@router.post("/", response_model=PayrollResponse, status_code=status.HTTP_201_CREATED)
async def create_payroll(
    payroll: PayrollCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a new payroll record"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify employee exists
    emp_result = await  db.execute(
        select(Employee).where(Employee.id == payroll.employee_id, Employee.org_id == org_id)
    )
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check for duplicate (one payroll per employee per month)
    dup_result = await db.execute(
        select(Payroll).where(
            Payroll.org_id == org_id,
            Payroll.employee_id == payroll.employee_id,
            Payroll.payroll_month == payroll.payroll_month
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Payroll for this employee and month already exists")

    # Generate payroll ID
    payroll_id = await generate_payroll_id(db, org_id)

    # Calculate net pay
    net_pay = calculate_net_pay(
        payroll.base_salary,
        payroll.allowances,
        payroll.overtime,
        payroll.deductions
    )

    # Create payroll
    new_payroll = Payroll(
        org_id=org_id,
        payroll_id=payroll_id,
        net_pay=net_pay,
        created_by=user_id,
        **payroll.model_dump()
    )

    db.add(new_payroll)
    await db.commit()
    await db.refresh(new_payroll)

    # Build response
    response_data = PayrollResponse.model_validate(new_payroll)
    response_data.employee_name = f"{employee.first_name} {employee.last_name}"
    response_data.employee_code = employee.employee_id

    return response_data


@router.get("/", response_model=PayrollListResponse)
async def get_payrolls(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    month: Optional[str] = None,
    status_filter: Optional[PayrollStatus] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all payrolls with pagination and filters"""
    org_id = UUID(token_data.get("org_id"))

    # Base query
    query = select(Payroll).where(Payroll.org_id == org_id)

    # Apply filters
    if month:
        query = query.where(Payroll.payroll_month == month)
    if status_filter:
        query = query.where(Payroll.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Payroll.payroll_month.desc(), Payroll.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    payrolls = result.scalars().all()

    # Enrich with employee details
    payroll_responses = []
    for payroll in payrolls:
        emp_result = await db.execute(
            select(Employee).where(Employee.id == payroll.employee_id)
        )
        employee = emp_result.scalar_one_or_none()

        response_data = PayrollResponse.model_validate(payroll)
        if employee:
            response_data.employee_name = f"{employee.first_name} {employee.last_name}"
            response_data.employee_code = employee.employee_id

        payroll_responses.append(response_data)

    return PayrollListResponse(
        payrolls=payroll_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{payroll_id}", response_model=PayrollResponse)
async def get_payroll(
    payroll_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get a single payroll by ID"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Payroll).where(Payroll.id == payroll_id, Payroll.org_id == org_id)
    )
    payroll = result.scalar_one_or_none()

    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    # Get employee details
    emp_result = await db.execute(
        select(Employee).where(Employee.id == payroll.employee_id)
    )
    employee = emp_result.scalar_one_or_none()

    response_data = PayrollResponse.model_validate(payroll)
    if employee:
        response_data.employee_name = f"{employee.first_name} {employee.last_name}"
        response_data.employee_code = employee.employee_id

    return response_data


@router.put("/{payroll_id}", response_model=PayrollResponse)
async def update_payroll(
    payroll_id: UUID,
    payroll_update: PayrollUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update a payroll"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Payroll).where(Payroll.id == payroll_id, Payroll.org_id == org_id)
    )
    payroll = result.scalar_one_or_none()

    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    # Update fields
    update_data = payroll_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payroll, field, value)

    # Recalculate net pay
    payroll.net_pay = calculate_net_pay(
        payroll.base_salary,
        payroll.allowances,
        payroll.overtime,
        payroll.deductions
    )

    await db.commit()
    await db.refresh(payroll)

    # Get employee details
    emp_result = await db.execute(
        select(Employee).where(Employee.id == payroll.employee_id)
    )
    employee = emp_result.scalar_one_or_none()

    response_data = PayrollResponse.model_validate(payroll)
    if employee:
        response_data.employee_name = f"{employee.first_name} {employee.last_name}"
        response_data.employee_code = employee.employee_id

    return response_data


@router.delete("/{payroll_id}", response_model=MessageResponse)
async def delete_payroll(
    payroll_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a payroll (only draft payrolls can be deleted)"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Payroll).where(Payroll.id == payroll_id, Payroll.org_id == org_id)
    )
    payroll = result.scalar_one_or_none()

    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    if payroll.status != PayrollStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft payrolls can be deleted")

    await db.delete(payroll)
    await db.commit()

    return MessageResponse(message="Payroll deleted successfully")


@router.post("/bulk", response_model=BulkPayrollResponse)
async def create_bulk_payroll(
    bulk_data: BulkPayrollCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create multiple payroll records at once"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    created = 0
    skipped = 0
    errors = []

    for entry in bulk_data.entries:
        try:
            # Check if employee exists
            emp_result = await db.execute(
                select(Employee).where(Employee.id == entry.employee_id, Employee.org_id == org_id)
            )
            if not emp_result.scalar_one_or_none():
                errors.append(f"Employee {entry.employee_id} not found")
                skipped += 1
                continue

            # Check for duplicate
            dup_result = await db.execute(
                select(Payroll).where(
                    Payroll.org_id == org_id,
                    Payroll.employee_id == entry.employee_id,
                    Payroll.payroll_month == bulk_data.payroll_month
                )
            )
            if dup_result.scalar_one_or_none():
                errors.append(f"Payroll already exists for employee {entry.employee_id}")
                skipped += 1
                continue

            # Generate payroll ID
            payroll_id = await generate_payroll_id(db, org_id)

            # Calculate net pay
            net_pay = calculate_net_pay(
                entry.base_salary,
                entry.allowances,
                entry.overtime,
                entry.deductions
            )

            # Create payroll
            new_payroll = Payroll(
                org_id=org_id,
                payroll_id=payroll_id,
                payroll_month=bulk_data.payroll_month,
                employee_id=entry.employee_id,
                base_salary=entry.base_salary,
                allowances=entry.allowances,
                deductions=entry.deductions,
                overtime=entry.overtime,
                net_pay=net_pay,
                status=bulk_data.status,
                notes=entry.notes,
                created_by=user_id
            )

            db.add(new_payroll)
            created += 1

        except Exception as e:
            errors.append(f"Error processing employee {entry.employee_id}: {str(e)}")
            skipped += 1

    await db.commit()

    return BulkPayrollResponse(
        created=created,
        skipped=skipped,
        errors=errors
    )
