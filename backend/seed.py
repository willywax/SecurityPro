import asyncio
from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.entities import Asset, Client, Guard, Site


async def seed():
    async with SessionLocal() as db:
        exists = await db.scalar(select(Client).limit(1))
        if exists:
            return
        client = Client(name="Acme Industries", contact_name="Jane Doe", billing_email="billing@acme.test")
        db.add(client)
        await db.flush()
        db.add(Site(client_id=client.id, name="HQ", region="Dar", required_guards_day=4, required_guards_night=4))
        db.add(Guard(guard_no="G-001", full_name="Moses Peter", hire_date=date(2024, 1, 2), base_salary_monthly=Decimal('450000')))
        db.add(Asset(asset_tag="RAD-001", type="radio", name="Motorola"))
        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
