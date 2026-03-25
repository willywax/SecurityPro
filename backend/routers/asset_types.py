# Asset Types Router

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from db.dependencies import get_db
from models.inventory import AssetType, InventoryItem
from utils.auth import get_token_data

router = APIRouter(prefix="/asset-types", tags=["Asset Types"])


class AssetTypeCreate(BaseModel):
    type_name: str
    description: Optional[str] = None


class AssetTypeUpdate(BaseModel):
    type_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class AssetTypeResponse(BaseModel):
    id: UUID
    org_id: UUID
    type_name: str
    description: Optional[str] = None
    is_custom: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[AssetTypeResponse])
async def list_asset_types(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(AssetType)
        .where(AssetType.org_id == org_id)
        .order_by(AssetType.is_custom, AssetType.type_name)
    )
    return result.scalars().all()


@router.post("", response_model=AssetTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_asset_type(
    data: AssetTypeCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    new_type = AssetType(
        org_id=org_id,
        type_name=data.type_name,
        description=data.description,
        is_custom=True,
        status="active",
        created_by=user_id,
    )
    db.add(new_type)
    await db.commit()
    await db.refresh(new_type)
    return new_type


@router.patch("/{type_id}", response_model=AssetTypeResponse)
async def update_asset_type(
    type_id: UUID,
    data: AssetTypeUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(AssetType).where(AssetType.id == type_id, AssetType.org_id == org_id)
    )
    asset_type = result.scalar_one_or_none()
    if not asset_type:
        raise HTTPException(status_code=404, detail="Asset type not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(asset_type, field, value)
    await db.commit()
    await db.refresh(asset_type)
    return asset_type


@router.delete("/{type_id}")
async def delete_asset_type(
    type_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(AssetType).where(AssetType.id == type_id, AssetType.org_id == org_id)
    )
    asset_type = result.scalar_one_or_none()
    if not asset_type:
        raise HTTPException(status_code=404, detail="Asset type not found")
    # Block delete if items exist
    count_result = await db.execute(
        select(func.count()).select_from(InventoryItem)
        .where(InventoryItem.asset_type_id == type_id)
    )
    if (count_result.scalar() or 0) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete asset type while inventory items are using it",
        )
    await db.delete(asset_type)
    await db.commit()
    return {"message": "Asset type deleted"}
