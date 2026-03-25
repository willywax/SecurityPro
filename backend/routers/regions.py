"""Regions router — CRUD + transfer endpoint."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

from db.dependencies import get_db
from models.zone import Zone, Region, RegionTransfer
from models.employee import Employee
from models.site import Site
from models.enums import RegionStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/regions", tags=["Regions"])


# ============ SCHEMAS ============

class RegionCreate(BaseModel):
    zone_id: UUID
    region_name: str
    notes: Optional[str] = None
    status: RegionStatus = RegionStatus.ACTIVE


class RegionUpdate(BaseModel):
    region_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[RegionStatus] = None


class RegionTransferCreate(BaseModel):
    new_zone_id: UUID
    notes: Optional[str] = None


class EmployeeSummary(BaseModel):
    id: UUID
    employee_id: str
    full_name: str
    job_title: Optional[str] = None


class SiteSummary(BaseModel):
    id: UUID
    site_id: str
    site_name: str
    status: str


class TransferHistoryResponse(BaseModel):
    id: UUID
    from_zone_id: Optional[UUID] = None
    from_zone_name: Optional[str] = None
    to_zone_id: Optional[UUID] = None
    to_zone_name: Optional[str] = None
    transferred_date: date
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RegionResponse(BaseModel):
    id: UUID
    zone_id: UUID
    zone_name: Optional[str] = None
    region_name: str
    notes: Optional[str] = None
    status: RegionStatus
    created_at: datetime
    employee_count: int = 0
    site_count: int = 0
    employees: List[EmployeeSummary] = []
    sites: List[SiteSummary] = []
    transfer_history: List[TransferHistoryResponse] = []

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def _build_region_response(region: Region, db: AsyncSession, include_lists: bool = False) -> dict:
    zone_result = await db.execute(select(Zone).where(Zone.id == region.zone_id))
    zone = zone_result.scalar_one_or_none()

    emp_count_result = await db.execute(
        select(func.count()).select_from(Employee).where(Employee.region_id == region.id)
    )
    employee_count = emp_count_result.scalar_one() or 0

    site_count_result = await db.execute(
        select(func.count()).select_from(Site).where(Site.region_id == region.id)
    )
    site_count = site_count_result.scalar_one() or 0

    employees = []
    sites = []
    transfer_history = []

    if include_lists:
        emp_result = await db.execute(
            select(Employee).where(Employee.region_id == region.id).order_by(Employee.first_name)
        )
        for emp in emp_result.scalars().all():
            employees.append({
                "id": emp.id,
                "employee_id": emp.employee_id,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "job_title": emp.job_title,
            })

        site_result = await db.execute(
            select(Site).where(Site.region_id == region.id).order_by(Site.site_name)
        )
        for s in site_result.scalars().all():
            sites.append({
                "id": s.id,
                "site_id": s.site_id,
                "site_name": s.site_name,
                "status": s.status.value if hasattr(s.status, "value") else s.status,
            })

        transfer_result = await db.execute(
            select(RegionTransfer)
            .where(RegionTransfer.region_id == region.id)
            .order_by(RegionTransfer.transferred_date.desc())
        )
        for tr in transfer_result.scalars().all():
            from_zone_name = None
            to_zone_name = None
            if tr.from_zone_id:
                fz = await db.execute(select(Zone.zone_name).where(Zone.id == tr.from_zone_id))
                from_zone_name = fz.scalar_one_or_none()
            if tr.to_zone_id:
                tz = await db.execute(select(Zone.zone_name).where(Zone.id == tr.to_zone_id))
                to_zone_name = tz.scalar_one_or_none()
            transfer_history.append({
                "id": tr.id,
                "from_zone_id": tr.from_zone_id,
                "from_zone_name": from_zone_name,
                "to_zone_id": tr.to_zone_id,
                "to_zone_name": to_zone_name,
                "transferred_date": tr.transferred_date,
                "notes": tr.notes,
                "created_at": tr.created_at,
            })

    return {
        "id": region.id,
        "zone_id": region.zone_id,
        "zone_name": zone.zone_name if zone else None,
        "region_name": region.region_name,
        "notes": region.notes,
        "status": region.status,
        "created_at": region.created_at,
        "employee_count": employee_count,
        "site_count": site_count,
        "employees": employees,
        "sites": sites,
        "transfer_history": transfer_history,
    }


# ============ ENDPOINTS ============

@router.get("/test")
async def test_regions():
    return {"message": "Regions router is working"}

@router.get("", response_model=List[RegionResponse])
async def list_regions(
    zone_id: Optional[UUID] = Query(None),
    status_filter: Optional[RegionStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])

    query = select(Region).where(Region.org_id == org_id)
    if zone_id:
        query = query.where(Region.zone_id == zone_id)
    if status_filter:
        query = query.where(Region.status == status_filter)

    result = await db.execute(query.order_by(Region.region_name))
    regions = result.scalars().all()
    return [await _build_region_response(region, db) for region in regions]


@router.post("", response_model=RegionResponse, status_code=status.HTTP_201_CREATED)
async def create_region(
    payload: RegionCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])

    # Verify zone belongs to org
    zone_result = await db.execute(select(Zone).where(Zone.id == payload.zone_id, Zone.org_id == org_id))
    if not zone_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Zone not found")

    region = Region(org_id=org_id, created_by=user_id, **payload.model_dump())
    db.add(region)
    await db.commit()
    await db.refresh(region)
    return await _build_region_response(region, db)


@router.get("/{region_id}", response_model=RegionResponse)
async def get_region(
    region_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(select(Region).where(Region.id == region_id, Region.org_id == org_id))
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return await _build_region_response(region, db, include_lists=True)


@router.put("/{region_id}", response_model=RegionResponse)
async def update_region(
    region_id: UUID,
    payload: RegionUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(select(Region).where(Region.id == region_id, Region.org_id == org_id))
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(region, field, value)
    await db.commit()
    await db.refresh(region)
    return await _build_region_response(region, db, include_lists=True)


@router.delete("/{region_id}", response_model=MessageResponse)
async def delete_region(
    region_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(select(Region).where(Region.id == region_id, Region.org_id == org_id))
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")

    # Block deletion if employees or sites are assigned
    emp_count = (await db.execute(
        select(func.count()).select_from(Employee).where(Employee.region_id == region_id)
    )).scalar_one() or 0
    site_count = (await db.execute(
        select(func.count()).select_from(Site).where(Site.region_id == region_id)
    )).scalar_one() or 0

    if emp_count > 0 or site_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete region with {emp_count} employee(s) and {site_count} site(s) assigned",
        )

    await db.delete(region)
    await db.commit()
    return MessageResponse(message="Region deleted successfully")


@router.post("/{region_id}/transfer", response_model=RegionResponse)
async def transfer_region(
    region_id: UUID,
    payload: RegionTransferCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Move a region to a new zone. All employees and sites follow automatically."""
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])

    result = await db.execute(select(Region).where(Region.id == region_id, Region.org_id == org_id))
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")

    new_zone_result = await db.execute(
        select(Zone).where(Zone.id == payload.new_zone_id, Zone.org_id == org_id)
    )
    if not new_zone_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Target zone not found")

    old_zone_id = region.zone_id

    if old_zone_id == payload.new_zone_id:
        raise HTTPException(status_code=400, detail="Region is already in the target zone")

    # Log the transfer
    transfer = RegionTransfer(
        org_id=org_id,
        region_id=region_id,
        from_zone_id=old_zone_id,
        to_zone_id=payload.new_zone_id,
        transferred_date=date.today(),
        transferred_by=user_id,
        notes=payload.notes,
        created_by=user_id,
    )
    db.add(transfer)

    # Update the region's zone
    region.zone_id = payload.new_zone_id
    await db.commit()
    await db.refresh(region)
    return await _build_region_response(region, db, include_lists=True)
