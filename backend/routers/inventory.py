# Inventory Router - items + receive / write-off / adjust

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from db.dependencies import get_db
from models.inventory import (
    AssetType, Store, InventoryItem,
    InventoryTransaction, InventoryIssuance, WrittenOffRegister,
)
from models.auth import User
from utils.auth import get_token_data

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ItemCreate(BaseModel):
    asset_type_id: UUID
    item_name: str
    description: Optional[str] = None
    unit_cost: Optional[float] = None
    initial_count: int = 0
    notes: Optional[str] = None


class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    unit_cost: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ItemResponse(BaseModel):
    id: UUID
    org_id: UUID
    store_id: UUID
    asset_type_id: UUID
    asset_type_name: Optional[str] = None
    item_name: str
    description: Optional[str] = None
    unit_cost: Optional[float] = None
    current_count: int
    issued_count: int
    available_count: int
    written_off_count: int
    total_value: float
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ItemListResponse(BaseModel):
    items: List[ItemResponse]
    total: int


class ReceiveRequest(BaseModel):
    quantity: int
    unit_cost: Optional[float] = None
    transaction_date: date
    supplier: Optional[str] = None
    notes: Optional[str] = None


class WriteOffRequest(BaseModel):
    quantity: int
    reason: str          # damaged|lost|expired|obsolete|other
    reason_details: str
    write_off_date: date
    reference_issuance_id: Optional[UUID] = None
    approved_by: Optional[UUID] = None


class AdjustRequest(BaseModel):
    quantity: int
    direction: str       # in|out
    reason: str
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    item_id: UUID
    transaction_type: str
    quantity: int
    direction: str
    reference_type: Optional[str] = None
    reference_name: Optional[str] = None
    transaction_date: date
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def to_item_response(item: InventoryItem, asset_type_name: Optional[str] = None) -> ItemResponse:
    available = max(0, item.current_count - item.issued_count)
    total_value = (item.unit_cost or 0) * item.current_count
    return ItemResponse.model_validate(
        {
            "id": item.id,
            "org_id": item.org_id,
            "store_id": item.store_id,
            "asset_type_id": item.asset_type_id,
            "asset_type_name": asset_type_name,
            "item_name": item.item_name,
            "description": item.description,
            "unit_cost": item.unit_cost,
            "current_count": item.current_count,
            "issued_count": item.issued_count,
            "available_count": available,
            "written_off_count": item.written_off_count,
            "total_value": total_value,
            "notes": item.notes,
            "status": item.status,
            "created_at": item.created_at,
        }
    )


async def get_item_or_404(db: AsyncSession, item_id: UUID, org_id: UUID) -> InventoryItem:
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.org_id == org_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


