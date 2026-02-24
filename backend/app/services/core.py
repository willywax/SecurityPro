from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import Select, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import (
    Asset,
    AssetIssuance,
    Client,
    EmailOutbox,
    Guard,
    Invoice,
    InvoiceItem,
    Payment,
    PaymentAllocation,
    PayrollAdjustment,
    PayrollItem,
    PayrollMonth,
    Site,
)


async def list_entities(session: AsyncSession, model, filters: list = []):
    q: Select = select(model)
    for f in filters:
        q = q.where(f)
    rows = (await session.execute(q.order_by(model.created_at.desc() if hasattr(model, 'created_at') else model.id.desc()))).scalars().all()
    return rows


async def get_or_404(session: AsyncSession, model, entity_id: UUID):
    entity = await session.get(model, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return entity


async def issue_asset(session: AsyncSession, asset_id: UUID, payload):
    asset = await get_or_404(session, Asset, asset_id)
    if asset.status != "available":
        raise HTTPException(status_code=400, detail="Asset is not available")
    open_issue = await session.scalar(select(func.count()).select_from(AssetIssuance).where(and_(AssetIssuance.asset_id == asset_id, AssetIssuance.status == "issued")))
    if open_issue:
        raise HTTPException(status_code=400, detail="Asset already has open issuance")
    issuance = AssetIssuance(asset_id=asset_id, **payload.model_dump())
    asset.status = "issued"
    session.add(issuance)
    await session.commit()
    await session.refresh(issuance)
    return issuance


async def return_issuance(session: AsyncSession, issuance_id: UUID, payload):
    issuance = await get_or_404(session, AssetIssuance, issuance_id)
    if issuance.status != "issued":
        raise HTTPException(status_code=400, detail="Issuance is not open")
    asset = await get_or_404(session, Asset, issuance.asset_id)
    issuance.status = "returned"
    issuance.returned_at = datetime.utcnow()
    issuance.return_condition = payload.return_condition
    asset.status = "maintenance" if payload.return_condition == "damaged" else "available"
    await session.commit()
    return issuance


async def lost_issuance(session: AsyncSession, issuance_id: UUID, payload):
    issuance = await get_or_404(session, AssetIssuance, issuance_id)
    asset = await get_or_404(session, Asset, issuance.asset_id)
    issuance.status = "lost"
    issuance.returned_at = datetime.utcnow()
    issuance.return_condition = "lost"
    issuance.notes = payload.notes
    asset.status = "lost"
    await session.commit()
    return issuance


async def create_payroll_month(session: AsyncSession, month):
    obj = PayrollMonth(month=month.month.replace(day=1), status="draft")
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


async def ensure_draft_month(session: AsyncSession, month_id: UUID):
    month = await get_or_404(session, PayrollMonth, month_id)
    if month.status != "draft":
        raise HTTPException(status_code=400, detail="Payroll month is not draft")
    return month


async def generate_payroll_items(session: AsyncSession, month_id: UUID):
    month = await ensure_draft_month(session, month_id)
    guards = (await session.execute(select(Guard).where(Guard.status == "active"))).scalars().all()
    for g in guards:
        exists = await session.scalar(select(PayrollItem.id).where(and_(PayrollItem.payroll_month_id == month.id, PayrollItem.guard_id == g.id)))
        if exists:
            continue
        allowances = g.housing_allowance_monthly + g.transport_allowance_monthly + g.other_allowance_monthly
        net = g.base_salary_monthly + allowances
        session.add(PayrollItem(payroll_month_id=month.id, guard_id=g.id, base_salary=g.base_salary_monthly, allowances_total=allowances, net_pay=net))
    await session.commit()


async def recompute_payroll(session: AsyncSession, month_id: UUID):
    await ensure_draft_month(session, month_id)
    items = (await session.execute(select(PayrollItem).where(PayrollItem.payroll_month_id == month_id))).scalars().all()
    for item in items:
        adjs = (await session.execute(select(PayrollAdjustment).where(PayrollAdjustment.payroll_item_id == item.id))).scalars().all()
        allowance = sum([a.amount for a in adjs if a.type == "allowance"], Decimal("0"))
        overtime = sum([a.amount for a in adjs if a.type == "overtime"], Decimal("0"))
        deduction = sum([a.amount for a in adjs if a.type == "deduction"], Decimal("0"))
        item.overtime_amount = overtime
        item.deductions_total = deduction
        item.allowances_total = item.allowances_total + allowance
        item.net_pay = item.base_salary + item.allowances_total + item.overtime_amount - item.deductions_total - item.advances_deducted
    await session.commit()


async def add_adjustment(session: AsyncSession, payroll_item_id: UUID, payload):
    item = await get_or_404(session, PayrollItem, payroll_item_id)
    month = await get_or_404(session, PayrollMonth, item.payroll_month_id)
    if month.status != "draft":
        raise HTTPException(status_code=400, detail="Payroll month is locked")
    adj = PayrollAdjustment(payroll_item_id=payroll_item_id, **payload.model_dump())
    session.add(adj)
    await session.commit()
    await session.refresh(adj)
    return adj


async def lock_payroll(session: AsyncSession, month_id: UUID):
    month = await ensure_draft_month(session, month_id)
    month.status = "locked"
    await session.commit()


async def create_invoice(session: AsyncSession, payload):
    year = payload.issue_date.year
    like = f"INV-{year}-%"
    seq = await session.scalar(select(func.count()).select_from(Invoice).where(Invoice.invoice_no.like(like)))
    invoice_no = f"INV-{year}-{seq + 1:05d}"
    subtotal = sum([(i.quantity * i.unit_price) for i in payload.items], Decimal("0"))
    total = subtotal + payload.tax_total
    inv = Invoice(
        client_id=payload.client_id,
        invoice_no=invoice_no,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        currency=payload.currency,
        tax_total=payload.tax_total,
        subtotal=subtotal,
        total=total,
        status="draft",
        notes=payload.notes,
    )
    session.add(inv)
    await session.flush()
    for item in payload.items:
        session.add(InvoiceItem(invoice_id=inv.id, site_id=item.site_id, description=item.description, quantity=item.quantity, unit_price=item.unit_price, amount=item.quantity * item.unit_price))
    await session.commit()
    await session.refresh(inv)
    return inv


async def send_invoice(session: AsyncSession, invoice_id: UUID, to_email: str):
    inv = await get_or_404(session, Invoice, invoice_id)
    if inv.status == "void":
        raise HTTPException(status_code=400, detail="Cannot send void invoice")
    inv.status = "sent"
    inv.sent_to_email = to_email
    inv.sent_at = datetime.utcnow()
    out = EmailOutbox(type="invoice", to_email=to_email, subject=f"Invoice {inv.invoice_no}", body="Please find attached.", status="queued")
    session.add(out)
    await session.commit()
    return inv


async def create_payment(session: AsyncSession, payload):
    payment = Payment(client_id=payload.client_id, payment_date=payload.payment_date, amount=payload.amount, method=payload.method, reference=payload.reference, notes=payload.notes)
    session.add(payment)
    await session.flush()
    allocated = Decimal("0")
    for alloc in payload.allocations:
        inv = await get_or_404(session, Invoice, alloc.invoice_id)
        paid_sum = await session.scalar(select(func.coalesce(func.sum(PaymentAllocation.amount), 0)).where(PaymentAllocation.invoice_id == inv.id))
        balance = inv.total - Decimal(str(paid_sum))
        if alloc.amount > balance:
            raise HTTPException(status_code=400, detail=f"Allocation exceeds balance for {inv.invoice_no}")
        allocated += alloc.amount
        session.add(PaymentAllocation(payment_id=payment.id, invoice_id=alloc.invoice_id, amount=alloc.amount))
    if allocated > payload.amount:
        raise HTTPException(status_code=400, detail="Allocations exceed payment amount")
    await session.commit()
    await session.refresh(payment)
    return payment


async def refresh_invoice_status(session: AsyncSession, invoice_id: UUID):
    inv = await get_or_404(session, Invoice, invoice_id)
    if inv.status == "void":
        return
    paid = await session.scalar(select(func.coalesce(func.sum(PaymentAllocation.amount), 0)).where(PaymentAllocation.invoice_id == invoice_id))
    balance = inv.total - Decimal(str(paid))
    if balance <= 0:
        inv.status = "paid"
    elif balance < inv.total:
        inv.status = "part_paid"
    elif inv.sent_at:
        inv.status = "sent"
    else:
        inv.status = "draft"
    await session.commit()
