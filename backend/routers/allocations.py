"""Guard site allocation and transfer router."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from db.dependencies import get_db
from models.employee import Employee
from models.site import Site
from models.zone import Zone, Region, ZoneManager
from models.allocation import EmployeeSiteAllocation, GuardTransfer
from models.enums import AvailabilityStatus, UserRole
from utils.auth import get_token_data

router = APIRouter(prefix="/allocations", tags=["Allocations"])


# ============ SCHEMAS ============

class AllocateRequest(BaseModel):
    employee_id: UUID
    start_date: date
    notes: Optional[str] = None


class TransferRequest(BaseModel):
    to_site_id: UUID
    transfer_date: date
    reason: str


class AllocationResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    guard_no: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    site_id: UUID
    site_name: Optional[str] = None
    zone_id: Optional[UUID] = None
    zone_name: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TransferResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    from_site_id: Optional[UUID] = None
    from_site_name: Optional[str] = None
    to_site_id: Optional[UUID] = None
    to_site_name: Optional[str] = None
    transfer_date: date
    reason: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AvailableGuardResponse(BaseModel):
    id: UUID
    employee_id: str
    guard_no: Optional[str] = None
    first_name: str
    last_name: str
    phone_1: Optional[str] = None
    region_name: Optional[str] = None
    zone_name: Optional[str] = None

    class Config:
        from_attributes = True


class ZoneSiteAllocationSummary(BaseModel):
    site_id: UUID
    site_name: str
    client_name: Optional[str] = None
    allocated_count: int
    guards: List[AllocationResponse] = []


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def _resolve_zone_for_site(db: AsyncSession, site: Site) -> Optional[Zone]:
    """Return the zone that owns this site's region, or None."""
    if not site.region_id:
        return None
    region = (await db.execute(select(Region).where(Region.id == site.region_id))).scalar_one_or_none()
    if not region:
        return None
    return (await db.execute(select(Zone).where(Zone.id == region.zone_id))).scalar_one_or_none()


async def _get_managed_zone_ids(db: AsyncSession, org_id: UUID, user_id: UUID) -> list[UUID]:
    """Return zone IDs this user is assigned to via UserZoneAssignment."""
    from models.user_zone_assignment import UserZoneAssignment
    result = await db.execute(
        select(UserZoneAssignment.zone_id).where(
            UserZoneAssignment.user_id == user_id,
            UserZoneAssignment.org_id == org_id,
            UserZoneAssignment.status == "active",
        )
    )
    return [row[0] for row in result.all()]


async def _check_zone_access(db: AsyncSession, org_id: UUID, user_id: UUID, role: str, site: Site) -> bool:
    """Return True if the caller may allocate/transfer guards at this site."""
    if role in (UserRole.ADMIN.value, UserRole.DIRECTOR.value, UserRole.HR.value):
        return True
    zone = await _resolve_zone_for_site(db, site)
    if not zone:
        return False
    managed = await _get_managed_zone_ids(db, org_id, user_id)
    return zone.id in managed


def _get_employee_photo_url(employee: Optional[Employee]) -> Optional[str]:
    if not employee or not employee.photo_path:
        return None
    try:
        from services.storage_service import storage_service
        return storage_service.get_view_url(employee.photo_path, expiry_minutes=60)
    except Exception:
        return None


async def _build_allocation_response(
    alloc: EmployeeSiteAllocation,
    db: AsyncSession,
    employee: Optional[Employee] = None,
    site: Optional[Site] = None,
) -> dict:
    if not employee:
        employee = (await db.execute(select(Employee).where(Employee.id == alloc.employee_id))).scalar_one_or_none()
    if not site:
        site = (await db.execute(select(Site).where(Site.id == alloc.site_id))).scalar_one_or_none()

    zone_name = None
    if alloc.zone_id:
        zone = (await db.execute(select(Zone).where(Zone.id == alloc.zone_id))).scalar_one_or_none()
        zone_name = zone.zone_name if zone else None

    photo_url = _get_employee_photo_url(employee)

    return {
        "id": alloc.id,
        "employee_id": alloc.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}".strip() if employee else None,
        "guard_no": employee.guard_no if employee else None,
        "phone": employee.phone_1 if employee else None,
        "photo_url": photo_url,
        "site_id": alloc.site_id,
        "site_name": site.site_name if site else None,
        "zone_id": alloc.zone_id,
        "zone_name": zone_name,
        "start_date": alloc.start_date,
        "end_date": alloc.end_date,
        "status": alloc.status,
        "notes": alloc.notes,
        "created_at": alloc.created_at,
    }


