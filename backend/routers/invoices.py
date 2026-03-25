# Invoice Router - Full CRUD for Invoice management module - Migrated to SQLAlchemy

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
import uuid
import re

from db.dependencies import get_db
from models.invoice import Invoice, InvoiceSite, InvoiceItem, Payment, PaymentAllocation
from models.client import Client
from models.site import Site
from models.enums import InvoiceStatus, ItemType, PaymentStatus
from utils.auth import get_token_data

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# ============ SCHEMAS ============

class InvoiceItemCreate(BaseModel):
    item_type: ItemType
    description: str
    quantity: float
    rate: float


class InvoiceSiteCreate(BaseModel):
    site_id: UUID
    items: List[InvoiceItemCreate] = []


class InvoiceCreate(BaseModel):
    client_id: UUID
    issue_date: str  # YYYY-MM-DD format
    due_date: str    # YYYY-MM-DD format
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
    id: UUID
    invoice_site_id: UUID
    item_type: ItemType
    description: str
    quantity: float
    rate: float
    amount: float

    class Config:
        from_attributes = True


class InvoiceSiteResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    site_id: UUID
    site_name: str
    subtotal: float
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: UUID
    org_id: UUID
    invoice_id: str
    client_id: UUID
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    client_email: Optional[str] = None
    issue_date: str
    due_date: str
    status: InvoiceStatus
    notes: Optional[str] = None
    grand_total: float
    sites: List[InvoiceSiteResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class InvoiceListItem(BaseModel):
    id: UUID
    org_id: UUID
    invoice_id: str
    client_id: UUID
    client_name: Optional[str] = None
    issue_date: str
    due_date: str
    status: InvoiceStatus
    grand_total: float
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


class PaymentCreate(BaseModel):
    client_id: UUID
    amount: float
    payment_date: datetime
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    invoice_allocations: List[dict] = []  # [{invoice_id: UUID, amount: float}]


class PaymentResponse(BaseModel):
    id: UUID
    org_id: UUID
    client_id: UUID
    amount: float
    payment_date: datetime
    payment_method: str
    reference_number: Optional[str] = None
    status: PaymentStatus
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ HELPERS ============

async def generate_invoice_id(db: AsyncSession, org_id: UUID) -> str:
    """Generate auto-incrementing invoice ID like INV0001"""
    result = await db.execute(
        select(Invoice.invoice_id)
        .where(Invoice.org_id == org_id)
        .where(Invoice.invoice_id.like("INV%"))
        .order_by(Invoice.invoice_id.desc())
        .limit(1)
    )
    last_id = result.scalar_one_or_none()

    if last_id:
        try:
            num = int(last_id.replace("INV", ""))
            return f"INV{str(num + 1).zfill(4)}"
        except ValueError:
            return "INV0001"
    return "INV0001"


async def create_sites_and_items(
    db: AsyncSession,
    invoice_id: UUID,
    org_id: UUID,
    user_id: UUID,
    sites_data: List[InvoiceSiteCreate]
) -> float:
    """Create invoice sites and items, return grand total"""
    grand_total = 0.0

    for site_data in sites_data:
        # Get site name
        site_result = await db.execute(
            select(Site).where(Site.id == site_data.site_id, Site.org_id == org_id)
        )
        site = site_result.scalar_one_or_none()

        if not site:
            raise HTTPException(status_code=404, detail=f"Site {site_data.site_id} not found")

        site_subtotal = 0.0

        # Create invoice site
        new_site = InvoiceSite(
            org_id=org_id,
            invoice_id=invoice_id,
            site_id=site_data.site_id,
            site_name=site.site_name,
            subtotal=0.0,  # Will update later
            created_by=user_id
        )
        db.add(new_site)
        await db.flush()  # Get the site ID

        # Create items
        for item_data in site_data.items:
            amount = round(item_data.quantity * item_data.rate, 2)
            site_subtotal += amount

            new_item = InvoiceItem(
                org_id=org_id,
                invoice_site_id=new_site.id,
                invoice_id=invoice_id,
                item_type=item_data.item_type,
                description=item_data.description,
                quantity=item_data.quantity,
                rate=item_data.rate,
                amount=amount,
                created_by=user_id
            )
            db.add(new_item)

        # Update site subtotal
        site_subtotal = round(site_subtotal, 2)
        new_site.subtotal = site_subtotal
        grand_total += site_subtotal

    return round(grand_total, 2)


async def cascade_delete_invoice_sites(db: AsyncSession, invoice_id: UUID):
    """Delete all sites and items for an invoice"""
    # Get all sites
    result = await db.execute(
        select(InvoiceSite).where(InvoiceSite.invoice_id == invoice_id)
    )
    sites = result.scalars().all()

    # Delete items and sites
    for site in sites:
        # Delete items
        items_result = await db.execute(
            select(InvoiceItem).where(InvoiceItem.invoice_site_id == site.id)
        )
        items = items_result.scalars().all()
        for item in items:
            await db.delete(item)

        # Delete site
        await db.delete(site)


async def enrich_invoice_with_client(
    db: AsyncSession,
    invoice: Invoice,
    org_id: UUID
) -> dict:
    """Enrich invoice with client details"""
    # Get client details
    client_result = await db.execute(
        select(Client).where(Client.id == invoice.client_id, Client.org_id == org_id)
    )
    client = client_result.scalar_one_or_none()

    return {
        "client_name": client.client_name if client else None,
        "client_address": client.address if client else None,
        "client_email": client.email if client else None
    }


# ============ ENDPOINTS ============

@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    client_id: Optional[UUID] = Query(None),
    status_filter: Optional[InvoiceStatus] = Query(None),
    month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """List all invoices with pagination and filters"""
    org_id = UUID(token_data.get("org_id"))

    # Base query
    query = select(Invoice).where(Invoice.org_id == org_id)

    # Apply filters
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if month:
        query = query.where(Invoice.issue_date.like(f"{month}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Invoice.issue_date.desc(), Invoice.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    invoices = result.scalars().all()

    # Enrich with client details
    enriched_invoices = []
    for invoice in invoices:
        client_data = await enrich_invoice_with_client(db, invoice, org_id)
        invoice_dict = {
            "id": invoice.id,
            "org_id": invoice.org_id,
            "invoice_id": invoice.invoice_id,
            "client_id": invoice.client_id,
            "client_name": client_data["client_name"],
            "issue_date": invoice.issue_date,
            "due_date": invoice.due_date,
            "status": invoice.status,
            "grand_total": invoice.grand_total,
            "created_at": invoice.created_at
        }
        enriched_invoices.append(InvoiceListItem(**invoice_dict))

    return InvoiceListResponse(
        invoices=enriched_invoices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a new invoice with sites and items"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify client exists
    client_result = await db.execute(
        select(Client).where(Client.id == data.client_id, Client.org_id == org_id)
    )
    client = client_result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Generate invoice ID
    invoice_id_str = await generate_invoice_id(db, org_id)

    # Create invoice (without grand_total first)
    new_invoice = Invoice(
        org_id=org_id,
        invoice_id=invoice_id_str,
        client_id=data.client_id,
        issue_date=data.issue_date,
        due_date=data.due_date,
        status=data.status,
        notes=data.notes,
        grand_total=0.0,  # Will update after creating sites
        created_by=user_id
    )

    db.add(new_invoice)
    await db.flush()  # Get the invoice ID

    # Create sites and items, get grand total
    grand_total = await create_sites_and_items(
        db, new_invoice.id, org_id, user_id, data.sites
    )

    # Update invoice grand total
    new_invoice.grand_total = grand_total

    await db.commit()
    await db.refresh(new_invoice)

    # Load with relationships
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.sites).selectinload(InvoiceSite.items)
        )
        .where(Invoice.id == new_invoice.id)
    )
    invoice = result.scalar_one()

    # Enrich with client details
    client_data = await enrich_invoice_with_client(db, invoice, org_id)

    response_dict = {
        **InvoiceResponse.model_validate(invoice).model_dump(),
        **client_data
    }

    return InvoiceResponse(**response_dict)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Get a single invoice by ID"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.sites).selectinload(InvoiceSite.items)
        )
        .where(Invoice.id == invoice_id, Invoice.org_id == org_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Enrich with client details
    client_data = await enrich_invoice_with_client(db, invoice, org_id)

    response_dict = {
        **InvoiceResponse.model_validate(invoice).model_dump(),
        **client_data
    }

    return InvoiceResponse(**response_dict)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update an invoice"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Get existing invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.org_id == org_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Update basic fields
    update_data = data.model_dump(exclude_unset=True, exclude={'sites'})
    for field, value in update_data.items():
        if value is not None:
            setattr(invoice, field, value)

    # If sites are being updated, delete old ones and create new
    if data.sites is not None:
        await cascade_delete_invoice_sites(db, invoice_id)
        grand_total = await create_sites_and_items(
            db, invoice_id, org_id, user_id, data.sites
        )
        invoice.grand_total = grand_total

    await db.commit()
    await db.refresh(invoice)

    # Load with relationships
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.sites).selectinload(InvoiceSite.items)
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one()

    # Enrich with client details
    client_data = await enrich_invoice_with_client(db, invoice, org_id)

    response_dict = {
        **InvoiceResponse.model_validate(invoice).model_dump(),
        **client_data
    }

    return InvoiceResponse(**response_dict)


