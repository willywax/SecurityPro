"""Daily log router — zone manager shift reporting."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel as PydanticModel
from typing import Optional, List
from datetime import date, datetime, timezone
from uuid import UUID

from db.dependencies import get_db
from models.daily_log import DailyLog, DailyLogAttendance, DailyLogIncident
from models.employee import Employee
from models.site import Site
from models.zone import Zone, Region
from models.allocation import EmployeeSiteAllocation
from models.enums import UserRole
from middleware.zone_scope import get_zone_ids_for_user
from utils.auth import get_token_data

router = APIRouter(prefix="/daily-logs", tags=["Daily Logs"])

ALL_ACCESS_ROLES = {UserRole.ADMIN.value, UserRole.DIRECTOR.value, UserRole.HR.value}


# ============ SCHEMAS ============

class AttendanceInput(PydanticModel):
    employee_id: UUID
    status: str  # present|absent|late|left_early
    notes: Optional[str] = None


class IncidentInput(PydanticModel):
    incident_type: str
    description: str
    severity: str = "low"
    reported_by: Optional[str] = None


class DailyLogCreate(PydanticModel):
    site_id: UUID
    log_date: date
    shift: str  # morning|afternoon|night|full_day
    overall_status: str = "normal"
    notes: Optional[str] = None
    attendance: List[AttendanceInput] = []
    incidents: List[IncidentInput] = []


class AttendanceResponse(PydanticModel):
    id: UUID
    employee_id: Optional[UUID] = None
    employee_name: str
    guard_no: Optional[str] = None
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class IncidentResponse(PydanticModel):
    id: UUID
    incident_type: str
    description: str
    severity: str
    reported_by: Optional[str] = None

    class Config:
        from_attributes = True


class DailyLogSummary(PydanticModel):
    id: UUID
    site_id: UUID
    site_name: Optional[str] = None
    zone_id: Optional[UUID] = None
    zone_name: Optional[str] = None
    log_date: date
    shift: str
    submission_time: datetime
    overall_status: str
    submitted_by_name: Optional[str] = None
    present_count: int = 0
    total_guards: int = 0
    incident_count: int = 0

    class Config:
        from_attributes = True


class DailyLogDetail(PydanticModel):
    id: UUID
    site_id: UUID
    site_name: Optional[str] = None
    zone_id: Optional[UUID] = None
    zone_name: Optional[str] = None
    log_date: date
    shift: str
    submission_time: datetime
    overall_status: str
    notes: Optional[str] = None
    submitted_by_name: Optional[str] = None
    attendance: List[AttendanceResponse] = []
    incidents: List[IncidentResponse] = []

    class Config:
        from_attributes = True


# ============ HELPERS ============

async def _get_zone_for_site(db: AsyncSession, site: Site) -> Optional[UUID]:
    if not site.region_id:
        return None
    region = (await db.execute(select(Region).where(Region.id == site.region_id))).scalar_one_or_none()
    return region.zone_id if region else None


async def _build_log_detail(log: DailyLog, db: AsyncSession) -> dict:
    from models.auth import User

    site = (await db.execute(select(Site).where(Site.id == log.site_id))).scalar_one_or_none()
    zone = (await db.execute(select(Zone).where(Zone.id == log.zone_id))).scalar_one_or_none() if log.zone_id else None

    submitted_by_name = None
    if log.submitted_by:
        user = (await db.execute(select(User).where(User.id == log.submitted_by))).scalar_one_or_none()
        submitted_by_name = f"{user.first_name} {user.last_name}".strip() if user else None

    attendance = (await db.execute(
        select(DailyLogAttendance).where(DailyLogAttendance.log_id == log.id)
    )).scalars().all()

    incidents = (await db.execute(
        select(DailyLogIncident).where(DailyLogIncident.log_id == log.id)
    )).scalars().all()

    return {
        "id": log.id,
        "site_id": log.site_id,
        "site_name": site.site_name if site else None,
        "zone_id": log.zone_id,
        "zone_name": zone.zone_name if zone else None,
        "log_date": log.log_date,
        "shift": log.shift,
        "submission_time": log.submission_time,
        "overall_status": log.overall_status,
        "notes": log.notes,
        "submitted_by_name": submitted_by_name,
        "attendance": [
            {
                "id": a.id,
                "employee_id": a.employee_id,
                "employee_name": a.employee_name,
                "guard_no": a.guard_no,
                "status": a.status,
                "notes": a.notes,
            }
            for a in attendance
        ],
        "incidents": [
            {
                "id": i.id,
                "incident_type": i.incident_type,
                "description": i.description,
                "severity": i.severity,
                "reported_by": i.reported_by,
            }
            for i in incidents
        ],
    }


async def _build_log_summary(
    log: DailyLog,
    db: AsyncSession,
    site_map: dict,
    zone_map: dict,
    user_map: dict,
) -> dict:
    attendance = (await db.execute(
        select(DailyLogAttendance).where(DailyLogAttendance.log_id == log.id)
    )).scalars().all()

    incidents = (await db.execute(
        select(DailyLogIncident).where(DailyLogIncident.log_id == log.id)
    )).scalars().all()

    site = site_map.get(log.site_id)
    zone = zone_map.get(log.zone_id) if log.zone_id else None

    return {
        "id": log.id,
        "site_id": log.site_id,
        "site_name": site.site_name if site else None,
        "zone_id": log.zone_id,
        "zone_name": zone.zone_name if zone else None,
        "log_date": log.log_date,
        "shift": log.shift,
        "submission_time": log.submission_time,
        "overall_status": log.overall_status,
        "submitted_by_name": user_map.get(log.submitted_by),
        "present_count": sum(1 for a in attendance if a.status == "present"),
        "total_guards": len(attendance),
        "incident_count": len(incidents),
    }


# ============ ENDPOINTS ============

@router.post("", response_model=DailyLogDetail, status_code=201)
async def submit_daily_log(
    body: DailyLogCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    site = (await db.execute(
        select(Site).where(Site.id == body.site_id, Site.org_id == org_id)
    )).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    zone_id = await _get_zone_for_site(db, site)

    if role not in ALL_ACCESS_ROLES:
        allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
        if allowed_zone_ids is not None and (zone_id is None or zone_id not in allowed_zone_ids):
            raise HTTPException(status_code=403, detail="Not authorized to submit logs for this site")

    # Auto-populate attendance from current site allocations when none provided
    attendance_input = list(body.attendance)
    if not attendance_input:
        allocs = (await db.execute(
            select(EmployeeSiteAllocation).where(
                EmployeeSiteAllocation.site_id == body.site_id,
                EmployeeSiteAllocation.status == "active",
            )
        )).scalars().all()
        for alloc in allocs:
            attendance_input.append(AttendanceInput(
                employee_id=alloc.employee_id,
                status="present",
            ))

    # Snapshot employee data
    emp_ids = [a.employee_id for a in attendance_input if a.employee_id]
    emps_map: dict = {}
    if emp_ids:
        for e in (await db.execute(select(Employee).where(Employee.id.in_(emp_ids)))).scalars().all():
            emps_map[e.id] = e

    log = DailyLog(
        org_id=org_id,
        zone_id=zone_id,
        site_id=body.site_id,
        submitted_by=user_id,
        log_date=body.log_date,
        shift=body.shift,
        submission_time=datetime.now(timezone.utc),
        overall_status=body.overall_status,
        notes=body.notes,
        created_by=user_id,
    )
    db.add(log)
    await db.flush()

    for a in attendance_input:
        emp = emps_map.get(a.employee_id) if a.employee_id else None
        db.add(DailyLogAttendance(
            org_id=org_id,
            log_id=log.id,
            employee_id=a.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown",
            guard_no=emp.guard_no if emp else None,
            status=a.status,
            notes=a.notes,
            created_by=user_id,
        ))

    for i in body.incidents:
        db.add(DailyLogIncident(
            org_id=org_id,
            log_id=log.id,
            incident_type=i.incident_type,
            description=i.description,
            severity=i.severity,
            reported_by=i.reported_by,
            created_by=user_id,
        ))

    await db.commit()
    await db.refresh(log)
    return await _build_log_detail(log, db)


@router.get("/sites/{site_id}", response_model=List[DailyLogSummary])
async def get_site_daily_logs(
    site_id: UUID,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data.get("org_id"))

    site = (await db.execute(
        select(Site).where(Site.id == site_id, Site.org_id == org_id)
    )).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    query = select(DailyLog).where(DailyLog.site_id == site_id, DailyLog.org_id == org_id)
    if date_from:
        query = query.where(DailyLog.log_date >= date_from)
    if date_to:
        query = query.where(DailyLog.log_date <= date_to)
    query = query.order_by(DailyLog.log_date.desc(), DailyLog.submission_time.desc())

    logs = (await db.execute(query)).scalars().all()

    site_map = {site.id: site}
    zone_map: dict = {}
    user_map: dict = {}

    zone_ids = {l.zone_id for l in logs if l.zone_id}
    if zone_ids:
        for z in (await db.execute(select(Zone).where(Zone.id.in_(zone_ids)))).scalars().all():
            zone_map[z.id] = z

    user_ids = {l.submitted_by for l in logs if l.submitted_by}
    if user_ids:
        from models.auth import User
        for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all():
            user_map[u.id] = f"{u.first_name} {u.last_name}".strip()

    return [await _build_log_summary(l, db, site_map, zone_map, user_map) for l in logs]


@router.get("", response_model=List[DailyLogSummary])
async def list_daily_logs(
    zone_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    log_date: Optional[date] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    query = select(DailyLog).where(DailyLog.org_id == org_id)

    allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
    if allowed_zone_ids is not None:
        query = query.where(DailyLog.zone_id.in_(allowed_zone_ids))

    if zone_id:
        query = query.where(DailyLog.zone_id == zone_id)
    if site_id:
        query = query.where(DailyLog.site_id == site_id)
    if log_date:
        query = query.where(DailyLog.log_date == log_date)
    if date_from:
        query = query.where(DailyLog.log_date >= date_from)
    if date_to:
        query = query.where(DailyLog.log_date <= date_to)

    query = query.order_by(DailyLog.log_date.desc(), DailyLog.submission_time.desc())
    logs = (await db.execute(query)).scalars().all()

    site_ids = {l.site_id for l in logs}
    zone_ids = {l.zone_id for l in logs if l.zone_id}
    user_ids = {l.submitted_by for l in logs if l.submitted_by}

    site_map: dict = {}
    zone_map: dict = {}
    user_map: dict = {}

    if site_ids:
        for s in (await db.execute(select(Site).where(Site.id.in_(site_ids)))).scalars().all():
            site_map[s.id] = s
    if zone_ids:
        for z in (await db.execute(select(Zone).where(Zone.id.in_(zone_ids)))).scalars().all():
            zone_map[z.id] = z
    if user_ids:
        from models.auth import User
        for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all():
            user_map[u.id] = f"{u.first_name} {u.last_name}".strip()

    return [await _build_log_summary(l, db, site_map, zone_map, user_map) for l in logs]


@router.get("/{log_id}", response_model=DailyLogDetail)
async def get_daily_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    log = (await db.execute(
        select(DailyLog).where(DailyLog.id == log_id, DailyLog.org_id == org_id)
    )).scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
    if allowed_zone_ids is not None and log.zone_id not in allowed_zone_ids:
        raise HTTPException(status_code=403, detail="Not authorized to view this log")

    return await _build_log_detail(log, db)