async def _build_transfer_response(
    transfer: GuardTransfer,
    db: AsyncSession,
) -> dict:
    employee = (await db.execute(select(Employee).where(Employee.id == transfer.employee_id))).scalar_one_or_none()
    from_site = None
    to_site = None
    if transfer.from_site_id:
        from_site = (await db.execute(select(Site).where(Site.id == transfer.from_site_id))).scalar_one_or_none()
    if transfer.to_site_id:
        to_site = (await db.execute(select(Site).where(Site.id == transfer.to_site_id))).scalar_one_or_none()
    return {
        "id": transfer.id,
        "employee_id": transfer.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}".strip() if employee else None,
        "from_site_id": transfer.from_site_id,
        "from_site_name": from_site.site_name if from_site else None,
        "to_site_id": transfer.to_site_id,
        "to_site_name": to_site.site_name if to_site else None,
        "transfer_date": transfer.transfer_date,
        "reason": transfer.reason,
        "status": transfer.status,
        "created_at": transfer.created_at,
    }


# ============ ENDPOINTS ============

@router.get("/available-guards", response_model=List[AvailableGuardResponse])
async def get_available_guards(
    zone_id: Optional[UUID] = None,
    region_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Guards that are currently available (not allocated to any site)."""
    org_id = UUID(token_data.get("org_id"))

    query = select(Employee).where(
        Employee.org_id == org_id,
        Employee.availability_status == AvailabilityStatus.AVAILABLE,
    )

    if search:
        query = query.where(
            or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.employee_id.ilike(f"%{search}%"),
                Employee.guard_no.ilike(f"%{search}%"),
            )
        )
    if region_id:
        query = query.where(Employee.region_id == region_id)
    elif zone_id:
        region_ids = select(Region.id).where(Region.zone_id == zone_id, Region.org_id == org_id)
        query = query.where(Employee.region_id.in_(region_ids))

    result = await db.execute(query.order_by(Employee.first_name))
    employees = result.scalars().all()

    # Enrich with region/zone names
    region_ids_set = {e.region_id for e in employees if e.region_id}
    regions_map = {}
    zones_map = {}
    if region_ids_set:
        regions_res = await db.execute(select(Region).where(Region.id.in_(region_ids_set)))
        for r in regions_res.scalars().all():
            regions_map[r.id] = r
        zone_ids_set = {r.zone_id for r in regions_map.values()}
        if zone_ids_set:
            zones_res = await db.execute(select(Zone).where(Zone.id.in_(zone_ids_set)))
            for z in zones_res.scalars().all():
                zones_map[z.id] = z

    out = []
    for emp in employees:
        region = regions_map.get(emp.region_id)
        zone = zones_map.get(region.zone_id) if region else None
        out.append({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "guard_no": emp.guard_no,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "phone_1": emp.phone_1,
            "region_name": region.region_name if region else None,
            "zone_name": zone.zone_name if zone else None,
        })
    return out


@router.post("/sites/{site_id}/allocate", response_model=AllocationResponse)
async def allocate_guard(
    site_id: UUID,
    body: AllocateRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Assign an available guard to a site."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    site = (await db.execute(select(Site).where(Site.id == site_id, Site.org_id == org_id))).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if not await _check_zone_access(db, org_id, user_id, role, site):
        raise HTTPException(status_code=403, detail="Not authorized to allocate guards at this site")

    employee = (await db.execute(select(Employee).where(Employee.id == body.employee_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.availability_status == AvailabilityStatus.ALLOCATED:
        raise HTTPException(status_code=400, detail="Guard is already allocated to a site")

    zone = await _resolve_zone_for_site(db, site)

    alloc = EmployeeSiteAllocation(
        org_id=org_id,
        employee_id=body.employee_id,
        site_id=site_id,
        zone_id=zone.id if zone else None,
        allocated_by=user_id,
        start_date=body.start_date,
        status="active",
        notes=body.notes,
        created_by=user_id,
    )
    db.add(alloc)

    employee.current_site_id = site_id
    employee.availability_status = AvailabilityStatus.ALLOCATED

    await db.commit()
    await db.refresh(alloc)
    return await _build_allocation_response(alloc, db, employee, site)


@router.post("/employees/{employee_id}/transfer", response_model=TransferResponse)
async def transfer_guard(
    employee_id: UUID,
    body: TransferRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Transfer an allocated guard from their current site to a new site."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    employee = (await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.availability_status != AvailabilityStatus.ALLOCATED or not employee.current_site_id:
        raise HTTPException(status_code=400, detail="Guard is not currently allocated to any site")

    to_site = (await db.execute(select(Site).where(Site.id == body.to_site_id, Site.org_id == org_id))).scalar_one_or_none()
    if not to_site:
        raise HTTPException(status_code=404, detail="Destination site not found")

    from_site_id = employee.current_site_id
    from_site = (await db.execute(select(Site).where(Site.id == from_site_id))).scalar_one_or_none()

    # Auth: zone manager must own both sites (or be admin/director/hr)
    if role not in (UserRole.ADMIN.value, UserRole.DIRECTOR.value, UserRole.HR.value):
        managed = await _get_managed_zone_ids(db, org_id, user_id)
        from_zone = await _resolve_zone_for_site(db, from_site) if from_site else None
        to_zone = await _resolve_zone_for_site(db, to_site)
        if (from_zone and from_zone.id not in managed) or (to_zone and to_zone.id not in managed):
            raise HTTPException(status_code=403, detail="Not authorized to transfer guards between these sites")

    # End current allocation
    alloc_result = await db.execute(
        select(EmployeeSiteAllocation).where(
            EmployeeSiteAllocation.employee_id == employee_id,
            EmployeeSiteAllocation.site_id == from_site_id,
            EmployeeSiteAllocation.status == "active",
        )
    )
    current_alloc = alloc_result.scalar_one_or_none()
    if current_alloc:
        current_alloc.end_date = body.transfer_date
        current_alloc.status = "ended"

    # Create new allocation
    to_zone = await _resolve_zone_for_site(db, to_site)
    new_alloc = EmployeeSiteAllocation(
        org_id=org_id,
        employee_id=employee_id,
        site_id=body.to_site_id,
        zone_id=to_zone.id if to_zone else None,
        allocated_by=user_id,
        start_date=body.transfer_date,
        status="active",
        created_by=user_id,
    )
    db.add(new_alloc)

    # Create transfer record
    transfer = GuardTransfer(
        org_id=org_id,
        employee_id=employee_id,
        from_site_id=from_site_id,
        to_site_id=body.to_site_id,
        transfer_date=body.transfer_date,
        transferred_by=user_id,
        reason=body.reason,
        status="completed",
        created_by=user_id,
    )
    db.add(transfer)

    employee.current_site_id = body.to_site_id

    await db.commit()
    await db.refresh(transfer)
    return await _build_transfer_response(transfer, db)


@router.delete("/sites/{site_id}/allocations/{employee_id}", response_model=MessageResponse)
async def deallocate_guard(
    site_id: UUID,
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Remove a guard from a site, setting them back to available."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    site = (await db.execute(select(Site).where(Site.id == site_id, Site.org_id == org_id))).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if not await _check_zone_access(db, org_id, user_id, role, site):
        raise HTTPException(status_code=403, detail="Not authorized to manage guards at this site")

    employee = (await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    alloc_result = await db.execute(
        select(EmployeeSiteAllocation).where(
            EmployeeSiteAllocation.employee_id == employee_id,
            EmployeeSiteAllocation.site_id == site_id,
            EmployeeSiteAllocation.status == "active",
        )
    )
    alloc = alloc_result.scalar_one_or_none()
    if alloc:
        alloc.end_date = date.today()
        alloc.status = "ended"

    employee.availability_status = AvailabilityStatus.AVAILABLE
    employee.current_site_id = None

    await db.commit()
    return MessageResponse(message="Guard removed from site")


@router.get("/sites/{site_id}/guards", response_model=List[AllocationResponse])
async def get_site_guards(
    site_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """All currently active guards allocated to a site."""
    org_id = UUID(token_data.get("org_id"))

    site = (await db.execute(select(Site).where(Site.id == site_id, Site.org_id == org_id))).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    result = await db.execute(
        select(EmployeeSiteAllocation).where(
            EmployeeSiteAllocation.site_id == site_id,
            EmployeeSiteAllocation.status == "active",
        ).order_by(EmployeeSiteAllocation.start_date)
    )
    allocs = result.scalars().all()

    employee_ids = {a.employee_id for a in allocs}
    zone_ids_set = {a.zone_id for a in allocs if a.zone_id}

    employees_map: dict = {}
    if employee_ids:
        e_res = await db.execute(select(Employee).where(Employee.id.in_(employee_ids)))
        for e in e_res.scalars().all():
            employees_map[e.id] = e

    zones_map: dict = {}
    if zone_ids_set:
        z_res = await db.execute(select(Zone).where(Zone.id.in_(zone_ids_set)))
        for z in z_res.scalars().all():
            zones_map[z.id] = z

    out = []
    for a in allocs:
        emp = employees_map.get(a.employee_id)
        zone_obj = zones_map.get(a.zone_id) if a.zone_id else None
        photo_url = _get_employee_photo_url(emp)
        out.append({
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}".strip() if emp else None,
            "guard_no": emp.guard_no if emp else None,
            "phone": emp.phone_1 if emp else None,
            "photo_url": photo_url,
            "site_id": a.site_id,
            "site_name": site.site_name,
            "zone_id": a.zone_id,
            "zone_name": zone_obj.zone_name if zone_obj else None,
            "start_date": a.start_date,
            "end_date": a.end_date,
            "status": a.status,
            "notes": a.notes,
            "created_at": a.created_at,
        })
    return out


@router.get("/employees/{employee_id}/history", response_model=List[AllocationResponse])
async def get_employee_allocation_history(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """All past and current site allocations for an employee."""
    org_id = UUID(token_data.get("org_id"))

    employee = (await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    result = await db.execute(
        select(EmployeeSiteAllocation).where(
            EmployeeSiteAllocation.employee_id == employee_id,
        ).order_by(EmployeeSiteAllocation.start_date.desc())
    )
    allocs = result.scalars().all()

    site_ids_set = {a.site_id for a in allocs}
    zone_ids_set = {a.zone_id for a in allocs if a.zone_id}

    sites_map: dict = {}
    if site_ids_set:
        s_res = await db.execute(select(Site).where(Site.id.in_(site_ids_set)))
        for s in s_res.scalars().all():
            sites_map[s.id] = s

    zones_map: dict = {}
    if zone_ids_set:
        z_res = await db.execute(select(Zone).where(Zone.id.in_(zone_ids_set)))
        for z in z_res.scalars().all():
            zones_map[z.id] = z

    photo_url = _get_employee_photo_url(employee)

    out = []
    for a in allocs:
        site_obj = sites_map.get(a.site_id)
        zone_obj = zones_map.get(a.zone_id) if a.zone_id else None
        out.append({
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}".strip() if employee else None,
            "guard_no": employee.guard_no if employee else None,
            "phone": employee.phone_1 if employee else None,
            "photo_url": photo_url,
            "site_id": a.site_id,
            "site_name": site_obj.site_name if site_obj else None,
            "zone_id": a.zone_id,
            "zone_name": zone_obj.zone_name if zone_obj else None,
            "start_date": a.start_date,
            "end_date": a.end_date,
            "status": a.status,
            "notes": a.notes,
            "created_at": a.created_at,
        })
    return out


@router.get("/employees/{employee_id}/transfers", response_model=List[TransferResponse])
async def get_employee_transfers(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """All transfer records for an employee."""
    org_id = UUID(token_data.get("org_id"))

    employee = (await db.execute(select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    result = await db.execute(
        select(GuardTransfer).where(
            GuardTransfer.employee_id == employee_id,
        ).order_by(GuardTransfer.transfer_date.desc())
    )
    transfers = result.scalars().all()

    all_site_ids = (
        {t.from_site_id for t in transfers if t.from_site_id}
        | {t.to_site_id for t in transfers if t.to_site_id}
    )
    sites_map: dict = {}
    if all_site_ids:
        s_res = await db.execute(select(Site).where(Site.id.in_(all_site_ids)))
        for s in s_res.scalars().all():
            sites_map[s.id] = s

    out = []
    for t in transfers:
        from_site = sites_map.get(t.from_site_id) if t.from_site_id else None
        to_site = sites_map.get(t.to_site_id) if t.to_site_id else None
        out.append({
            "id": t.id,
            "employee_id": t.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}".strip() if employee else None,
            "from_site_id": t.from_site_id,
            "from_site_name": from_site.site_name if from_site else None,
            "to_site_id": t.to_site_id,
            "to_site_name": to_site.site_name if to_site else None,
            "transfer_date": t.transfer_date,
            "reason": t.reason,
            "status": t.status,
            "created_at": t.created_at,
        })
    return out


@router.get("/zones/{zone_id}/overview", response_model=List[ZoneSiteAllocationSummary])
async def get_zone_allocation_overview(
    zone_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """All sites in a zone with their guard counts and lists."""
    from models.client import Client
    org_id = UUID(token_data.get("org_id"))

    zone = (await db.execute(select(Zone).where(Zone.id == zone_id, Zone.org_id == org_id))).scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    region_ids = (await db.execute(
        select(Region.id).where(Region.zone_id == zone_id, Region.org_id == org_id)
    )).scalars().all()

    if not region_ids:
        return []

    sites_result = await db.execute(
        select(Site).where(Site.region_id.in_(region_ids), Site.org_id == org_id)
        .order_by(Site.site_name)
    )
    sites = sites_result.scalars().all()

    client_ids = {s.client_id for s in sites}
    clients_map = {}
    if client_ids:
        c_res = await db.execute(select(Client).where(Client.id.in_(client_ids)))
        for c in c_res.scalars().all():
            clients_map[c.id] = c

    # Batch-fetch all active allocations for all sites in one query
    site_ids_list = [s.id for s in sites]
    all_allocs_result = await db.execute(
        select(EmployeeSiteAllocation).where(
            EmployeeSiteAllocation.site_id.in_(site_ids_list),
            EmployeeSiteAllocation.status == "active",
        )
    )
    all_allocs = all_allocs_result.scalars().all()

    allocs_by_site: dict = {}
    for alloc in all_allocs:
        allocs_by_site.setdefault(alloc.site_id, []).append(alloc)

    # Batch-load employees and zones referenced by allocations
    alloc_employee_ids = {a.employee_id for a in all_allocs}
    alloc_zone_ids = {a.zone_id for a in all_allocs if a.zone_id}

    alloc_employees_map: dict = {}
    if alloc_employee_ids:
        ae_res = await db.execute(select(Employee).where(Employee.id.in_(alloc_employee_ids)))
        for e in ae_res.scalars().all():
            alloc_employees_map[e.id] = e

    alloc_zones_map: dict = {}
    if alloc_zone_ids:
        az_res = await db.execute(select(Zone).where(Zone.id.in_(alloc_zone_ids)))
        for z in az_res.scalars().all():
            alloc_zones_map[z.id] = z

    out = []
    for site in sites:
        site_allocs = allocs_by_site.get(site.id, [])
        client = clients_map.get(site.client_id)
        guard_list = []
        for a in site_allocs:
            emp = alloc_employees_map.get(a.employee_id)
            zone_obj = alloc_zones_map.get(a.zone_id) if a.zone_id else None
            photo_url = _get_employee_photo_url(emp)
            guard_list.append({
                "id": a.id,
                "employee_id": a.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}".strip() if emp else None,
                "guard_no": emp.guard_no if emp else None,
                "phone": emp.phone_1 if emp else None,
                "photo_url": photo_url,
                "site_id": a.site_id,
                "site_name": site.site_name,
                "zone_id": a.zone_id,
                "zone_name": zone_obj.zone_name if zone_obj else None,
                "start_date": a.start_date,
                "end_date": a.end_date,
                "status": a.status,
                "notes": a.notes,
                "created_at": a.created_at,
            })
        out.append({
            "site_id": site.id,
            "site_name": site.site_name,
            "client_name": client.client_name if client else None,
            "allocated_count": len(guard_list),
            "guards": guard_list,
        })
    return out
