# Invoice Router - Full CRUD for Invoice management module

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid
import re

from utils.auth import get_token_data

router = APIRouter(prefix="/invoices", tags=["Invoices"])

db = None

def set_db(database):
    global db
    db = database


# ============ ENUMS ============

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"


class ItemType(str, Enum):
    GUARD = "guard"
    ASSET = "asset"


# ============ SCHEMAS ============

class InvoiceItemCreate(BaseModel):
    item_type: ItemType
    description: str
    quantity: float
    rate: float


class InvoiceSiteCreate(BaseModel):
    site_id: str
    site_name: str
    items: List[InvoiceItemCreate] = []


class InvoiceCreate(BaseModel):
    client_id: str
    issue_date: str
    due_date: str
    status: InvoiceStatus = InvoiceStatus.DRAFT
    notes: Optional[str] = None
    sites: List[InvoiceSiteCreate] = []

    @field_validator('issue_date', 'due_date')
    @classmethod
    def validate_date(cls, v):
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('Date must be YYYY-MM-DD format')
        return v


class InvoiceUpdate(BaseModel):
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None
    sites: Optional[List[InvoiceSiteCreate]] = None

    @field_validator('issue_date', 'due_date')
    @classmethod
    def validate_date(cls, v):
        if v and not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('Date must be YYYY-MM-DD format')
        return v


class StatusUpdate(BaseModel):
    status: InvoiceStatus


class InvoiceItemResponse(BaseModel):
    id: str
    invoice_site_id: str
    item_type: str
    description: str
    quantity: float
    rate: float
    amount: float


class InvoiceSiteResponse(BaseModel):
    id: str
    invoice_id: str
    site_id: str
    site_name: str
    subtotal: float
    items: List[InvoiceItemResponse] = []


class InvoiceResponse(BaseModel):
    id: str
    org_id: str
    invoice_id: str
    client_id: str
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    client_email: Optional[str] = None
    issue_date: str
    due_date: str
    status: str
    notes: Optional[str] = None
    grand_total: float
    sites: List[InvoiceSiteResponse] = []
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class InvoiceListItem(BaseModel):
    id: str
    org_id: str
    invoice_id: str
    client_id: str
    client_name: Optional[str] = None
    issue_date: str
    due_date: str
    status: str
    grand_total: float
    created_at: str


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# ============ HELPERS ============

async def generate_invoice_id(org_id: str) -> str:
    cursor = db.invoices.find(
        {"org_id": org_id, "invoice_id": {"$regex": "^INV"}},
        {"invoice_id": 1, "_id": 0}
    ).sort("invoice_id", -1).limit(1)
    last = await cursor.to_list(length=1)
    if last and last[0].get("invoice_id"):
        try:
            num = int(last[0]["invoice_id"].replace("INV", ""))
            return f"INV{str(num + 1).zfill(4)}"
        except ValueError:
            pass
    return "INV0001"


