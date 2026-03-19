"""Client model."""
from sqlalchemy import Column, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
from models.base import BaseModel
from models.enums import ClientStatus


class Client(BaseModel):
    """Client/customer model."""
    __tablename__ = "clients"

    client_id = Column(String, nullable=False, index=True)  # CLT0001, CLT0002, etc.
    client_name = Column(String, nullable=False)
    contact_person = Column(String, nullable=True)
    phone_1 = Column(String, nullable=True)
    phone_2 = Column(String, nullable=True)
    email = Column(String, nullable=True)
    billing_email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    status = Column(
        SQLEnum(ClientStatus, name="client_status", create_type=True),
        default=ClientStatus.ACTIVE,
        nullable=False
    )
    notes = Column(String, nullable=True)

    # Relationships
    sites = relationship("Site", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client")
    payments = relationship("Payment", back_populates="client")
