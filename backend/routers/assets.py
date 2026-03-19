# Asset Router - CRUD for asset management + issuance tracking - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
import uuid

from db.dependencies import get_db
from models.asset import Asset, AssetIssuance
from models.employee import Employee
from models.site import Site
from models.enums import AssetType, AssetStatus, AssetCondition
from utils.auth import get_token_data

router = APIRouter(prefix="/assets", tags=["Assets"])


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
    id: UUID
    org_id: UUID
    asset_id: str
    asset_tag: Optional[str] = None
    asset_type: AssetType
    name: str
    serial_number: Optional[str] = None
    status: AssetStatus
    condition: AssetCondition
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class AssetListResponse(BaseModel):
    assets: List[AssetResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============ ISSUANCE SCHEMAS ============

class IssuanceCreate(BaseModel):
    issued_to_employee: Optional[UUID] = None
    issued_to_site: Optional[UUID] = None
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
    id: UUID
    org_id: UUID
    asset_id: UUID
    issued_to_employee: Optional[UUID] = None
    issued_to_site: Optional[UUID] = None
    employee_name: Optional[str] = None
    site_name: Optional[str] = None
    issue_date: date
    return_date: Optional[date] = None
    issue_condition: AssetCondition
    return_condition: Optional[AssetCondition] = None
    lost: bool
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    is_active: bool = False

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_asset_id(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing asset ID like ASSET0001"""
    result = await db.execute(
        select(Asset.asset_id)
        .where(Asset.org_id == org_id)
        .where(Asset.asset_id.like("ASSET%"))
        .order_by(Asset.asset_id.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("ASSET", ""))
            return f"ASSET{str(num + 1).zfill(4)}"
        except ValueError:
            return "ASSET0001"
    return "ASSET0001"


# ============ ASSET CRUD ENDPOINTS ============

@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset: AssetCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a new asset"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Generate asset ID
    asset_id = await generate_asset_id(db, org_id)

    # Create asset
    new_asset = Asset(
        org_id=org_id,
        asset_id=asset_id,
        created_by=user_id,
        **asset.model_dump()
    )

    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)

    return new_asset


@router.get("/", response_model=AssetListResponse)
async def get_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    asset_type: Optional[AssetType] = None,
    status_filter: Optional[AssetStatus] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all assets with pagination and filters"""
    org_id = UUID(token_data.get("org_id"))

    # Base query
    query = select(Asset).where(Asset.org_id == org_id)

    # Apply filters
    if search:
        query = query.where(
            (Asset.name.ilike(f"%{search}%")) |
            (Asset.asset_id.ilike(f"%{search}%")) |
            (Asset.asset_tag.ilike(f"%{search}%"))
        )
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    if status_filter:
        query = query.where(Asset.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Asset.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    assets = result.scalars().all()

    return AssetListResponse(
        assets=assets,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get a single asset by ID"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.org_id == org_id)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: UUID,
    asset_update: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update an asset"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.org_id == org_id)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Update fields
    update_data = asset_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)

    await db.commit()
    await db.refresh(asset)

    return asset


@router.delete("/{asset_id}", response_model=MessageResponse)
async def delete_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete an asset"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.org_id == org_id)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    await db.delete(asset)
    await db.commit()

    return MessageResponse(message="Asset deleted successfully")


# ============ ISSUANCE ENDPOINTS ============

@router.post("/{asset_id}/issue", response_model=IssuanceResponse, status_code=status.HTTP_201_CREATED)
async def issue_asset(
    asset_id: UUID,
    issuance: IssuanceCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Issue an asset to an employee or site"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Get asset
    asset_result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.org_id == org_id)
    )
    asset = asset_result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status != AssetStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Asset is not available for issuance")

    # Verify recipient exists
    if issuance.issued_to_employee:
        emp_result = await db.execute(
            select(Employee).where(Employee.id == issuance.issued_to_employee, Employee.org_id == org_id)
        )
        if not emp_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Employee not found")

    if issuance.issued_to_site:
        site_result = await db.execute(
            select(Site).where(Site.id == issuance.issued_to_site, Site.org_id == org_id)
        )
        if not site_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Site not found")

    # Create issuance
    new_issuance = AssetIssuance(
        org_id=org_id,
        asset_id=asset_id,
        created_by=user_id,
        **issuance.model_dump()
    )

    db.add(new_issuance)

    # Update asset status
    asset.status = AssetStatus.ISSUED

    await db.commit()
    await db.refresh(new_issuance)

    # Build response
    response_data = IssuanceResponse.model_validate(new_issuance)
    response_data.is_active = new_issuance.return_date is None

    # Get names
    if new_issuance.issued_to_employee:
        emp_result = await db.execute(
            select(Employee).where(Employee.id == new_issuance.issued_to_employee)
        )
        emp = emp_result.scalar_one_or_none()
        if emp:
            response_data.employee_name = f"{emp.first_name} {emp.last_name}"

    if new_issuance.issued_to_site:
        site_result = await db.execute(
            select(Site).where(Site.id == new_issuance.issued_to_site)
        )
        site = site_result.scalar_one_or_none()
        if site:
            response_data.site_name = site.site_name

    return response_data


@router.put("/issuances/{issuance_id}/return", response_model=IssuanceResponse)
async def return_asset(
    issuance_id: UUID,
    return_data: IssuanceReturn,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Record asset return"""
    org_id = UUID(token_data.get("org_id"))

    # Get issuance
    result = await db.execute(
        select(AssetIssuance).where(AssetIssuance.id == issuance_id, AssetIssuance.org_id == org_id)
    )
    issuance = result.scalar_one_or_none()

    if not issuance:
        raise HTTPException(status_code=404, detail="Issuance not found")

    if issuance.return_date:
        raise HTTPException(status_code=400, detail="Asset already returned")

    # Update issuance
    issuance.return_date = return_data.return_date
    issuance.return_condition = return_data.return_condition
    issuance.lost = return_data.lost
    if return_data.remarks:
        issuance.remarks = return_data.remarks

    # Update asset status
    asset_result = await db.execute(
        select(Asset).where(Asset.id == issuance.asset_id)
    )
    asset = asset_result.scalar_one_or_none()

    if asset:
        if return_data.lost:
            asset.status = AssetStatus.LOST
        else:
            asset.status = AssetStatus.AVAILABLE

    await db.commit()
    await db.refresh(issuance)

    # Build response
    response_data = IssuanceResponse.model_validate(issuance)
    response_data.is_active = False

    return response_data


@router.get("/{asset_id}/issuances", response_model=List[IssuanceResponse])
async def get_asset_issuances(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all issuances for an asset"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(AssetIssuance)
        .where(AssetIssuance.asset_id == asset_id, AssetIssuance.org_id == org_id)
        .order_by(AssetIssuance.issue_date.desc())
    )
    issuances = result.scalars().all()

    # Enrich with names
    responses = []
    for issuance in issuances:
        response_data = IssuanceResponse.model_validate(issuance)
        response_data.is_active = issuance.return_date is None

        # Get employee name
        if issuance.issued_to_employee:
            emp_result = await db.execute(
                select(Employee).where(Employee.id == issuance.issued_to_employee)
            )
            emp = emp_result.scalar_one_or_none()
            if emp:
                response_data.employee_name = f"{emp.first_name} {emp.last_name}"

        # Get site name
        if issuance.issued_to_site:
            site_result = await db.execute(
                select(Site).where(Site.id == issuance.issued_to_site)
            )
            site = site_result.scalar_one_or_none()
            if site:
                response_data.site_name = site.site_name

        responses.append(response_data)

    return responses
