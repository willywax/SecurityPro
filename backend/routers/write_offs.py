# Write-off Register Router

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from db.dependencies import get_db
from models.inventory import WrittenOffRegister, InventoryItem, AssetType
from utils.auth import get_token_data

router = APIRouter(prefix="/write-offs", tags=["Write-offs"])


class WriteOffResponse:
    pass


@router.get("")
async def list_write_offs(
    item_id: Optional[UUID] = None,
    reason: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    query = select(WrittenOffRegister).where(WrittenOffRegister.org_id == org_id)
    if item_id:
        query = query.where(WrittenOffRegister.item_id == item_id)
    if reason:
        query = query.where(WrittenOffRegister.reason == reason)
    if date_from:
        query = query.where(WrittenOffRegister.write_off_date >= date_from)
    if date_to:
        query = query.where(WrittenOffRegister.write_off_date <= date_to)
    query = query.order_by(WrittenOffRegister.write_off_date.desc())
    result = await db.execute(query)
    write_offs = result.scalars().all()

    # Enrich with item names
    item_ids = {w.item_id for w in write_offs}
    item_map = {}
    type_map = {}
    if item_ids:
        ir = await db.execute(select(InventoryItem).where(InventoryItem.id.in_(item_ids)))
        items = ir.scalars().all()
        item_map = {i.id: i for i in items}
        type_ids = {i.asset_type_id for i in items}
        if type_ids:
            tr = await db.execute(select(AssetType).where(AssetType.id.in_(type_ids)))
            type_map = {t.id: t.type_name for t in tr.scalars().all()}

    total_value = 0.0
    rows = []
    for w in write_offs:
        item = item_map.get(w.item_id)
        item_name = item.item_name if item else "Unknown"
        asset_type_name = type_map.get(item.asset_type_id) if item else None
        unit_cost = item.unit_cost if item else 0
        value = (unit_cost or 0) * w.quantity
        total_value += value
        rows.append({
            "id": str(w.id),
            "item_id": str(w.item_id),
            "item_name": item_name,
            "asset_type_name": asset_type_name,
            "quantity": w.quantity,
            "unit_cost": unit_cost,
            "value": value,
            "write_off_date": str(w.write_off_date),
            "reason": w.reason,
            "reason_details": w.reason_details,
            "reference_issuance_id": str(w.reference_issuance_id) if w.reference_issuance_id else None,
            "created_at": str(w.created_at),
        })

    return {"write_offs": rows, "total": len(rows), "total_value": total_value}