async def get_store(db: AsyncSession, org_id: UUID) -> Store:
    result = await db.execute(select(Store).where(Store.org_id == org_id).limit(1))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not configured")
    return store


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ItemListResponse)
async def list_items(
    asset_type_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    query = select(InventoryItem).where(InventoryItem.org_id == org_id)
    if asset_type_id:
        query = query.where(InventoryItem.asset_type_id == asset_type_id)
    if status_filter:
        query = query.where(InventoryItem.status == status_filter)
    query = query.order_by(InventoryItem.item_name)
    result = await db.execute(query)
    items = result.scalars().all()

    # Fetch all asset types in one pass
    type_ids = {i.asset_type_id for i in items}
    type_map = {}
    if type_ids:
        tr = await db.execute(select(AssetType).where(AssetType.id.in_(type_ids)))
        type_map = {t.id: t.type_name for t in tr.scalars().all()}

    responses = [to_item_response(i, type_map.get(i.asset_type_id)) for i in items]
    return ItemListResponse(items=responses, total=len(responses))


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ItemCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    store = await get_store(db, org_id)

    # Verify asset type exists
    at_result = await db.execute(
        select(AssetType).where(AssetType.id == data.asset_type_id, AssetType.org_id == org_id)
    )
    asset_type = at_result.scalar_one_or_none()
    if not asset_type:
        raise HTTPException(status_code=404, detail="Asset type not found")

    item = InventoryItem(
        org_id=org_id,
        store_id=store.id,
        asset_type_id=data.asset_type_id,
        item_name=data.item_name,
        description=data.description,
        unit_cost=data.unit_cost,
        current_count=0,
        issued_count=0,
        written_off_count=0,
        notes=data.notes,
        status="active",
        created_by=user_id,
    )
    db.add(item)
    await db.flush()

    if data.initial_count > 0:
        item.current_count = data.initial_count
        txn = InventoryTransaction(
            org_id=org_id,
            item_id=item.id,
            transaction_type="receive",
            quantity=data.initial_count,
            direction="in",
            reference_type="adjustment",
            reference_name="Initial stock",
            transaction_date=date.today(),
            notes="Initial stock on item creation",
            created_by=user_id,
        )
        db.add(txn)

    await db.commit()
    await db.refresh(item)
    return to_item_response(item, asset_type.type_name)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    item = await get_item_or_404(db, item_id, org_id)
    at = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
    return to_item_response(item, at.type_name if at else None)


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID,
    data: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    item = await get_item_or_404(db, item_id, org_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    at = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
    return to_item_response(item, at.type_name if at else None)


@router.delete("/{item_id}")
async def delete_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    item = await get_item_or_404(db, item_id, org_id)
    if item.current_count != 0 or item.issued_count != 0:
        raise HTTPException(status_code=400, detail="Cannot delete item while stock count > 0")
    await db.delete(item)
    await db.commit()
    return {"message": "Item deleted"}


# ── Receive ───────────────────────────────────────────────────────────────────

@router.post("/{item_id}/receive", response_model=ItemResponse)
async def receive_stock(
    item_id: UUID,
    data: ReceiveRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    item = await get_item_or_404(db, item_id, org_id)

    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    item.current_count += data.quantity
    if data.unit_cost is not None:
        item.unit_cost = data.unit_cost

    txn = InventoryTransaction(
        org_id=org_id,
        item_id=item.id,
        transaction_type="receive",
        quantity=data.quantity,
        direction="in",
        reference_type="supplier",
        reference_name=data.supplier,
        transaction_date=data.transaction_date,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(item)
    at = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
    return to_item_response(item, at.type_name if at else None)


# ── Write-off ─────────────────────────────────────────────────────────────────

@router.post("/{item_id}/write-off", response_model=ItemResponse)
async def write_off(
    item_id: UUID,
    data: WriteOffRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    item = await get_item_or_404(db, item_id, org_id)

    available = item.current_count - item.issued_count
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    if data.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot write off {data.quantity}. Only {available} available units.",
        )

    item.current_count -= data.quantity
    item.written_off_count += data.quantity

    # If linked to an issuance, mark it lost
    if data.reference_issuance_id:
        iss_result = await db.execute(
            select(InventoryIssuance).where(InventoryIssuance.id == data.reference_issuance_id)
        )
        issuance = iss_result.scalar_one_or_none()
        if issuance and issuance.status == "active":
            issuance.status = "lost"
            item.issued_count = max(0, item.issued_count - issuance.quantity_issued)

    register = WrittenOffRegister(
        org_id=org_id,
        item_id=item.id,
        quantity=data.quantity,
        write_off_date=data.write_off_date,
        reason=data.reason,
        reason_details=data.reason_details,
        written_off_by=user_id,
        approved_by=data.approved_by,
        reference_issuance_id=data.reference_issuance_id,
        created_by=user_id,
    )
    db.add(register)

    txn = InventoryTransaction(
        org_id=org_id,
        item_id=item.id,
        transaction_type="write_off",
        quantity=data.quantity,
        direction="out",
        reference_type="adjustment",
        reference_name=data.reason,
        transaction_date=data.write_off_date,
        notes=data.reason_details,
        created_by=user_id,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(item)
    at = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
    return to_item_response(item, at.type_name if at else None)


# ── Adjust ────────────────────────────────────────────────────────────────────

@router.post("/{item_id}/adjust", response_model=ItemResponse)
async def adjust_stock(
    item_id: UUID,
    data: AdjustRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    item = await get_item_or_404(db, item_id, org_id)

    if data.direction not in ("in", "out"):
        raise HTTPException(status_code=400, detail="direction must be 'in' or 'out'")
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    if data.direction == "in":
        item.current_count += data.quantity
    else:
        available = item.current_count - item.issued_count
        if data.quantity > available:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot remove {data.quantity}. Only {available} available.",
            )
        item.current_count -= data.quantity

    txn = InventoryTransaction(
        org_id=org_id,
        item_id=item.id,
        transaction_type="adjustment",
        quantity=data.quantity,
        direction=data.direction,
        reference_type="adjustment",
        reference_name=data.reason,
        transaction_date=date.today(),
        notes=data.notes,
        created_by=user_id,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(item)
    at = (await db.execute(select(AssetType).where(AssetType.id == item.asset_type_id))).scalar_one_or_none()
    return to_item_response(item, at.type_name if at else None)


# ── Transaction history ───────────────────────────────────────────────────────

@router.get("/{item_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    await get_item_or_404(db, item_id, org_id)
    result = await db.execute(
        select(InventoryTransaction)
        .where(InventoryTransaction.item_id == item_id)
        .order_by(InventoryTransaction.transaction_date.desc(), InventoryTransaction.created_at.desc())
    )
    return result.scalars().all()


# ── Issuances for item ────────────────────────────────────────────────────────

@router.get("/{item_id}/issuances")
async def get_item_issuances(
    item_id: UUID,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    await get_item_or_404(db, item_id, org_id)
    query = select(InventoryIssuance).where(InventoryIssuance.item_id == item_id)
    if status_filter:
        query = query.where(InventoryIssuance.status == status_filter)
    query = query.order_by(InventoryIssuance.issue_date.desc())
    result = await db.execute(query)
    issuances = result.scalars().all()
    return [
        {
            "id": str(i.id),
            "issued_to_type": i.issued_to_type,
            "issued_to_name": i.issued_to_name,
            "quantity_issued": i.quantity_issued,
            "quantity_returned": i.quantity_returned,
            "issue_date": str(i.issue_date),
            "expected_return_date": str(i.expected_return_date) if i.expected_return_date else None,
            "actual_return_date": str(i.actual_return_date) if i.actual_return_date else None,
            "issue_condition": i.issue_condition,
            "return_condition": i.return_condition,
            "status": i.status,
            "notes": i.notes,
            "created_at": str(i.created_at),
        }
        for i in issuances
    ]
