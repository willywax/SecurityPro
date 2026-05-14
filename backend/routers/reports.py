"""Employee report generator and contract expiry endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel as PydanticModel
from typing import Optional, List, Any
from datetime import date, timedelta
from uuid import UUID

from db.dependencies import get_db
from models.employee import Employee, EmployeeBankAccount, EmployeeNextOfKin, EmployeeReferee, EmployeeContract, EmployeeDocument
from models.inventory import InventoryIssuance, InventoryItem
from models.site import Site
from models.zone import Zone, Region
from models.enums import EmploymentStatus, AvailabilityStatus, ContractStatus
from middleware.zone_scope import get_zone_ids_for_user
from utils.auth import get_token_data

router = APIRouter(prefix="/reports", tags=["Reports"])


# ============ SCHEMAS ============

class ReportFilters(PydanticModel):
    zone_ids: List[UUID] = []
    region_ids: List[UUID] = []
    site_ids: List[UUID] = []
    client_ids: List[UUID] = []
    employment_status: List[str] = []
    availability_status: List[str] = []
    contract_status: List[str] = []
    contract_expiry_within_days: Optional[int] = None
    has_disciplinary: Optional[bool] = None
    has_assets_issued: Optional[bool] = None


class ReportFields(PydanticModel):
    basic: bool = True
    employment: bool = True
    bank_details: bool = False
    next_of_kin: bool = False
    references: bool = False
    contract: bool = False
    assets_issued: bool = False
    phone_numbers: bool = False


class ReportRequest(PydanticModel):
    filters: ReportFilters = ReportFilters()
    fields: ReportFields = ReportFields()
    preview: bool = False


class ContractExpiryCount(PydanticModel):
    within_7_days: int
    within_30_days: int


# ============ ENDPOINTS ============

@router.get("/contract-expiry", response_model=ContractExpiryCount)
async def get_contract_expiry_counts(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Count active contracts expiring within 7 and 30 days."""
    org_id = UUID(token_data.get("org_id"))
    today = date.today()
    d7 = today + timedelta(days=7)
    d30 = today + timedelta(days=30)

    base = and_(
        EmployeeContract.org_id == org_id,
        EmployeeContract.status == ContractStatus.ACTIVE,
        EmployeeContract.end_date.isnot(None),
        EmployeeContract.end_date >= today,
    )

    r7 = await db.execute(
        select(func.count()).select_from(EmployeeContract).where(base, EmployeeContract.end_date <= d7)
    )
    r30 = await db.execute(
        select(func.count()).select_from(EmployeeContract).where(base, EmployeeContract.end_date <= d30)
    )

    return ContractExpiryCount(
        within_7_days=int(r7.scalar() or 0),
        within_30_days=int(r30.scalar() or 0),
    )


