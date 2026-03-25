# Store Router

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

from db.dependencies import get_db
from models.inventory import Store, InventoryItem
from models.employee import Employee
from utils.auth import get_token_data

router = APIRouter(prefix="/store", tags=["Store"])


class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    manager_id: Optional[UUID] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class StoreResponse(BaseModel):
    id: UUID
    org_id: UUID
    store_name: str
    location: Optional[str] = None
    address: Optional[str] = None
    manager_id: Optional[UUID] = None
    manager_name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    # Summary
    total_item_types: int = 0
    total_units: int = 0
    total_issued: int = 0
    total_value: float = 0.0

    class Config:
        from_attributes = True


async def enrich_store(db: AsyncSession, store: Store) -> StoreResponse:
    data = StoreResponse.model_validate(store)
    if store.manager_id:
        emp = (await db.execute(
            select(Employee).where(Employee.id == store.manager_id)
        )).scalar_one_or_none()
        if emp:
            data.manager_name = f"{emp.first_name} {emp.last_name}"

    # Summary stats
    items_result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.store_id == store.id,
            InventoryItem.status == "active",
        )
    )
    items = items_result.scalars().all()
    data.total_item_types = len(items)
    data.total_units = sum(i.current_count for i in items)
    data.total_issued = sum(i.issued_count for i in items)
    data.total_value = sum((i.unit_cost or 0) * i.current_count for i in items)
    return data


@router.get("", response_model=StoreResponse)
async def get_store(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(Store).where(Store.org_id == org_id).limit(1)
    )
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return await enrich_store(db, store)


@router.patch("", response_model=StoreResponse)
async def update_store(
    data: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(Store).where(Store.org_id == org_id).limit(1)
    )
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(store, field, value)
    await db.commit()
    await db.refresh(store)
    return await enrich_store(db, store)
