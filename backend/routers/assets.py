# Asset Router - CRUD for asset management + issuance tracking

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid

from utils.auth import get_token_data

router = APIRouter(prefix="/assets", tags=["Assets"])

db = None

def set_db(database):
    global db
    db = database


# ============ ENUMS ============

class AssetType(str, Enum):
    GUN = "gun"
    UNIFORM = "uniform"
    RADIO = "radio"
    BATON = "baton"
    HANDCUFF = "handcuff"
    TORCH = "torch"
    OTHER = "other"


class AssetStatus(str, Enum):
    AVAILABLE = "available"
    ISSUED = "issued"
    LOST = "lost"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class AssetCondition(str, Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


# ============ ASSET SCHEMAS ============

class AssetCreate(BaseModel):
    asset_tag: Optional[str] = None
    asset_type: AssetType
    name: str
    serial_number: Optional[str] = None
    status: AssetStatus = AssetStatus.AVAILABLE
    condition: AssetCondition = AssetCondition.GOOD
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    asset_tag: Optional[str] = None
    asset_type: Optional[AssetType] = None
    name: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[AssetStatus] = None
    condition: Optional[AssetCondition] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class AssetResponse(BaseModel):
    id: str
    org_id: str
    asset_id: str
    asset_tag: Optional[str] = None
    asset_type: str
    name: str
    serial_number: Optional[str] = None
    status: str
    condition: str
    purchase_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class AssetListResponse(BaseModel):
    assets: List[AssetResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============ ISSUANCE SCHEMAS ============

class IssuanceCreate(BaseModel):
    issued_to_employee: Optional[str] = None
    issued_to_site: Optional[str] = None
    issue_date: date
    issue_condition: AssetCondition
    remarks: Optional[str] = None

    @model_validator(mode='after')
    def validate_recipient(self):
        if not self.issued_to_employee and not self.issued_to_site:
            raise ValueError('Either issued_to_employee or issued_to_site must be provided')
        return self


class IssuanceReturn(BaseModel):
    return_date: date
    return_condition: Optional[AssetCondition] = None
    lost: bool = False
    remarks: Optional[str] = None


class IssuanceResponse(BaseModel):
    id: str
    org_id: str
    asset_id: str
    issued_to_employee: Optional[str] = None
    issued_to_site: Optional[str] = None
    employee_name: Optional[str] = None
    site_name: Optional[str] = None
    issue_date: str
    return_date: Optional[str] = None
    issue_condition: str
    return_condition: Optional[str] = None
    lost: bool
    remarks: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    is_active: bool = False


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_asset_id(org_id: str) -> str:
    """Generate auto-incrementing asset ID like ASSET0001"""
    cursor = db.assets.find(
        {"org_id": org_id, "asset_id": {"$regex": "^ASSET"}},
        {"asset_id": 1, "_id": 0}
    ).sort("asset_id", -1).limit(1)

    last = await cursor.to_list(length=1)

    if last and last[0].get("asset_id"):
        try:
            num = int(last[0]["asset_id"].replace("ASSET", ""))
            return f"ASSET{str(num + 1).zfill(4)}"
        except ValueError:
            pass

    return "ASSET0001"


async def enrich_issuance(doc: dict, org_id: str) -> dict:
    """Add employee_name and site_name to an issuance document"""
    enriched = {**doc}

    if doc.get("issued_to_employee"):
        emp = await db.employees.find_one(
            {"id": doc["issued_to_employee"], "org_id": org_id},
            {"first_name": 1, "last_name": 1, "employee_id": 1, "_id": 0}
        )
        if emp:
            enriched["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

    if doc.get("issued_to_site"):
        site = await db.sites.find_one(
            {"id": doc["issued_to_site"], "org_id": org_id},
            {"site_name": 1, "_id": 0}
        )
        if site:
            enriched["site_name"] = site.get("site_name")

    # is_active: no return date set yet
    enriched["is_active"] = not doc.get("return_date")

    return enriched


# ============ ASSET ENDPOINTS ============

@router.get("", response_model=AssetListResponse)
async def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    asset_type: Optional[AssetType] = Query(None, alias="type"),
    asset_status: Optional[AssetStatus] = Query(None, alias="status"),
    token_data: dict = Depends(get_token_data)
):
    """List all assets with pagination, search, and filtering"""
    org_id = token_data.get("org_id")

    query = {"org_id": org_id}

    if asset_type:
        query["asset_type"] = asset_type.value

    if asset_status:
        query["status"] = asset_status.value

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"serial_number": search_regex},
            {"asset_id": search_regex},
            {"asset_tag": search_regex},
        ]

    total = await db.assets.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    cursor = db.assets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    assets = await cursor.to_list(length=page_size)

    return AssetListResponse(
        assets=[AssetResponse(**a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    data: AssetCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a new asset with auto-generated asset_id"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    asset_id = await generate_asset_id(org_id)
    now = datetime.now(timezone.utc).isoformat()

    asset_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "asset_id": asset_id,
        "asset_tag": data.asset_tag,
        "asset_type": data.asset_type.value,
        "name": data.name,
        "serial_number": data.serial_number,
        "status": data.status.value,
        "condition": data.condition.value,
        "purchase_date": data.purchase_date.isoformat() if data.purchase_date else None,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }

    await db.assets.insert_one(asset_doc)
    return AssetResponse(**asset_doc)


@router.get("/{asset_uuid}", response_model=AssetResponse)
async def get_asset(
    asset_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single asset by UUID"""
    org_id = token_data.get("org_id")

    asset = await db.assets.find_one(
        {"id": asset_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    return AssetResponse(**asset)


@router.put("/{asset_uuid}", response_model=AssetResponse)
async def update_asset(
    asset_uuid: str,
    data: AssetUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update an asset"""
    org_id = token_data.get("org_id")

    existing = await db.assets.find_one(
        {"id": asset_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key in ["asset_type", "status", "condition"] and hasattr(value, "value"):
                update_doc[key] = value.value
            elif key == "purchase_date" and isinstance(value, date):
                update_doc[key] = value.isoformat()
            else:
                update_doc[key] = value

    await db.assets.update_one(
        {"id": asset_uuid, "org_id": org_id},
        {"$set": update_doc}
    )

    updated = await db.assets.find_one(
        {"id": asset_uuid, "org_id": org_id},
        {"_id": 0}
    )

    return AssetResponse(**updated)


@router.delete("/{asset_uuid}", response_model=MessageResponse)
async def delete_asset(
    asset_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete an asset - only if not currently issued"""
    org_id = token_data.get("org_id")

    active_issuance = await db.asset_issuances.find_one({
        "asset_id": asset_uuid,
        "org_id": org_id,
        "return_date": None
    })
    if active_issuance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an asset that is currently issued"
        )

    result = await db.assets.delete_one({"id": asset_uuid, "org_id": org_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    return MessageResponse(message="Asset deleted successfully")


# ============ ISSUANCE ENDPOINTS ============

@router.get("/{asset_uuid}/issuances", response_model=List[IssuanceResponse])
async def list_issuances(
    asset_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """List all issuances for an asset"""
    org_id = token_data.get("org_id")

    asset = await db.assets.find_one({"id": asset_uuid, "org_id": org_id})
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    cursor = db.asset_issuances.find(
        {"asset_id": asset_uuid, "org_id": org_id},
        {"_id": 0}
    ).sort("created_at", -1)

    issuances = await cursor.to_list(length=100)

    enriched = []
    for iso in issuances:
        enriched.append(IssuanceResponse(**(await enrich_issuance(iso, org_id))))

    return enriched


@router.post("/{asset_uuid}/issue", response_model=IssuanceResponse, status_code=status.HTTP_201_CREATED)
async def issue_asset(
    asset_uuid: str,
    data: IssuanceCreate,
    token_data: dict = Depends(get_token_data)
):
    """Issue an asset to an employee or site"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    # Verify asset exists and is available
    asset = await db.assets.find_one(
        {"id": asset_uuid, "org_id": org_id},
        {"_id": 0}
    )
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    if asset.get("status") != "available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset cannot be issued. Current status: {asset.get('status')}"
        )

    # Confirm no active issuance exists
    active = await db.asset_issuances.find_one({
        "asset_id": asset_uuid,
        "org_id": org_id,
        "return_date": None
    })
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset already has an active issuance"
        )

    # Validate employee if provided
    if data.issued_to_employee:
        emp = await db.employees.find_one({"id": data.issued_to_employee, "org_id": org_id})
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Validate site if provided
    if data.issued_to_site:
        site = await db.sites.find_one({"id": data.issued_to_site, "org_id": org_id})
        if not site:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    now = datetime.now(timezone.utc).isoformat()
    issuance_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "asset_id": asset_uuid,
        "issued_to_employee": data.issued_to_employee,
        "issued_to_site": data.issued_to_site,
        "issue_date": data.issue_date.isoformat(),
        "return_date": None,
        "issue_condition": data.issue_condition.value,
        "return_condition": None,
        "lost": False,
        "remarks": data.remarks,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }

    await db.asset_issuances.insert_one(issuance_doc)

    # Update asset status to issued
    await db.assets.update_one(
        {"id": asset_uuid, "org_id": org_id},
        {"$set": {"status": "issued", "updated_at": now}}
    )

    return IssuanceResponse(**(await enrich_issuance(issuance_doc, org_id)))


@router.put("/{asset_uuid}/issuances/{issuance_id}/return", response_model=IssuanceResponse)
async def return_asset(
    asset_uuid: str,
    issuance_id: str,
    data: IssuanceReturn,
    token_data: dict = Depends(get_token_data)
):
    """Return an issued asset (or declare as lost)"""
    org_id = token_data.get("org_id")

    issuance = await db.asset_issuances.find_one(
        {"id": issuance_id, "asset_id": asset_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not issuance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issuance not found")

    if issuance.get("return_date"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset has already been returned"
        )

    now = datetime.now(timezone.utc).isoformat()
    update_doc = {
        "return_date": data.return_date.isoformat(),
        "lost": data.lost,
        "updated_at": now
    }
    if data.return_condition:
        update_doc["return_condition"] = data.return_condition.value
    if data.remarks is not None:
        update_doc["remarks"] = data.remarks

    await db.asset_issuances.update_one(
        {"id": issuance_id, "org_id": org_id},
        {"$set": update_doc}
    )

    # Update asset status
    new_status = "lost" if data.lost else "available"
    await db.assets.update_one(
        {"id": asset_uuid, "org_id": org_id},
        {"$set": {"status": new_status, "updated_at": now}}
    )

    updated = await db.asset_issuances.find_one(
        {"id": issuance_id, "org_id": org_id},
        {"_id": 0}
    )

    return IssuanceResponse(**(await enrich_issuance(updated, org_id)))
