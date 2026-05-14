# Site Router - CRUD operations for Site management module - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import uuid

from db.dependencies import get_db
from models.site import Site
from models.client import Client
from models.zone import Region, Zone
from models.enums import SiteStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/sites", tags=["Sites"])


# ============ SCHEMAS ============

class SiteCreate(BaseModel):
    client_id: UUID
    site_name: str
    region_id: Optional[UUID] = None
    region: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: SiteStatus = SiteStatus.ACTIVE
    notes: Optional[str] = None


class SiteUpdate(BaseModel):
    client_id: Optional[UUID] = None
    site_name: Optional[str] = None
    region_id: Optional[UUID] = None
    region: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[SiteStatus] = None
    notes: Optional[str] = None


class SiteResponse(BaseModel):
    id: UUID
    org_id: UUID
    site_id: str
    client_id: UUID
    client_name: Optional[str] = None
    site_name: str
    region_id: Optional[UUID] = None
    region_name: Optional[str] = None
    zone_name: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: SiteStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class SiteListResponse(BaseModel):
    sites: List[SiteResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def enrich_site(db: AsyncSession, site: Site, client=None) -> SiteResponse:
    """Enrich a site with client name and region/zone names."""
    data = SiteResponse.model_validate(site)
    if client:
        data.client_name = client.client_name
    elif site.client_id:
        c = (await db.execute(select(Client).where(Client.id == site.client_id))).scalar_one_or_none()
        if c:
            data.client_name = c.client_name
    if site.region_id:
        region = (await db.execute(select(Region).where(Region.id == site.region_id))).scalar_one_or_none()
        if region:
            data.region_name = region.region_name
            zone = (await db.execute(select(Zone).where(Zone.id == region.zone_id))).scalar_one_or_none()
            if zone:
                data.zone_name = zone.zone_name
    return data


async def generate_site_id(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing site ID like SITE001"""
    result = await db.execute(
        select(Site.site_id)
        .where(Site.org_id == org_id)
        .where(Site.site_id.like("SITE%"))
        .order_by(Site.site_id.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("SITE", ""))
            return f"SITE{str(num + 1).zfill(3)}"
        except ValueError:
            return "SITE001"
    return "SITE001"


# ============ CRUD ENDPOINTS ============

@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    site: SiteCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a new site"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify client exists
    client_result = await db.execute(
        select(Client).where(Client.id == site.client_id, Client.org_id == org_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Generate site ID
    site_id = await generate_site_id(db, org_id)

    # Create site
    new_site = Site(
        org_id=org_id,
        site_id=site_id,
        created_by=user_id,
        **site.model_dump()
    )

    db.add(new_site)
    await db.commit()
    await db.refresh(new_site)

    return await enrich_site(db, new_site, client)


@router.get("", response_model=SiteListResponse)
async def get_sites(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    client_id: Optional[UUID] = None,
    status_filter: Optional[SiteStatus] = None,
    region_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all sites with pagination and filters"""
    from middleware.zone_scope import get_zone_ids_for_user

    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))
    role = token_data.get("role", "")

    # Base query
    query = select(Site).where(Site.org_id == org_id)

    # Zone-based data scoping
    allowed_zone_ids = await get_zone_ids_for_user(user_id, role, org_id, db)
    if allowed_zone_ids is not None:
        scoped_region_ids = select(Region.id).where(
            Region.zone_id.in_(allowed_zone_ids), Region.org_id == org_id
        )
        query = query.where(Site.region_id.in_(scoped_region_ids))

    # Apply filters
    if search:
        query = query.where(
            (Site.site_name.ilike(f"%{search}%")) |
            (Site.site_id.ilike(f"%{search}%"))
        )
    if client_id:
        query = query.where(Site.client_id == client_id)
    if status_filter:
        query = query.where(Site.status == status_filter)
    if region_id:
        query = query.where(Site.region_id == region_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Site.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    sites = result.scalars().all()

    # Batch-load related data to avoid N+1 queries
    client_ids = {s.client_id for s in sites if s.client_id}
    region_ids_set = {s.region_id for s in sites if s.region_id}

    clients_map: dict = {}
    if client_ids:
        c_res = await db.execute(select(Client).where(Client.id.in_(client_ids)))
        for c in c_res.scalars().all():
            clients_map[c.id] = c

    regions_map: dict = {}
    zone_ids_set: set = set()
    if region_ids_set:
        r_res = await db.execute(select(Region).where(Region.id.in_(region_ids_set)))
        for r in r_res.scalars().all():
            regions_map[r.id] = r
            if r.zone_id:
                zone_ids_set.add(r.zone_id)

    zones_map: dict = {}
    if zone_ids_set:
        z_res = await db.execute(select(Zone).where(Zone.id.in_(zone_ids_set)))
        for z in z_res.scalars().all():
            zones_map[z.id] = z

    def _build(site: Site) -> SiteResponse:
        data = SiteResponse.model_validate(site)
        client = clients_map.get(site.client_id)
        if client:
            data.client_name = client.client_name
        region = regions_map.get(site.region_id) if site.region_id else None
        if region:
            data.region_name = region.region_name
            zone = zones_map.get(region.zone_id)
            if zone:
                data.zone_name = zone.zone_name
        return data

    site_responses = [_build(s) for s in sites]

    return SiteListResponse(
        sites=site_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get a single site by ID"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.org_id == org_id)
    )
    site = result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    return await enrich_site(db, site)


@router.put("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: UUID,
    site_update: SiteUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update a site"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.org_id == org_id)
    )
    site = result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # If client_id is being updated, verify it exists
    if site_update.client_id:
        client_result = await db.execute(
            select(Client).where(Client.id == site_update.client_id, Client.org_id == org_id)
        )
        client = client_result.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

    # Update fields
    update_data = site_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(site, field, value)

    await db.commit()
    await db.refresh(site)

    return await enrich_site(db, site)


@router.delete("/{site_id}", response_model=MessageResponse)
async def delete_site(
    site_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a site"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.org_id == org_id)
    )
    site = result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    await db.delete(site)
    await db.commit()

    return MessageResponse(message="Site deleted successfully")
