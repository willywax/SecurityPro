from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Asset, AssetIssuance, Client, Guard, Invoice, Payment, PayrollAdjustment, PayrollItem, PayrollMonth, Site
from app.schemas.entities import (
    AssetCreate,
    AssetRead,
    AssetUpdate,
    ClientCreate,
    ClientRead,
    ClientUpdate,
    GuardCreate,
    GuardRead,
    GuardUpdate,
    InvoiceCreate,
    InvoiceRead,
    IssueAssetRequest,
    IssuanceRead,
    LostAssetRequest,
    PaymentCreate,
    PaymentRead,
    PayrollAdjustmentCreate,
    PayrollAdjustmentRead,
    PayrollItemRead,
    PayrollMonthCreate,
    PayrollMonthRead,
    ReturnAssetRequest,
    SendInvoiceRequest,
    SiteCreate,
    SiteRead,
    SiteUpdate,
)
from app.services.core import *

router = APIRouter()


@router.post("/clients", response_model=ClientRead)
async def create_client(payload: ClientCreate, db: AsyncSession = Depends(get_db)):
    obj = Client(**payload.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/clients", response_model=list[ClientRead])
async def list_clients(q: str | None = None, db: AsyncSession = Depends(get_db)):
    filters = [Client.name.ilike(f"%{q}%")] if q else []
    return await list_entities(db, Client, filters)


@router.get("/clients/{client_id}", response_model=ClientRead)
async def get_client(client_id: UUID, db: AsyncSession = Depends(get_db)):
    return await get_or_404(db, Client, client_id)


@router.patch("/clients/{client_id}", response_model=ClientRead)
async def update_client(client_id: UUID, payload: ClientUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_or_404(db, Client, client_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.post("/sites", response_model=SiteRead)
async def create_site(payload: SiteCreate, db: AsyncSession = Depends(get_db)):
    obj = Site(**payload.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.get("/sites", response_model=list[SiteRead])
async def list_sites(client_id: UUID | None = None, status: str | None = None, q: str | None = None, db: AsyncSession = Depends(get_db)):
    filters = []
    if client_id: filters.append(Site.client_id == client_id)
    if status: filters.append(Site.status == status)
    if q: filters.append(Site.name.ilike(f"%{q}%"))
    return await list_entities(db, Site, filters)


@router.get("/sites/{site_id}", response_model=SiteRead)
async def get_site(site_id: UUID, db: AsyncSession = Depends(get_db)): return await get_or_404(db, Site, site_id)


@router.patch("/sites/{site_id}", response_model=SiteRead)
async def update_site(site_id: UUID, payload: SiteUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_or_404(db, Site, site_id)
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.commit(); await db.refresh(obj); return obj


@router.post("/guards", response_model=GuardRead)
async def create_guard(payload: GuardCreate, db: AsyncSession = Depends(get_db)):
    obj = Guard(**payload.model_dump()); db.add(obj); await db.commit(); await db.refresh(obj); return obj


@router.get("/guards", response_model=list[GuardRead])
async def list_guards(status: str | None = None, q: str | None = None, db: AsyncSession = Depends(get_db)):
    filters = []
    if status: filters.append(Guard.status == status)
    if q: filters.append(Guard.full_name.ilike(f"%{q}%"))
    return await list_entities(db, Guard, filters)


@router.get("/guards/{guard_id}", response_model=GuardRead)
async def get_guard(guard_id: UUID, db: AsyncSession = Depends(get_db)): return await get_or_404(db, Guard, guard_id)


@router.patch("/guards/{guard_id}", response_model=GuardRead)
async def update_guard(guard_id: UUID, payload: GuardUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_or_404(db, Guard, guard_id)
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.commit(); await db.refresh(obj); return obj


@router.post("/assets", response_model=AssetRead)
async def create_asset(payload: AssetCreate, db: AsyncSession = Depends(get_db)):
    obj = Asset(**payload.model_dump()); db.add(obj); await db.commit(); await db.refresh(obj); return obj


@router.get("/assets", response_model=list[AssetRead])
async def list_assets(type: str | None = None, status: str | None = None, condition: str | None = None, q: str | None = None, db: AsyncSession = Depends(get_db)):
    filters = []
    if type: filters.append(Asset.type == type)
    if status: filters.append(Asset.status == status)
    if condition: filters.append(Asset.condition == condition)
    if q: filters.append(Asset.asset_tag.ilike(f"%{q}%"))
    return await list_entities(db, Asset, filters)


@router.get("/assets/{asset_id}", response_model=AssetRead)
async def get_asset(asset_id: UUID, db: AsyncSession = Depends(get_db)): return await get_or_404(db, Asset, asset_id)


@router.patch("/assets/{asset_id}", response_model=AssetRead)
async def update_asset(asset_id: UUID, payload: AssetUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_or_404(db, Asset, asset_id)
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.commit(); await db.refresh(obj); return obj


@router.post("/assets/{asset_id}/issue", response_model=IssuanceRead)
async def issue(asset_id: UUID, payload: IssueAssetRequest, db: AsyncSession = Depends(get_db)): return await issue_asset(db, asset_id, payload)


@router.post("/issuances/{issuance_id}/return", response_model=IssuanceRead)
async def return_asset(issuance_id: UUID, payload: ReturnAssetRequest, db: AsyncSession = Depends(get_db)): return await return_issuance(db, issuance_id, payload)


@router.post("/issuances/{issuance_id}/lost", response_model=IssuanceRead)
async def mark_lost(issuance_id: UUID, payload: LostAssetRequest, db: AsyncSession = Depends(get_db)): return await lost_issuance(db, issuance_id, payload)


@router.get("/assets/{asset_id}/issuances", response_model=list[IssuanceRead])
async def list_issuances(asset_id: UUID, db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(AssetIssuance).where(AssetIssuance.asset_id == asset_id))).scalars().all()


@router.post("/payroll-months", response_model=PayrollMonthRead)
async def create_month(payload: PayrollMonthCreate, db: AsyncSession = Depends(get_db)): return await create_payroll_month(db, payload)


@router.get("/payroll-months", response_model=list[PayrollMonthRead])
async def list_months(db: AsyncSession = Depends(get_db)): return await list_entities(db, PayrollMonth)


@router.post("/payroll-months/{month_id}/generate-items")
async def generate_items(month_id: UUID, db: AsyncSession = Depends(get_db)):
    await generate_payroll_items(db, month_id)
    return {"message": "generated"}


@router.get("/payroll-months/{month_id}/items", response_model=list[PayrollItemRead])
async def list_items(month_id: UUID, db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(PayrollItem).where(PayrollItem.payroll_month_id == month_id))).scalars().all()


@router.post("/payroll-items/{item_id}/adjustments", response_model=PayrollAdjustmentRead)
async def create_adjustment(item_id: UUID, payload: PayrollAdjustmentCreate, db: AsyncSession = Depends(get_db)):
    return await add_adjustment(db, item_id, payload)


@router.delete("/payroll-adjustments/{adj_id}")
async def delete_adjustment(adj_id: UUID, db: AsyncSession = Depends(get_db)):
    adj = await get_or_404(db, PayrollAdjustment, adj_id)
    item = await get_or_404(db, PayrollItem, adj.payroll_item_id)
    month = await get_or_404(db, PayrollMonth, item.payroll_month_id)
    if month.status != "draft":
        return {"message": "payroll locked"}
    await db.delete(adj); await db.commit(); return {"message": "deleted"}


@router.post("/payroll-months/{month_id}/recompute")
async def recompute(month_id: UUID, db: AsyncSession = Depends(get_db)):
    await recompute_payroll(db, month_id)
    return {"message": "recomputed"}


@router.post("/payroll-months/{month_id}/lock")
async def lock(month_id: UUID, db: AsyncSession = Depends(get_db)):
    await lock_payroll(db, month_id)
    return {"message": "locked"}


@router.get("/payroll-months/{month_id}/export.csv")
async def export_payroll(month_id: UUID, db: AsyncSession = Depends(get_db)):
    items = (await db.execute(select(PayrollItem).where(PayrollItem.payroll_month_id == month_id))).scalars().all()
    lines = ["guard_id,base_salary,allowances,overtime,deductions,net_pay"]
    for i in items:
        lines.append(f"{i.guard_id},{i.base_salary},{i.allowances_total},{i.overtime_amount},{i.deductions_total},{i.net_pay}")
    return StreamingResponse(iter(["\n".join(lines)]), media_type="text/csv")


@router.post("/invoices", response_model=InvoiceRead)
async def post_invoice(payload: InvoiceCreate, db: AsyncSession = Depends(get_db)): return await create_invoice(db, payload)


@router.get("/invoices", response_model=list[InvoiceRead])
async def list_invoices(client_id: UUID | None = None, status: str | None = None, db: AsyncSession = Depends(get_db)):
    filters = []
    if client_id: filters.append(Invoice.client_id == client_id)
    if status: filters.append(Invoice.status == status)
    return await list_entities(db, Invoice, filters)


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(invoice_id: UUID, db: AsyncSession = Depends(get_db)): return await get_or_404(db, Invoice, invoice_id)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceRead)
async def patch_invoice(invoice_id: UUID, payload: dict, db: AsyncSession = Depends(get_db)):
    inv = await get_or_404(db, Invoice, invoice_id)
    if inv.status != "draft":
        return inv
    for k, v in payload.items():
        if hasattr(inv, k): setattr(inv, k, v)
    await db.commit(); await db.refresh(inv); return inv


@router.post("/invoices/{invoice_id}/send", response_model=InvoiceRead)
async def send(invoice_id: UUID, payload: SendInvoiceRequest, db: AsyncSession = Depends(get_db)):
    return await send_invoice(db, invoice_id, payload.to_email)


@router.post("/invoices/{invoice_id}/void")
async def void_invoice(invoice_id: UUID, db: AsyncSession = Depends(get_db)):
    inv = await get_or_404(db, Invoice, invoice_id); inv.status = "void"; await db.commit(); return {"message": "voided"}


@router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: UUID, db: AsyncSession = Depends(get_db)):
    inv = await get_or_404(db, Invoice, invoice_id)
    content = f"Invoice {inv.invoice_no}\nTotal: {inv.total}\nStatus: {inv.status}"
    return StreamingResponse(iter([content]), media_type="text/plain")


@router.post("/payments", response_model=PaymentRead)
async def post_payment(payload: PaymentCreate, db: AsyncSession = Depends(get_db)):
    p = await create_payment(db, payload)
    for a in payload.allocations:
        await refresh_invoice_status(db, a.invoice_id)
    return p


@router.get("/payments", response_model=list[PaymentRead])
async def list_payments(client_id: UUID | None = None, db: AsyncSession = Depends(get_db)):
    filters = [Payment.client_id == client_id] if client_id else []
    return await list_entities(db, Payment, filters)


@router.get("/payments/{payment_id}", response_model=PaymentRead)
async def get_payment(payment_id: UUID, db: AsyncSession = Depends(get_db)): return await get_or_404(db, Payment, payment_id)


@router.patch("/payments/{payment_id}", response_model=PaymentRead)
async def patch_payment(payment_id: UUID, payload: dict, db: AsyncSession = Depends(get_db)):
    p = await get_or_404(db, Payment, payment_id)
    alloc_count = await db.scalar(select(PaymentAllocation).where(PaymentAllocation.payment_id == p.id).limit(1))
    if alloc_count:
        return p
    for k, v in payload.items():
        if hasattr(p, k): setattr(p, k, v)
    await db.commit(); await db.refresh(p)
    return p


@router.get("/clients/{client_id}/statement")
async def statement(client_id: UUID, from_: date = Query(alias="from"), to: date = Query(), format: str = "json", db: AsyncSession = Depends(get_db)):
    client = await get_or_404(db, Client, client_id)
    invoices = (await db.execute(select(Invoice).where(and_(Invoice.client_id == client_id, Invoice.issue_date >= from_, Invoice.issue_date <= to, Invoice.status != "void")))).scalars().all()
    payments = (await db.execute(select(Payment).where(and_(Payment.client_id == client_id, Payment.payment_date >= from_, Payment.payment_date <= to)))).scalars().all()
    opening = client.opening_balance
    inv_total = sum([i.total for i in invoices], 0)
    pay_total = sum([p.amount for p in payments], 0)
    closing = opening + inv_total - pay_total
    data = {"opening_balance": opening, "invoices": [{"invoice_no": i.invoice_no, "total": i.total} for i in invoices], "payments": [{"id": str(p.id), "amount": p.amount} for p in payments], "closing_balance": closing}
    if format == "csv":
        lines = ["type,ref,amount"] + [f"invoice,{i.invoice_no},{i.total}" for i in invoices] + [f"payment,{p.id},{p.amount}" for p in payments]
        lines.append(f"closing,balance,{closing}")
        return StreamingResponse(iter(["\n".join(lines)]), media_type="text/csv")
    return data
