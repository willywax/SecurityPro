"""Zone-based data scoping helper for multi-role access control.

Full-access roles (admin, director, hr) get None — no filter applied.
Zone-scoped roles (zone_manager) get a list of their assigned zone UUIDs.
An empty list means the user has the zone_manager role but no zones assigned yet.
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

ALL_ACCESS_ROLES = {"admin", "director", "hr"}


async def get_zone_ids_for_user(
    user_id: UUID,
    role: str,
    org_id: UUID,
    db: AsyncSession,
) -> Optional[List[UUID]]:
    """Return zone IDs accessible to this user.

    Returns None  → caller has full access (no zone filter).
    Returns list  → caller is zone-scoped; filter data to these zone IDs.
    """
    if role in ALL_ACCESS_ROLES:
        return None

    from models.user_zone_assignment import UserZoneAssignment
    result = await db.execute(
        select(UserZoneAssignment.zone_id).where(
            UserZoneAssignment.user_id == user_id,
            UserZoneAssignment.org_id == org_id,
            UserZoneAssignment.status == "active",
        )
    )
    return [row[0] for row in result.all()]
