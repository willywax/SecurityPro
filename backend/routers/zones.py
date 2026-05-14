"""Zones router — CRUD + manager assignment endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

from db.dependencies import get_db
from models.zone import Zone, ZoneManager, Region
from models.employee import Employee
from models.enums import ZoneStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/zones", tags=["Zones"])


# ============ SCHEMAS ============

class ZoneCreate(BaseModel):
    zone_name: str
    notes: Optional[str] = None
    status: ZoneStatus = ZoneStatus.ACTIVE


class ZoneUpdate(BaseModel):
    zone_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ZoneStatus] = None


class ManagerResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    assigned_date: date
    end_date: Optional[date] = None
    active: bool

    class Config:
        from_attributes = True


class ZoneResponse(BaseModel):
    id: UUID
    zone_name: str
    notes: Optional[str] = None
    status: ZoneStatus
    created_at: datetime
    region_count: int = 0
    employee_count: int = 0
    site_count: int = 0
    managers: List[ManagerResponse] = []

    class Config:
        from_attributes = True


class ZoneManagerCreate(BaseModel):
    employee_id: UUID
    assigned_date: date
    end_date: Optional[date] = None


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def _zone_summary(zone_id: UUID, org_id: UUID, db: AsyncSession) -> dict:
    """Return region_count, employee_count, site_count for a zone."""
    region_ids_result = await db.execute(
        select(Region.id).where(Region.zone_id == zone_id, Region.org_id == org_id)
    )
    region_ids = [r[0] for r in region_ids_result.all()]
    region_count = len(region_ids)
    employee_count = 0
    site_count = 0
    if region_ids:
        from models.employee import Employee
        from models.site import Site
        emp_result = await db.execute(
            select(func.count()).select_from(Employee).where(
                Employee.region_id.in_(region_ids), Employee.org_id == org_id
            )
        )
        employee_count = emp_result.scalar_one() or 0
        site_result = await db.execute(
            select(func.count()).select_from(Site).where(
                Site.region_id.in_(region_ids), Site.org_id == org_id
            )
        )
        site_count = site_result.scalar_one() or 0
    return {"region_count": region_count, "employee_count": employee_count, "site_count": site_count}


async def _build_zone_response(zone: Zone, org_id: UUID, db: AsyncSession) -> dict:
    summary = await _zone_summary(zone.id, org_id, db)
    managers_result = await db.execute(
        select(ZoneManager, Employee).join(Employee, ZoneManager.employee_id == Employee.id).where(
            ZoneManager.zone_id == zone.id
        )
    )
    managers = []
    for zm, emp in managers_result.all():
        managers.append({
            "id": zm.id,
            "employee_id": zm.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "assigned_date": zm.assigned_date,
            "end_date": zm.end_date,
            "active": zm.active,
        })
    return {
        "id": zone.id,
        "zone_name": zone.zone_name,
        "notes": zone.notes,
        "status": zone.status,
        "created_at": zone.created_at,
        **summary,
        "managers": managers,
    }


# ============ ENDPOINTS ============

@router.get("", response_model=List[ZoneResponse])
async def list_zones(
    status_filter: Optional[ZoneStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    from middleware.zone_scope import get_zone_ids_for_user

    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    role = token_data.get("role", "")

    query = select(Zone).where(Zone.org_id == org_id)
    if status_filter:
        query = query.where(Zone.status == status_filter)

    # Zone-based scoping — managers only see their assigned zones
    allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
    if allowed_zone_ids is not None:
        query = query.where(Zone.id.in_(allowed_zone_ids))

    result = await db.execute(query.order_by(Zone.zone_name))
    zones = result.scalars().all()

    if not zones:
        return []

    from models.site import Site as SiteModel
    zone_ids_list = [z.id for z in zones]

    # Batch region counts per zone
    region_count_rows = (await db.execute(
        select(Region.zone_id, func.count().label("cnt"))
        .where(Region.zone_id.in_(zone_ids_list), Region.org_id == org_id)
        .group_by(Region.zone_id)
    )).all()
    region_count_map = {row.zone_id: row.cnt for row in region_count_rows}

    # Fetch all region IDs for all zones to resolve employee/site counts
    region_rows = (await db.execute(
        select(Region.id, Region.zone_id)
        .where(Region.zone_id.in_(zone_ids_list), Region.org_id == org_id)
    )).all()
    region_to_zone: dict = {row.id: row.zone_id for row in region_rows}
    all_region_ids = list(region_to_zone.keys())

    emp_count_map: dict = {zid: 0 for zid in zone_ids_list}
    site_count_map: dict = {zid: 0 for zid in zone_ids_list}

    if all_region_ids:
        emp_rows = (await db.execute(
            select(Employee.region_id, func.count().label("cnt"))
            .where(Employee.region_id.in_(all_region_ids), Employee.org_id == org_id)
            .group_by(Employee.region_id)
        )).all()
        for row in emp_rows:
            zid = region_to_zone.get(row.region_id)
            if zid:
                emp_count_map[zid] = emp_count_map.get(zid, 0) + row.cnt

        site_rows = (await db.execute(
            select(SiteModel.region_id, func.count().label("cnt"))
            .where(SiteModel.region_id.in_(all_region_ids), SiteModel.org_id == org_id)
            .group_by(SiteModel.region_id)
        )).all()
        for row in site_rows:
            zid = region_to_zone.get(row.region_id)
            if zid:
                site_count_map[zid] = site_count_map.get(zid, 0) + row.cnt

    # Batch managers with employee names in one join query
    manager_rows = (await db.execute(
        select(ZoneManager, Employee)
        .join(Employee, ZoneManager.employee_id == Employee.id)
        .where(ZoneManager.zone_id.in_(zone_ids_list))
    )).all()
    managers_map: dict = {zid: [] for zid in zone_ids_list}
    for zm, emp in manager_rows:
        managers_map[zm.zone_id].append({
            "id": zm.id,
            "employee_id": zm.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "assigned_date": zm.assigned_date,
            "end_date": zm.end_date,
            "active": zm.active,
        })

    return [
        {
            "id": z.id,
            "zone_name": z.zone_name,
            "notes": z.notes,
            "status": z.status,
            "created_at": z.created_at,
            "region_count": region_count_map.get(z.id, 0),
            "employee_count": emp_count_map.get(z.id, 0),
            "site_count": site_count_map.get(z.id, 0),
            "managers": managers_map.get(z.id, []),
        }
        for z in zones
    ]


@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    payload: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])
    zone = Zone(org_id=org_id, created_by=user_id, **payload.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return await _build_zone_response(zone, org_id, db)


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(select(Zone).where(Zone.id == zone_id, Zone.org_id == org_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return await _build_zone_response(zone, org_id, db)


@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: UUID,
    payload: ZoneUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(select(Zone).where(Zone.id == zone_id, Zone.org_id == org_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(zone, field, value)
    await db.commit()
    await db.refresh(zone)
    return await _build_zone_response(zone, org_id, db)


@router.delete("/{zone_id}", response_model=MessageResponse)
async def delete_zone(
    zone_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(select(Zone).where(Zone.id == zone_id, Zone.org_id == org_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    # Check no regions assigned
    region_count = await db.execute(
        select(func.count()).select_from(Region).where(Region.zone_id == zone_id)
    )
    if (region_count.scalar_one() or 0) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete zone with assigned regions")
    await db.delete(zone)
    await db.commit()
    return MessageResponse(message="Zone deleted successfully")


# ============ MANAGER ENDPOINTS ============

@router.post("/{zone_id}/managers", response_model=ManagerResponse, status_code=status.HTTP_201_CREATED)
async def assign_manager(
    zone_id: UUID,
    payload: ZoneManagerCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    user_id = UUID(token_data["sub"])

    # Verify zone
    zone_result = await db.execute(select(Zone).where(Zone.id == zone_id, Zone.org_id == org_id))
    if not zone_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Zone not found")

    # Verify employee belongs to org and has correct job title
    emp_result = await db.execute(
        select(Employee).where(Employee.id == payload.employee_id, Employee.org_id == org_id)
    )
    emp = emp_result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp.job_title != "Zone Manager":
        raise HTTPException(
            status_code=400,
            detail=f"Employee job title must be 'Zone Manager' (current: '{emp.job_title}')",
        )

    zm = ZoneManager(
        org_id=org_id,
        zone_id=zone_id,
        employee_id=payload.employee_id,
        assigned_date=payload.assigned_date,
        end_date=payload.end_date,
        active=True,
        created_by=user_id,
    )
    db.add(zm)
    await db.commit()
    await db.refresh(zm)
    return {
        "id": zm.id,
        "employee_id": zm.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}",
        "assigned_date": zm.assigned_date,
        "end_date": zm.end_date,
        "active": zm.active,
    }


@router.delete("/{zone_id}/managers/{manager_id}", response_model=MessageResponse)
async def remove_manager(
    zone_id: UUID,
    manager_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data["org_id"])
    result = await db.execute(
        select(ZoneManager).where(ZoneManager.id == manager_id, ZoneManager.zone_id == zone_id)
    )
    zm = result.scalar_one_or_none()
    if not zm:
        raise HTTPException(status_code=404, detail="Manager assignment not found")
    await db.delete(zm)
    await db.commit()
    return MessageResponse(message="Manager removed successfully")