async def enrich_invoice(doc: dict, org_id: str, include_sites: bool = True) -> dict:
    enriched = {**doc}

    client = await db.clients.find_one(
        {"id": doc["client_id"], "org_id": org_id},
        {"client_name": 1, "address": 1, "email": 1, "_id": 0}
    )
    enriched["client_name"] = client.get("client_name") if client else None
    enriched["client_address"] = client.get("address") if client else None
    enriched["client_email"] = client.get("email") if client else None

    if include_sites:
        sites = await db.invoice_sites.find(
            {"invoice_id": doc["id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(length=100)

        enriched_sites = []
        for site in sites:
            items = await db.invoice_items.find(
                {"invoice_site_id": site["id"]}, {"_id": 0}
            ).sort("created_at", 1).to_list(length=200)
            enriched_sites.append({**site, "items": items})
        enriched["sites"] = enriched_sites

    return enriched


async def create_sites_and_items(invoice_id: str, org_id: str, sites_data: list) -> float:
    grand_total = 0.0
    now = datetime.now(timezone.utc).isoformat()

    for site_data in sites_data:
        site_subtotal = 0.0
        site_uuid = str(uuid.uuid4())
        items_to_insert = []

        for item in site_data.items:
            amount = round(item.quantity * item.rate, 2)
            site_subtotal += amount
            items_to_insert.append({
                "id": str(uuid.uuid4()),
                "invoice_site_id": site_uuid,
                "invoice_id": invoice_id,
                "org_id": org_id,
                "item_type": item.item_type.value,
                "description": item.description,
                "quantity": item.quantity,
                "rate": item.rate,
                "amount": amount,
                "created_at": now,
            })

        site_subtotal = round(site_subtotal, 2)
        grand_total += site_subtotal

        await db.invoice_sites.insert_one({
            "id": site_uuid,
            "invoice_id": invoice_id,
            "org_id": org_id,
            "site_id": site_data.site_id,
            "site_name": site_data.site_name,
            "subtotal": site_subtotal,
            "created_at": now,
        })

        if items_to_insert:
            await db.invoice_items.insert_many(items_to_insert)

    return round(grand_total, 2)


async def cascade_delete_invoice(invoice_id: str):
    sites = await db.invoice_sites.find(
        {"invoice_id": invoice_id}, {"id": 1, "_id": 0}
    ).to_list(length=100)
    site_ids = [s["id"] for s in sites]
    if site_ids:
        await db.invoice_items.delete_many({"invoice_site_id": {"$in": site_ids}})
    await db.invoice_sites.delete_many({"invoice_id": invoice_id})


# ============ ENDPOINTS ============

@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    client_id: Optional[str] = Query(None),
    status: Optional[InvoiceStatus] = Query(None),
    month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    query = {"org_id": org_id}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status.value
    if month:
        query["issue_date"] = {"$regex": f"^{month}"}

    total = await db.invoices.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    cursor = db.invoices.find(query, {"_id": 0}).sort(
        [("issue_date", -1), ("created_at", -1)]
    ).skip(skip).limit(page_size)
    invoices = await cursor.to_list(length=page_size)

    enriched = []
    for inv in invoices:
        enriched.append(InvoiceListItem(**(await enrich_invoice(inv, org_id, include_sites=False))))

    return InvoiceListResponse(
        invoices=enriched, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    user_id = token_data.get("sub")

    client = await db.clients.find_one({"id": data.client_id, "org_id": org_id})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    invoice_id_str = await generate_invoice_id(org_id)
    invoice_uuid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    grand_total = await create_sites_and_items(invoice_uuid, org_id, data.sites)

    invoice_doc = {
        "id": invoice_uuid,
        "org_id": org_id,
        "invoice_id": invoice_id_str,
        "client_id": data.client_id,
        "issue_date": data.issue_date,
        "due_date": data.due_date,
        "status": data.status.value,
        "notes": data.notes,
        "grand_total": grand_total,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id,
    }
    await db.invoices.insert_one(invoice_doc)
    return InvoiceResponse(**(await enrich_invoice(invoice_doc, org_id)))


@router.get("/{invoice_uuid}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    invoice = await db.invoices.find_one({"id": invoice_uuid, "org_id": org_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceResponse(**(await enrich_invoice(invoice, org_id)))


@router.put("/{invoice_uuid}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_uuid: str,
    data: InvoiceUpdate,
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    existing = await db.invoices.find_one({"id": invoice_uuid, "org_id": org_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    now = datetime.now(timezone.utc).isoformat()
    update_fields = {"updated_at": now}

    update_dict = data.model_dump(exclude_unset=True)
    for key in ("issue_date", "due_date", "notes"):
        if key in update_dict and update_dict[key] is not None:
            update_fields[key] = update_dict[key]
    if "status" in update_dict and update_dict["status"] is not None:
        update_fields["status"] = data.status.value

    if data.sites is not None:
        await cascade_delete_invoice(invoice_uuid)
        grand_total = await create_sites_and_items(invoice_uuid, org_id, data.sites)
        update_fields["grand_total"] = grand_total

    await db.invoices.update_one({"id": invoice_uuid, "org_id": org_id}, {"$set": update_fields})
    updated = await db.invoices.find_one({"id": invoice_uuid, "org_id": org_id}, {"_id": 0})
    return InvoiceResponse(**(await enrich_invoice(updated, org_id)))


@router.put("/{invoice_uuid}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_uuid: str,
    data: StatusUpdate,
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    existing = await db.invoices.find_one({"id": invoice_uuid, "org_id": org_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    await db.invoices.update_one(
        {"id": invoice_uuid, "org_id": org_id},
        {"$set": {"status": data.status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.invoices.find_one({"id": invoice_uuid, "org_id": org_id}, {"_id": 0})
    return InvoiceResponse(**(await enrich_invoice(updated, org_id)))


@router.delete("/{invoice_uuid}", response_model=MessageResponse)
async def delete_invoice(
    invoice_uuid: str,
    token_data: dict = Depends(get_token_data)
):
    org_id = token_data.get("org_id")
    existing = await db.invoices.find_one({"id": invoice_uuid, "org_id": org_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if existing.get("status") != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft invoices can be deleted"
        )

    await cascade_delete_invoice(invoice_uuid)
    await db.invoices.delete_one({"id": invoice_uuid, "org_id": org_id})
    return MessageResponse(message="Invoice deleted")