@router.post("/employees")
async def generate_employee_report(
    body: ReportRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """Generate a filtered, field-selected employee report."""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")
    f = body.filters

    where: list = [Employee.org_id == org_id]

    # Zone scope — intersect user-allowed zones with requested zone_ids filter
    allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
    if allowed_zone_ids is not None:
        effective_zones = (
            list(set(allowed_zone_ids) & {z for z in f.zone_ids}) if f.zone_ids else allowed_zone_ids
        )
        scoped_regions = select(Region.id).where(
            Region.zone_id.in_(effective_zones), Region.org_id == org_id
        )
        where.append(Employee.region_id.in_(scoped_regions))
    elif f.zone_ids:
        scoped_regions = select(Region.id).where(
            Region.zone_id.in_(f.zone_ids), Region.org_id == org_id
        )
        where.append(Employee.region_id.in_(scoped_regions))

    if f.region_ids:
        where.append(Employee.region_id.in_(f.region_ids))

    if f.site_ids:
        where.append(Employee.current_site_id.in_(f.site_ids))

    if f.client_ids:
        client_site_ids = select(Site.id).where(
            Site.client_id.in_(f.client_ids), Site.org_id == org_id
        )
        where.append(Employee.current_site_id.in_(client_site_ids))

    if f.employment_status:
        valid = [s for s in f.employment_status if s in EmploymentStatus._value2member_map_]
        if valid:
            where.append(Employee.employment_status.in_([EmploymentStatus(s) for s in valid]))

    if f.availability_status:
        valid = [s for s in f.availability_status if s in AvailabilityStatus._value2member_map_]
        if valid:
            where.append(Employee.availability_status.in_([AvailabilityStatus(s) for s in valid]))

    if f.contract_status:
        cs_no_contract = "no_contract" in f.contract_status
        cs_regular = [s for s in f.contract_status if s != "no_contract" and s in ContractStatus._value2member_map_]
        cs_conditions = []

        if cs_regular:
            emp_with_cs = select(EmployeeContract.employee_id).where(
                EmployeeContract.org_id == org_id,
                EmployeeContract.status.in_([ContractStatus(s) for s in cs_regular]),
            ).distinct()
            cs_conditions.append(Employee.id.in_(emp_with_cs))

        if cs_no_contract:
            emp_with_any = select(EmployeeContract.employee_id).where(
                EmployeeContract.org_id == org_id
            ).distinct()
            cs_conditions.append(Employee.id.notin_(emp_with_any))

        if cs_conditions:
            where.append(or_(*cs_conditions))

    if f.contract_expiry_within_days is not None:
        cutoff = date.today() + timedelta(days=f.contract_expiry_within_days)
        emp_expiring = select(EmployeeContract.employee_id).where(
            EmployeeContract.org_id == org_id,
            EmployeeContract.status == ContractStatus.ACTIVE,
            EmployeeContract.end_date.isnot(None),
            EmployeeContract.end_date >= date.today(),
            EmployeeContract.end_date <= cutoff,
        ).distinct()
        where.append(Employee.id.in_(emp_expiring))

    if f.has_disciplinary is not None:
        emp_with_disc = select(EmployeeDocument.employee_id).where(
            EmployeeDocument.org_id == org_id,
            EmployeeDocument.document_type == 'disciplinary_letter',
        ).distinct()
        if f.has_disciplinary:
            where.append(Employee.id.in_(emp_with_disc))
        else:
            where.append(Employee.id.notin_(emp_with_disc))

    if f.has_assets_issued is not None:
        emp_with_assets = select(InventoryIssuance.issued_to_id).where(
            InventoryIssuance.org_id == org_id,
            InventoryIssuance.issued_to_type == "employee",
            InventoryIssuance.status.in_(["active", "partially_returned"]),
        ).distinct()
        if f.has_assets_issued:
            where.append(Employee.id.in_(emp_with_assets))
        else:
            where.append(Employee.id.notin_(emp_with_assets))

    combined = and_(*where)

    # Total count (without preview limit)
    total_count = int(
        (await db.execute(select(func.count()).select_from(Employee).where(combined))).scalar() or 0
    )

    # Data query with eager loads
    data_q = select(Employee).where(combined).order_by(Employee.first_name, Employee.last_name)

    load_opts = []
    if body.fields.bank_details:
        load_opts.append(selectinload(Employee.bank_accounts))
    if body.fields.next_of_kin:
        load_opts.append(selectinload(Employee.next_of_kin))
    if body.fields.references:
        load_opts.append(selectinload(Employee.referees))
    if body.fields.contract:
        load_opts.append(selectinload(Employee.contracts))
    if load_opts:
        data_q = data_q.options(*load_opts)
    if body.preview:
        data_q = data_q.limit(10)

    employees = (await db.execute(data_q)).scalars().unique().all()

    # Bulk-load enrichment (zone/region/site names)
    region_ids_set = {e.region_id for e in employees if e.region_id}
    region_map: dict = {}
    zone_map: dict = {}
    if region_ids_set:
        for r in (await db.execute(select(Region).where(Region.id.in_(region_ids_set)))).scalars().all():
            region_map[r.id] = r
        zone_ids_set = {r.zone_id for r in region_map.values()}
        if zone_ids_set:
            for z in (await db.execute(select(Zone).where(Zone.id.in_(zone_ids_set)))).scalars().all():
                zone_map[z.id] = z

    site_ids_set = {e.current_site_id for e in employees if e.current_site_id}
    site_map: dict = {}
    if site_ids_set:
        for s in (await db.execute(select(Site).where(Site.id.in_(site_ids_set)))).scalars().all():
            site_map[s.id] = s

    # Assets issued (separate query, not through ORM relationship)
    assets_map: dict = {}
    if body.fields.assets_issued and employees:
        emp_id_list = [e.id for e in employees]
        issuance_rows = (await db.execute(
            select(InventoryIssuance, InventoryItem)
            .join(InventoryItem, InventoryItem.id == InventoryIssuance.item_id)
            .where(
                InventoryIssuance.issued_to_type == "employee",
                InventoryIssuance.issued_to_id.in_(emp_id_list),
                InventoryIssuance.status.in_(["active", "partially_returned"]),
            )
        )).all()
        for issuance, item in issuance_rows:
            remaining = issuance.quantity_issued - issuance.quantity_returned
            if remaining > 0:
                assets_map.setdefault(issuance.issued_to_id, []).append({
                    "item_name": item.item_name,
                    "quantity": remaining,
                    "issue_date": str(issuance.issue_date),
                })

    # Build output rows
    result_rows = []
    for emp in employees:
        row: dict = {
            "id": str(emp.id),
            "employee_id": emp.employee_id,
        }

        if body.fields.basic:
            row.update({
                "guard_no": emp.guard_no or "",
                "full_name": f"{emp.first_name} {emp.last_name}".strip(),
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "email": emp.email or "",
                "phone": emp.phone_1 or "",
            })

        if body.fields.phone_numbers:
            row.update({
                "phone_1": emp.phone_1 or "",
                "phone_2": emp.phone_2 or "",
            })

        if body.fields.employment:
            region = region_map.get(emp.region_id)
            zone = zone_map.get(region.zone_id) if region else None
            site = site_map.get(emp.current_site_id)
            row.update({
                "employment_status": emp.employment_status.value,
                "hire_date": str(emp.hire_date) if emp.hire_date else "",
                "zone": zone.zone_name if zone else "",
                "region": region.region_name if region else "",
                "current_site": site.site_name if site else "",
                "availability": emp.availability_status.value,
            })

        if body.fields.bank_details:
            accts = emp.bank_accounts or []
            row.update({
                "bank_name": accts[0].bank_name if accts else "",
                "bank_branch": accts[0].bank_branch or "" if accts else "",
                "account_name": accts[0].account_name if accts else "",
                "account_number": accts[0].account_number if accts else "",
            })

        if body.fields.next_of_kin:
            noks = emp.next_of_kin or []
            row.update({
                "nok_name": noks[0].full_name if noks else "",
                "nok_relationship": noks[0].kin_relationship.value if noks and noks[0].kin_relationship else "",
                "nok_phone": noks[0].phone_1 if noks else "",
            })

        if body.fields.references:
            refs = emp.referees or []
            row.update({
                "ref_name": refs[0].full_name if refs else "",
                "ref_relationship": refs[0].referee_relationship.value if refs and refs[0].referee_relationship else "",
                "ref_phone": refs[0].phone_number if refs else "",
            })

        if body.fields.contract:
            active_c = sorted(
                [c for c in (emp.contracts or []) if c.status == ContractStatus.ACTIVE],
                key=lambda c: c.start_date, reverse=True,
            )
            c = active_c[0] if active_c else None
            row.update({
                "contract_type": c.contract_type.value if c and c.contract_type else "",
                "contract_start": str(c.start_date) if c else "",
                "contract_end": str(c.end_date) if c and c.end_date else "",
                "contract_salary": str(c.salary_amount) if c and c.salary_amount else "",
                "contract_status": c.status.value if c else "no_contract",
            })

        if body.fields.assets_issued:
            assets = assets_map.get(emp.id, [])
            row["assets_issued"] = assets
            row["assets_summary"] = "; ".join(f"{a['item_name']} x{a['quantity']}" for a in assets)

        result_rows.append(row)

    return {
        "employees": result_rows,
        "total_count": total_count,
        "returned_count": len(result_rows),
        "is_preview": body.preview,
    }
