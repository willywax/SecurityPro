# Site Router - CRUD operations for Site management module

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

from utils.auth import get_token_data

router = APIRouter(prefix="/sites", tags=["Sites"])

db = None

def set_db(database):
    global db
    db = database


# ============ ENUMS ============

class SiteStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"


# ============ SCHEMAS ============

class SiteCreate(BaseModel):
    client_id: str
    site_name: str
    region: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: SiteStatus = SiteStatus.ACTIVE
    notes: Optional[str] = None


class SiteUpdate(BaseModel):
    client_id: Optional[str] = None
    site_name: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[SiteStatus] = None
    notes: Optional[str] = None


class SiteResponse(BaseModel):
    id: str
    org_id: str
    site_id: str
    client_id: str
    client_name: Optional[str] = None
    site_name: str
    region: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class SiteListResponse(BaseModel):
    sites: List[SiteResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_site_id(org_id: str) -> str:
    """Generate auto-incrementing site ID like SITE001"""
    cursor = db.sites.find(
        {"org_id": org_id, "site_id": {"$regex": "^SITE"}},
        {"site_id": 1, "_id": 0}
    ).sort("site_id", -1).limit(1)

    last = await cursor.to_list(length=1)

    if last and last[0].get("site_id"):
        try:
            num = int(last[0]["site_id"].replace("SITE", ""))
            return f"SITE{str(num + 1).zfill(3)}"
        except ValueError:
            pass

    return "SITE001"


async def enrich_with_client_name(doc: dict, org_id: str) -> dict:
    """Add client_name to a site document"""
    client = await db.clients.find_one(
        {"id": doc["client_id"], "org_id": org_id},
        {"client_name": 1, "_id": 0}
    )
    return {**doc, "client_name": client.get("client_name") if client else None}


# ============ SITE ENDPOINTS ============

@router.get("", response_model=SiteListResponse)
async def list_sites(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name, region, district, or site_id"),
    client_id: Optional[str] = Query(None, description="Filter by client UUID"),
    status: Optional[SiteStatus] = Query(None, description="Filter by status"),
    token_data: dict = Depends(get_token_data)
):
    """List all sites with pagination, search, and filtering"""
    org_id = token_data.get("org_id")

    query = {"org_id": org_id}

    if client_id:
        query["client_id"] = client_id

    if status:
        query["status"] = status.value

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"site_name": search_regex},
            {"contact_person": search_regex},
            {"region": search_regex},
            {"district": search_regex},
            {"site_id": search_regex},
        ]

    total = await db.sites.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    cursor = db.sites.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    sites = await cursor.to_list(length=page_size)

    enriched = []
    for site in sites:
        enriched.append(SiteResponse(**(await enrich_with_client_name(site, org_id))))

    return SiteListResponse(
        sites=enriched,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    data: SiteCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a new site with auto-generated site_id"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    # Verify client exists and belongs to org
    client = await db.clients.find_one(
        {"id": data.client_id, "org_id": org_id},
        {"client_name": 1, "_id": 0}
    )
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    site_id = await generate_site_id(org_id)
    now = datetime.now(timezone.utc).isoformat()

    site_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "site_id": site_id,
        "client_id": data.client_id,
        "site_name": data.site_name,
        "region": data.region,
        "district": data.district,
        "ward": data.ward,
        "address": data.address,
        "contact_person": data.contact_person,
        "contact_phone": data.contact_phone,
        "status": data.status.value,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }

    await db.sites.insert_one(site_doc)
    return SiteResponse(**{**site_doc, "client_name": client["client_name"]})


@router.get("/{site_uuid}", response_model=SiteResponse)
async def get_site(
    site_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single site by UUID, includes client_name"""
    org_id = token_data.get("org_id")

    site = await db.sites.find_one(
        {"id": site_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return SiteResponse(**(await enrich_with_client_name(site, org_id)))


@router.put("/{site_uuid}", response_model=SiteResponse)
async def update_site(
    site_uuid: str,
    data: SiteUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update a site"""
    org_id = token_data.get("org_id")

    existing = await db.sites.find_one(
        {"id": site_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    # If client_id is changing, verify new client exists
    if data.client_id and data.client_id != existing["client_id"]:
        client_check = await db.clients.find_one(
            {"id": data.client_id, "org_id": org_id}
        )
        if not client_check:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key == "status" and hasattr(value, "value"):
                update_doc[key] = value.value
            else:
                update_doc[key] = value

    await db.sites.update_one(
        {"id": site_uuid, "org_id": org_id},
        {"$set": update_doc}
    )

    updated = await db.sites.find_one(
        {"id": site_uuid, "org_id": org_id},
        {"_id": 0}
    )

    return SiteResponse(**(await enrich_with_client_name(updated, org_id)))


@router.delete("/{site_uuid}", response_model=MessageResponse)
async def delete_site(
    site_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete a site"""
    org_id = token_data.get("org_id")

    result = await db.sites.delete_one(
        {"id": site_uuid, "org_id": org_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return MessageResponse(message="Site deleted successfully")
