# Client Router - CRUD operations for Client management module

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

from utils.auth import get_token_data

router = APIRouter(prefix="/clients", tags=["Clients"])

db = None

def set_db(database):
    global db
    db = database


# ============ ENUMS ============

class ClientStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"


# ============ SCHEMAS ============

class ClientCreate(BaseModel):
    client_name: str
    contact_person: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    billing_email: Optional[EmailStr] = None
    address: Optional[str] = None
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
    id: str
    org_id: str
    client_id: str
    client_name: str
    contact_person: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    billing_email: Optional[str] = None
    address: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class ClientListResponse(BaseModel):
    clients: List[ClientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_client_id(org_id: str) -> str:
    """Generate auto-incrementing client ID like CLT0001"""
    cursor = db.clients.find(
        {"org_id": org_id, "client_id": {"$regex": "^CLT"}},
        {"client_id": 1, "_id": 0}
    ).sort("client_id", -1).limit(1)

    last = await cursor.to_list(length=1)

    if last and last[0].get("client_id"):
        try:
            num = int(last[0]["client_id"].replace("CLT", ""))
            return f"CLT{str(num + 1).zfill(4)}"
        except ValueError:
            pass

    return "CLT0001"


# ============ CLIENT ENDPOINTS ============

@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name, email, phone, or client_id"),
    status: Optional[ClientStatus] = Query(None, description="Filter by status"),
    token_data: dict = Depends(get_token_data)
):
    """List all clients with pagination, search, and filtering"""
    org_id = token_data.get("org_id")

    query = {"org_id": org_id}

    if status:
        query["status"] = status.value

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"client_name": search_regex},
            {"contact_person": search_regex},
            {"email": search_regex},
            {"phone_1": search_regex},
            {"client_id": search_regex},
        ]

    total = await db.clients.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    cursor = db.clients.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    clients = await cursor.to_list(length=page_size)

    return ClientListResponse(
        clients=[ClientResponse(**c) for c in clients],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    token_data: dict = Depends(get_token_data)
):
    """Create a new client with auto-generated client_id"""
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    client_id = await generate_client_id(org_id)
    now = datetime.now(timezone.utc).isoformat()

    client_doc = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "client_id": client_id,
        "client_name": data.client_name,
        "contact_person": data.contact_person,
        "phone_1": data.phone_1,
        "phone_2": data.phone_2,
        "email": data.email,
        "billing_email": data.billing_email,
        "address": data.address,
        "status": data.status.value,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }

    await db.clients.insert_one(client_doc)
    return ClientResponse(**client_doc)


@router.get("/{client_uuid}", response_model=ClientResponse)
async def get_client(
    client_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Get a single client by UUID"""
    org_id = token_data.get("org_id")

    client = await db.clients.find_one(
        {"id": client_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return ClientResponse(**client)


@router.put("/{client_uuid}", response_model=ClientResponse)
async def update_client(
    client_uuid: str,
    data: ClientUpdate,
    token_data: dict = Depends(get_token_data)
):
    """Update a client"""
    org_id = token_data.get("org_id")

    existing = await db.clients.find_one(
        {"id": client_uuid, "org_id": org_id},
        {"_id": 0}
    )

    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            if key == "status" and hasattr(value, "value"):
                update_doc[key] = value.value
            else:
                update_doc[key] = value

    await db.clients.update_one(
        {"id": client_uuid, "org_id": org_id},
        {"$set": update_doc}
    )

    updated = await db.clients.find_one(
        {"id": client_uuid, "org_id": org_id},
        {"_id": 0}
    )

    return ClientResponse(**updated)


@router.delete("/{client_uuid}", response_model=MessageResponse)
async def delete_client(
    client_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    """Delete a client"""
    org_id = token_data.get("org_id")

    result = await db.clients.delete_one(
        {"id": client_uuid, "org_id": org_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return MessageResponse(message="Client deleted successfully")