@router.put("/{invoice_id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_id: UUID,
    data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Update invoice status"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.org_id == org_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Update status
    invoice.status = data.status

    await db.commit()
    await db.refresh(invoice)

    # Load with relationships
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.sites).selectinload(InvoiceSite.items)
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one()

    # Enrich with client details
    client_data = await enrich_invoice_with_client(db, invoice, org_id)

    response_dict = {
        **InvoiceResponse.model_validate(invoice).model_dump(),
        **client_data
    }

    return InvoiceResponse(**response_dict)


@router.delete("/{invoice_id}", response_model=MessageResponse)
async def delete_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Delete an invoice (only draft invoices can be deleted)"""
    org_id = UUID(token_data.get("org_id"))

    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.org_id == org_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Only draft invoices can be deleted"
        )

    # Cascade delete sites and items
    await cascade_delete_invoice_sites(db, invoice_id)

    # Delete invoice
    await db.delete(invoice)
    await db.commit()

    return MessageResponse(message="Invoice deleted successfully")


# ============ PAYMENT ENDPOINTS ============

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """Create a payment and allocate to invoices"""
    org_id = UUID(token_data.get("org_id"))
    user_id = UUID(token_data.get("sub"))

    # Verify client exists
    client_result = await db.execute(
        select(Client).where(Client.id == data.client_id, Client.org_id == org_id)
    )
    if not client_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Client not found")

    # Create payment
    new_payment = Payment(
        org_id=org_id,
        client_id=data.client_id,
        amount=data.amount,
        payment_date=data.payment_date,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        status=PaymentStatus.COMPLETED,
        notes=data.notes,
        created_by=user_id
    )

    db.add(new_payment)
    await db.flush()

    # Create allocations
    for allocation in data.invoice_allocations:
        invoice_id = UUID(allocation["invoice_id"])
        amount = float(allocation["amount"])

        # Verify invoice exists
        inv_result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id, Invoice.org_id == org_id)
        )
        if not inv_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

        new_allocation = PaymentAllocation(
            org_id=org_id,
            payment_id=new_payment.id,
            invoice_id=invoice_id,
            amount=amount,
            created_by=user_id
        )
        db.add(new_allocation)

    await db.commit()
    await db.refresh(new_payment)

    return new_payment


@router.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    client_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data)
):
    """List all payments"""
    org_id = UUID(token_data.get("org_id"))

    query = select(Payment).where(Payment.org_id == org_id)

    if client_id:
        query = query.where(Payment.client_id == client_id)

    query = query.order_by(Payment.payment_date.desc())

    result = await db.execute(query)
    payments = result.scalars().all()

    return payments
