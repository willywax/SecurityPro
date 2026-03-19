"""Authentication Router - Migrated to SQLAlchemy."""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID

from db.dependencies import get_db
from models.auth import User, RefreshToken as RefreshTokenModel
from models.organization import Organization
from models.enums import UserRole
from schemas.auth import UserResponse, OrganizationResponse
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_data,
    get_refresh_token_expiry
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============ REQUEST/RESPONSE MODELS ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


# ============ ENDPOINTS ============

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return tokens"""
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Get organization
    org_result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = org_result.scalar_one_or_none()
    org_response = None
    if org:
        org_response = OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            logo_url=org.logo_url,
            accent_color=org.accent_color,
            address=org.address,
            phone=org.phone,
            email=org.email,
            website=org.website,
            is_active=org.is_active,
            bank_details=org.bank_details,
            created_at=org.created_at,
            updated_at=org.updated_at
        )

    # Create tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "org_id": str(user.org_id),
        "role": user.role.value
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token
    refresh_token_obj = RefreshTokenModel(
        user_id=user.id,
        org_id=user.org_id,
        token=refresh_token,
        expires_at=get_refresh_token_expiry(),
        is_revoked=False
    )
    db.add(refresh_token_obj)

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)

    # Build user response
    user_response = UserResponse(
        id=user.id,
        org_id=user.org_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
        created_by=user.created_by,
        employee_id=user.employee_id
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token"""
    # Decode refresh token
    try:
        payload = decode_token(request.refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    # Check if refresh token exists and is not revoked
    result = await db.execute(
        select(RefreshTokenModel).where(
            RefreshTokenModel.token == request.refresh_token,
            RefreshTokenModel.is_revoked == False
        )
    )
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )

    # Create new access token
    token_data = {
        "sub": payload["sub"],
        "email": payload["email"],
        "org_id": payload["org_id"],
        "role": payload["role"]
    }

    new_access_token = create_access_token(token_data)

    return TokenResponse(access_token=new_access_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    token_data: dict = Depends(get_token_data),
    db: AsyncSession = Depends(get_db)
):
    """Logout user and revoke all refresh tokens"""
    user_id = UUID(token_data.get("sub"))

    # Revoke all refresh tokens for this user
    await db.execute(
        update(RefreshTokenModel)
        .where(RefreshTokenModel.user_id == user_id)
        .values(is_revoked=True)
    )
    await db.commit()

    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    token_data: dict = Depends(get_token_data),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user"""
    user_id = UUID(token_data.get("sub"))

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,
        org_id=user.org_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
        created_by=user.created_by,
        employee_id=user.employee_id
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset (placeholder - would send email in production)"""
    # Check if user exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    # In production, this would send a password reset email
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )
