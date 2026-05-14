"""Dashboard summary and recent activity endpoints."""

from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db
from models.client import Client
from models.employee import Employee, EmployeeContract
from models.enums import (
    ClientStatus, ContractStatus, EmploymentStatus, SiteStatus, AvailabilityStatus,
)
from models.inventory import InventoryIssuance
from models.site import Site
from utils.auth import get_token_data

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ─── Admin dashboard schemas ───────────────────────────────────────────────

class DashboardStatsResponse(BaseModel):
    total_employees: int
    active_employees: int
    active_clients: int
    active_sites: int
    outstanding_assets: int
    active_users: int
    unassigned_guards: int


class DashboardActivityResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    created_at: datetime
    href: str | None = None


class DashboardSummaryResponse(BaseModel):
    stats: DashboardStatsResponse
    recent_activity: list[DashboardActivityResponse]


# ─── Zone-manager dashboard schemas ────────────────────────────────────────

class ZoneSummary(BaseModel):
    zone_id: UUID
    zone_name: str
    region_count: int
    employee_count: int
    site_count: int


class ZoneManagerStats(BaseModel):
    total_employees: int
    available_guards: int
    allocated_guards: int
    total_sites: int
    total_clients: int
    contracts_expiring_soon: int
    pending_asset_requests: int
    open_events: int
    unsubmitted_logs_today: int


class TodayLogEntry(BaseModel):
    site_id: UUID
    site_name: str
    logs_submitted_today: int
    last_log_time: Optional[datetime] = None
    overall_status: Optional[str] = None
    guards_present: Optional[int] = None
    guards_total: Optional[int] = None


class AllocationGap(BaseModel):
    site_id: UUID
    site_name: str
    allocated_guards: int


class ZoneManagerDashboardResponse(BaseModel):
    zones: List[ZoneSummary]
    summary: ZoneManagerStats
    todays_logs: List[TodayLogEntry]
    recent_events: list
    pending_requests: list
    allocation_gaps: List[AllocationGap]
    no_zones_message: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────────────────

async def count_rows(db: AsyncSession, model, *conditions) -> int:
    result = await db.execute(
        select(func.count()).select_from(model).where(*conditions)
    )
    return int(result.scalar() or 0)


# ─── Admin dashboard ────────────────────────────────────────────────────────

@router.get("", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data.get("org_id"))

    total_employees = await count_rows(db, Employee, Employee.org_id == org_id)
    active_employees = await count_rows(
        db, Employee,
        Employee.org_id == org_id,
        Employee.employment_status == EmploymentStatus.ACTIVE,
    )
    active_clients = await count_rows(
        db, Client,
        Client.org_id == org_id,
        Client.status == ClientStatus.ACTIVE,
    )
    active_sites = await count_rows(
        db, Site,
        Site.org_id == org_id,
        Site.status == SiteStatus.ACTIVE,
    )

    outstanding_assets_result = await db.execute(
        select(
            func.coalesce(
                func.sum(InventoryIssuance.quantity_issued - InventoryIssuance.quantity_returned),
                0,
            )
        ).where(InventoryIssuance.org_id == org_id)
    )
    outstanding_assets = max(int(outstanding_assets_result.scalar() or 0), 0)

    from models.auth import User
    active_users = await count_rows(
        db, User,
        User.org_id == org_id,
        User.is_active.is_(True),
    )

    unassigned_guards = await count_rows(
        db, Employee,
        Employee.org_id == org_id,
        Employee.availability_status == AvailabilityStatus.AVAILABLE,
        Employee.employment_status == EmploymentStatus.ACTIVE,
    )

    employee_rows = (
        await db.execute(
            select(Employee)
            .where(Employee.org_id == org_id)
            .order_by(Employee.created_at.desc())
            .limit(3)
        )
    ).scalars().all()

    client_rows = (
        await db.execute(
            select(Client)
            .where(Client.org_id == org_id)
            .order_by(Client.created_at.desc())
            .limit(3)
        )
    ).scalars().all()

    site_rows = (
        await db.execute(
            select(Site)
            .where(Site.org_id == org_id)
            .order_by(Site.created_at.desc())
            .limit(3)
        )
    ).scalars().all()

    issuance_rows = (
        await db.execute(
            select(InventoryIssuance)
            .where(InventoryIssuance.org_id == org_id)
            .order_by(InventoryIssuance.created_at.desc())
            .limit(3)
        )
    ).scalars().all()

    activities: list[DashboardActivityResponse] = []

    for employee in employee_rows:
        full_name = " ".join(
            part for part in [employee.first_name, employee.middle_name, employee.last_name] if part
        )
        activities.append(
            DashboardActivityResponse(
                id=f"employee:{employee.id}",
                type="employee",
                title="New employee added",
                description=full_name or employee.employee_id,
                created_at=employee.created_at,
                href=f"/employees/{employee.id}",
            )
        )

    for client in client_rows:
        activities.append(
            DashboardActivityResponse(
                id=f"client:{client.id}",
                type="client",
                title="Client record created",
                description=client.client_name,
                created_at=client.created_at,
                href=f"/clients/{client.id}",
            )
        )

    for site in site_rows:
        activities.append(
            DashboardActivityResponse(
                id=f"site:{site.id}",
                type="site",
                title="Site onboarded",
                description=site.site_name,
                created_at=site.created_at,
                href=f"/sites/{site.id}",
            )
        )

    for issuance in issuance_rows:
        activities.append(
            DashboardActivityResponse(
                id=f"issuance:{issuance.id}",
                type="asset",
                title="Asset issued",
                description=f"{issuance.issued_to_name} received {issuance.quantity_issued} item(s)",
                created_at=issuance.created_at,
                href="/issuances",
            )
        )

    activities.sort(key=lambda item: item.created_at, reverse=True)

    return DashboardSummaryResponse(
        stats=DashboardStatsResponse(
            total_employees=total_employees,
            active_employees=active_employees,
            active_clients=active_clients,
            active_sites=active_sites,
            outstanding_assets=outstanding_assets,
            active_users=active_users,
            unassigned_guards=unassigned_guards,
        ),
        recent_activity=activities[:6],
    )


