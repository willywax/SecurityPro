"""User-to-zone access scoping assignments."""
from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel


class UserZoneAssignment(BaseModel):
    """Links a user account to zones they are allowed to access.

    Used for zone-scoped roles (e.g. zone_manager) — full-access
    roles (admin/director/hr) bypass this table entirely.
    """
    __tablename__ = "user_zone_assignments"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    zone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("zones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_date = Column(Date, nullable=False)
    assigned_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(String, nullable=False, default="active")
