"""Dashboard summary and recent activity endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db
from models.client import Client
from models.employee import Employee
from models.enums import ClientStatus, EmploymentStatus, SiteStatus
from models.inventory import InventoryIssuance
from models.site import Site
from utils.auth import get_token_data

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStatsResponse(BaseModel):
    total_employees: int
    active_employees: int
    active_clients: int
    active_sites: int
    outstanding_assets: int
    active_users: int


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


async def count_rows(
    db: AsyncSession,
    model,
    *conditions,
) -> int:
    result = await db.execute(
        select(func.count()).select_from(model).where(*conditions)
    )
    return int(result.scalar() or 0)


@router.get("", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id = UUID(token_data.get("org_id"))

    total_employees = await count_rows(db, Employee, Employee.org_id == org_id)
    active_employees = await count_rows(
        db,
        Employee,
        Employee.org_id == org_id,
        Employee.employment_status == EmploymentStatus.ACTIVE,
    )
    active_clients = await count_rows(
        db,
        Client,
        Client.org_id == org_id,
        Client.status == ClientStatus.ACTIVE,
    )
    active_sites = await count_rows(
        db,
        Site,
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
        db,
        User,
        User.org_id == org_id,
        User.is_active.is_(True),
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
        ),
        recent_activity=activities[:6],
    )