# ─── Zone-manager dashboard ─────────────────────────────────────────────────

@router.get("/zone-manager", response_model=ZoneManagerDashboardResponse)
async def get_zone_manager_dashboard(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    from models.zone import Zone, Region
    from models.allocation import EmployeeSiteAllocation
    from models.daily_log import DailyLog, DailyLogAttendance
    from middleware.zone_scope import get_zone_ids_for_user

    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    if role != "zone_manager":
        raise HTTPException(status_code=403, detail="This endpoint is for zone managers only")

    zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)

    empty_summary = ZoneManagerStats(
        total_employees=0, available_guards=0, allocated_guards=0,
        total_sites=0, total_clients=0, contracts_expiring_soon=0,
        pending_asset_requests=0, open_events=0, unsubmitted_logs_today=0,
    )

    if not zone_ids:
        return ZoneManagerDashboardResponse(
            zones=[], summary=empty_summary, todays_logs=[],
            recent_events=[], pending_requests=[], allocation_gaps=[],
            no_zones_message="No zones assigned. Contact your administrator.",
        )

    # Region IDs for all assigned zones
    region_ids_subq = select(Region.id).where(
        Region.zone_id.in_(zone_ids),
        Region.org_id == org_id,
    )

    # Sites in those regions (active only)
    sites_result = await db.execute(
        select(Site)
        .where(
            Site.region_id.in_(region_ids_subq),
            Site.org_id == org_id,
            Site.status == SiteStatus.ACTIVE,
        )
    )
    sites = sites_result.scalars().all()
    site_ids = [s.id for s in sites]

    today = date.today()
    expiry_threshold = today + timedelta(days=30)

    # ── Summary counts ──────────────────────────────────────────────────────

    total_employees = await count_rows(
        db, Employee,
        Employee.region_id.in_(region_ids_subq),
        Employee.org_id == org_id,
    )
    available_guards = await count_rows(
        db, Employee,
        Employee.region_id.in_(region_ids_subq),
        Employee.org_id == org_id,
        Employee.availability_status == AvailabilityStatus.AVAILABLE,
    )
    allocated_guards = await count_rows(
        db, Employee,
        Employee.region_id.in_(region_ids_subq),
        Employee.org_id == org_id,
        Employee.availability_status == AvailabilityStatus.ALLOCATED,
    )
    total_sites = len(site_ids)

    client_ids_subq = (
        select(Site.client_id)
        .where(Site.region_id.in_(region_ids_subq), Site.org_id == org_id)
        .distinct()
    )
    total_clients = int(
        (await db.execute(
            select(func.count()).select_from(
                select(Site.client_id)
                .where(Site.region_id.in_(region_ids_subq), Site.org_id == org_id)
                .distinct()
                .subquery()
            )
        )).scalar() or 0
    )

    employee_ids_subq = select(Employee.id).where(
        Employee.region_id.in_(region_ids_subq),
        Employee.org_id == org_id,
    )
    contracts_expiring_soon = await count_rows(
        db, EmployeeContract,
        EmployeeContract.employee_id.in_(employee_ids_subq),
        EmployeeContract.status == ContractStatus.ACTIVE,
        EmployeeContract.end_date.is_not(None),
        EmployeeContract.end_date.between(today, expiry_threshold),
    )

    # ── Today's logs ────────────────────────────────────────────────────────

    if site_ids:
        logs_result = await db.execute(
            select(DailyLog).where(
                DailyLog.site_id.in_(site_ids),
                DailyLog.log_date == today,
                DailyLog.org_id == org_id,
            )
        )
        all_todays_logs = logs_result.scalars().all()
    else:
        all_todays_logs = []

    log_ids = [log.id for log in all_todays_logs]
    attendance_map: dict = {}
    if log_ids:
        att_result = await db.execute(
            select(DailyLogAttendance).where(DailyLogAttendance.log_id.in_(log_ids))
        )
        for att in att_result.scalars().all():
            attendance_map.setdefault(att.log_id, []).append(att)

    logs_by_site: dict = {}
    for log in all_todays_logs:
        logs_by_site.setdefault(log.site_id, []).append(log)

    sites_with_logs_today = set(logs_by_site.keys())
    unsubmitted_logs_today = len(site_ids) - len(sites_with_logs_today)

    todays_logs_list: list[TodayLogEntry] = []
    for site in sites:
        site_logs = logs_by_site.get(site.id, [])
        if site_logs:
            latest = max(site_logs, key=lambda l: l.submission_time)
            all_att: list = []
            for log in site_logs:
                all_att.extend(attendance_map.get(log.id, []))
            guards_total = len(all_att)
            guards_present = sum(1 for a in all_att if a.status == "present")
            todays_logs_list.append(TodayLogEntry(
                site_id=site.id,
                site_name=site.site_name,
                logs_submitted_today=len(site_logs),
                last_log_time=latest.submission_time,
                overall_status=latest.overall_status,
                guards_present=guards_present,
                guards_total=guards_total,
            ))
        else:
            todays_logs_list.append(TodayLogEntry(
                site_id=site.id,
                site_name=site.site_name,
                logs_submitted_today=0,
            ))

    # ── Allocation gaps (sites with zero active allocations) ────────────────

    if site_ids:
        alloc_result = await db.execute(
            select(EmployeeSiteAllocation.site_id, func.count().label("cnt"))
            .where(
                EmployeeSiteAllocation.site_id.in_(site_ids),
                EmployeeSiteAllocation.status == "active",
            )
            .group_by(EmployeeSiteAllocation.site_id)
        )
        alloc_counts = {row.site_id: row.cnt for row in alloc_result.all()}
    else:
        alloc_counts = {}

    allocation_gaps = [
        AllocationGap(
            site_id=site.id,
            site_name=site.site_name,
            allocated_guards=alloc_counts.get(site.id, 0),
        )
        for site in sites
        if alloc_counts.get(site.id, 0) == 0
    ]

    # ── Zones overview ───────────────────────────────────────────────────────

    zones_overview: list[ZoneSummary] = []
    for zid in zone_ids:
        zone_obj = (
            await db.execute(select(Zone).where(Zone.id == zid, Zone.org_id == org_id))
        ).scalar_one_or_none()
        if not zone_obj:
            continue
        region_subq_single = select(Region.id).where(
            Region.zone_id == zid, Region.org_id == org_id
        )
        r_count = int((await db.execute(
            select(func.count()).select_from(Region).where(
                Region.zone_id == zid, Region.org_id == org_id
            )
        )).scalar() or 0)
        e_count = int((await db.execute(
            select(func.count()).select_from(Employee).where(
                Employee.region_id.in_(region_subq_single),
                Employee.org_id == org_id,
            )
        )).scalar() or 0)
        s_count = int((await db.execute(
            select(func.count()).select_from(Site).where(
                Site.region_id.in_(region_subq_single),
                Site.org_id == org_id,
            )
        )).scalar() or 0)
        zones_overview.append(ZoneSummary(
            zone_id=zone_obj.id,
            zone_name=zone_obj.zone_name,
            region_count=r_count,
            employee_count=e_count,
            site_count=s_count,
        ))

    return ZoneManagerDashboardResponse(
        zones=zones_overview,
        summary=ZoneManagerStats(
            total_employees=total_employees,
            available_guards=available_guards,
            allocated_guards=allocated_guards,
            total_sites=total_sites,
            total_clients=total_clients,
            contracts_expiring_soon=contracts_expiring_soon,
            pending_asset_requests=0,
            open_events=0,
            unsubmitted_logs_today=unsubmitted_logs_today,
        ),
        todays_logs=todays_logs_list,
        recent_events=[],
        pending_requests=[],
        allocation_gaps=allocation_gaps,
    )
