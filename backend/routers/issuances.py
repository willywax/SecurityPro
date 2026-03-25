# Issuances Router - issue assets and process returns

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from db.dependencies import get_db
from models.inventory import InventoryItem, InventoryIssuance, InventoryTransaction
from models.employee import Employee
from models.site import Site
from utils.auth import get_token_data

router = APIRouter(prefix="/issuances", tags=["Issuances"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class IssueRequest(BaseModel):
    item_id: UUID
    issued_to_type: str          # employee|site
    issued_to_id: UUID
    quantity: int
    issue_date: date
    expected_return_date: Optional[date] = None
    issue_condition: str         # good|fair|poor
    issued_by: Optional[UUID] = None
    notes: Optional[str] = None


class ReturnRequest(BaseModel):
    quantity_returned: int
    return_condition: str        # good|fair|poor|damaged|lost
    actual_return_date: Optional[date] = None
    return_received_by: Optional[UUID] = None
    notes: Optional[str] = None


class IssuanceResponse(BaseModel):
    id: UUID
    org_id: UUID
    item_id: UUID
    item_name: Optional[str] = None
    asset_type_name: Optional[str] = None
    issued_to_type: str
    issued_to_id: Optional[UUID] = None
    issued_to_name: str
    quantity_issued: int
    quantity_returned: int
    issue_date: date
    expected_return_date: Optional[date] = None
    actual_return_date: Optional[date] = None
    issue_condition: str
    return_condition: Optional[str] = None
    issued_by: Optional[UUID] = None
    return_received_by: Optional[UUID] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    is_overdue: bool = False

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

async def enrich_issuance(db: AsyncSession, iss: InventoryIssuance) -> IssuanceResponse:
    r = IssuanceResponse.model_validate(iss)
    # Item name
    item = (await db.execute(select(InventoryItem).where(InventoryItem.id == iss.item_id))).scalar_one_or_none()
    if item:
        r.item_name = item.item_name
        from models.inventory import AssetType
        at = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
        if at:
            r.asset_type_name = at.type_name
    # Overdue check
    if iss.expected_return_date and iss.status == "active":
        r.is_overdue = iss.expected_return_date < date.today()
    return r


# ── Issue ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=IssuanceResponse, status_code=status.HTTP_201_CREATED)
async def issue_asset(
    data: IssueRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    item_result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == data.item_id, InventoryItem.org_id == org_id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    available = item.current_count - item.issued_count
    if data.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=f"Only {available} units available. Cannot issue {data.quantity}.",
        )
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    # Resolve recipient name (snapshot)
    issued_to_name = "Unknown"
    if data.issued_to_type == "employee":
        emp = (
            await db.execute(
                select(Employee).where(Employee.id == data.issued_to_id, Employee.org_id == org_id)
            )
        ).scalar_one_or_none()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        issued_to_name = f"{emp.first_name} {emp.last_name}"
    elif data.issued_to_type == "site":
        site = (
            await db.execute(select(Site).where(Site.id == data.issued_to_id, Site.org_id == org_id))
        ).scalar_one_or_none()
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")
        issued_to_name = site.site_name
    else:
        raise HTTPException(status_code=400, detail="issued_to_type must be 'employee' or 'site'")

    item.issued_count += data.quantity

    issuance = InventoryIssuance(
        org_id=org_id,
        item_id=item.id,
        issued_to_type=data.issued_to_type,
        issued_to_id=data.issued_to_id,
        issued_to_name=issued_to_name,
        quantity_issued=data.quantity,
        quantity_returned=0,
        issue_date=data.issue_date,
        expected_return_date=data.expected_return_date,
        issue_condition=data.issue_condition,
        issued_by=data.issued_by,
        status="active",
        notes=data.notes,
        created_by=UUID(token_data["sub"]),
    )
    db.add(issuance)
    await db.flush()

    txn = InventoryTransaction(
        org_id=org_id,
        item_id=item.id,
        transaction_type="issue",
        quantity=data.quantity,
        direction="out",
        reference_type=data.issued_to_type,
        reference_id=data.issued_to_id,
        reference_name=issued_to_name,
        transaction_date=data.issue_date,
        notes=data.notes,
        created_by=UUID(token_data["sub"]),
    )
    db.add(txn)
    await db.commit()
    await db.refresh(issuance)
    return await enrich_issuance(db, issuance)


# ── Return ────────────────────────────────────────────────────────────────────

@router.post("/{issuance_id}/return", response_model=IssuanceResponse)
async def return_asset(
    issuance_id: UUID,
    data: ReturnRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(InventoryIssuance).where(
            InventoryIssuance.id == issuance_id,
            InventoryIssuance.org_id == org_id,
        )
    )
    issuance = result.scalar_one_or_none()
    if not issuance:
        raise HTTPException(status_code=404, detail="Issuance not found")
    if issuance.status in ("fully_returned", "lost"):
        raise HTTPException(status_code=400, detail=f"Issuance already {issuance.status}")

    outstanding = issuance.quantity_issued - issuance.quantity_returned
    if data.quantity_returned <= 0 or data.quantity_returned > outstanding:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid return quantity. Outstanding: {outstanding}",
        )

    item_result = await db.execute(select(InventoryItem).where(InventoryItem.id == issuance.item_id))
    item = item_result.scalar_one_or_none()
    if item:
        item.issued_count = max(0, item.issued_count - data.quantity_returned)

    issuance.quantity_returned += data.quantity_returned
    issuance.return_condition = data.return_condition
    issuance.actual_return_date = data.actual_return_date or date.today()
    issuance.return_received_by = data.return_received_by

    if issuance.quantity_returned >= issuance.quantity_issued:
        issuance.status = "fully_returned"
    else:
        issuance.status = "partially_returned"

    txn = InventoryTransaction(
        org_id=org_id,
        item_id=issuance.item_id,
        transaction_type="return",
        quantity=data.quantity_returned,
        direction="in",
        reference_type=issuance.issued_to_type,
        reference_id=issuance.issued_to_id,
        reference_name=issuance.issued_to_name,
        transaction_date=issuance.actual_return_date,
        notes=data.notes,
        created_by=UUID(token_data["sub"]),
    )
    db.add(txn)
    await db.commit()
    await db.refresh(issuance)
    return await enrich_issuance(db, issuance)


# ── List all issuances ────────────────────────────────────────────────────────

@router.get("", response_model=List[IssuanceResponse])
async def list_issuances(
    status_filter: Optional[str] = None,
    issued_to_type: Optional[str] = None,
    item_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    query = select(InventoryIssuance).where(InventoryIssuance.org_id == org_id)
    if status_filter:
        query = query.where(InventoryIssuance.status == status_filter)
    if issued_to_type:
        query = query.where(InventoryIssuance.issued_to_type == issued_to_type)
    if item_id:
        query = query.where(InventoryIssuance.item_id == item_id)
    query = query.order_by(InventoryIssuance.issue_date.desc())
    result = await db.execute(query)
    issuances = result.scalars().all()
    return [await enrich_issuance(db, iss) for iss in issuances]
