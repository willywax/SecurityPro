# Client Router - CRUD operations for Client management module - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import uuid

from db.dependencies import get_db
from models.client import Client
from models.enums import ClientStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/clients", tags=["Clients"])


# ============ SCHEMAS ============

class ClientCreate(BaseModel):
    client_name: str
    contact_person: str
    phone_1: str
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    billing_email: Optional[EmailStr] = None
    address: str
    status: ClientStatus = ClientStatus.ACTIVE
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    client_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    billing_email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[ClientStatus] = None
    notes: Optional[str] = None


class ClientResponse(BaseModel):
    id: UUID
    org_id: UUID
    client_id: str
    client_name: str
    contact_person: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    billing_email: Optional[str] = None
    address: Optional[str] = None
    status: ClientStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    clients: List[ClientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_client_id(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing client ID like CLT0001"""
    result = await db.execute(
        select(Client.client_id)
        .where(Client.org_id == org_id)
        .where(Client.client_id.like("CLT%"))
        .order_by(Client.client_id.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("CLT", ""))
            return f"CLT{str(num + 1).zfill(4)}"
        except ValueError:
            return "CLT0001"
    return "CLT0001"


# ============ CRUD ENDPOINTS ============

@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client: ClientCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a new client"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Generate client ID
    client_id = await generate_client_id(db, org_id)

    # Create client
    new_client = Client(
        org_id=org_id,
        client_id=client_id,
        created_by=user_id,
        **client.model_dump()
    )

    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)

    return new_client


@router.get("", response_model=ClientListResponse)
async def get_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[ClientStatus] = None,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get all clients with pagination and filters"""
    org_id = UUID(token_data.get("org_id"))

    # Base query
    query = select(Client).where(Client.org_id == org_id)

    # Apply filters
    if search:
        query = query.where(
            (Client.client_name.ilike(f"%{search}%")) |
            (Client.client_id.ilike(f"%{search}%"))
        )
    if status_filter:
        query = query.where(Client.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Client.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    clients = result.scalars().all()

    return ClientListResponse(
        clients=clients,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get a single client by ID"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.org_id == org_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_update: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update a client"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.org_id == org_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Update fields
    update_data = client_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)

    return client


@router.delete("/{client_id}", response_model=MessageResponse)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete a client"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.org_id == org_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)
    await db.commit()

    return MessageResponse(message="Client deleted successfully")
