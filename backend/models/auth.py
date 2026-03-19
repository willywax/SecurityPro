"""Authentication and user models."""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from models.base import BaseModel
from models.enums import UserRole


class User(BaseModel):
    """User model for authentication and authorization."""
    __tablename__ = "users"

    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole, name="user_role", create_type=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="user", foreign_keys=[employee_id])
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class Role(BaseModel):
    """Custom role model for advanced permissions (future use)."""
    __tablename__ = "roles"

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    permissions = Column(JSON, default=list, nullable=False)  # List of permission strings
    is_system = Column(Boolean, default=False, nullable=False)

    # Relationships
    # organization relationship inherited from BaseModel


class RefreshToken(BaseModel):
    """JWT refresh token tracking."""
    __tablename__ = "refresh_tokens"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, nullable=False, index=True, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_revoked = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")
