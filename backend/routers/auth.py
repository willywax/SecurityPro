# Authentication Router

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid

from models import User, UserResponse, Organization, OrganizationResponse, RefreshToken, UserRole
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

# Database instance will be injected
db = None

def set_db(database):
    global db
    db = database


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
async def login(request: LoginRequest):
    """Authenticate user and return tokens"""
    # Find user by email
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(request.password, user_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Get organization
    org_doc = await db.organizations.find_one({"id": user_doc["org_id"]}, {"_id": 0})
    org_response = None
    if org_doc:
        org_response = OrganizationResponse(
            id=org_doc["id"],
            name=org_doc["name"],
            slug=org_doc["slug"],
            logo_url=org_doc.get("logo_url"),
            accent_color=org_doc.get("accent_color", "#3B82F6")
        )
    
    # Create tokens
    token_data = {
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "org_id": user_doc["org_id"],
        "role": user_doc["role"]
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store refresh token
    refresh_token_doc = RefreshToken(
        user_id=user_doc["id"],
        org_id=user_doc["org_id"],
        token=refresh_token,
        expires_at=get_refresh_token_expiry()
    )
    await db.refresh_tokens.insert_one(refresh_token_doc.model_dump())
    
    # Update last login
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Build user response
    user_response = UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        first_name=user_doc["first_name"],
        last_name=user_doc["last_name"],
        role=user_doc["role"],
        org_id=user_doc["org_id"],
        is_active=user_doc.get("is_active", True),
        last_login=datetime.now(timezone.utc),
        organization=org_response
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest):
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
    stored_token = await db.refresh_tokens.find_one(
        {"token": request.refresh_token, "is_revoked": False},
        {"_id": 0}
    )
    
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
async def logout(token_data: dict = Depends(get_token_data)):
    """Logout user and revoke all refresh tokens"""
    user_id = token_data.get("sub")
    
    # Revoke all refresh tokens for this user
    await db.refresh_tokens.update_many(
        {"user_id": user_id},
        {"$set": {"is_revoked": True}}
    )
    
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_current_user(token_data: dict = Depends(get_token_data)):
    """Get current authenticated user"""
    user_id = token_data.get("sub")
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get organization
    org_doc = await db.organizations.find_one({"id": user_doc["org_id"]}, {"_id": 0})
    org_response = None
    if org_doc:
        org_response = OrganizationResponse(
            id=org_doc["id"],
            name=org_doc["name"],
            slug=org_doc["slug"],
            logo_url=org_doc.get("logo_url"),
            accent_color=org_doc.get("accent_color", "#3B82F6")
        )
    
    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        first_name=user_doc["first_name"],
        last_name=user_doc["last_name"],
        role=user_doc["role"],
        org_id=user_doc["org_id"],
        is_active=user_doc.get("is_active", True),
        last_login=user_doc.get("last_login"),
        organization=org_response
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset (placeholder - would send email in production)"""
    # Check if user exists
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    # In production, this would send a password reset email
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )
