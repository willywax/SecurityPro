"""Users management router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db
from models.auth import User
from models.employee import Employee
from models.enums import UserRole
from schemas.auth import UserResponse
from utils.auth import get_token_data, hash_password

router = APIRouter(prefix="/users", tags=["Users Management"])

ALLOWED_MANAGEMENT_ROLES = {UserRole.ADMIN.value, UserRole.DIRECTOR.value}


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole
    employee_id: UUID | None = None
    is_active: bool = True


class UserUpdateRequest(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    role: UserRole | None = None
    employee_id: UUID | None = None
    is_active: bool | None = None


class UserListItem(UserResponse):
    employee_name: str | None = None


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


def require_management_access(token_data: dict) -> tuple[UUID, UUID]:
    role = token_data.get("role")
    if role not in ALLOWED_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return UUID(token_data.get("org_id")), UUID(token_data.get("sub"))


async def get_employee_name(db: AsyncSession, employee_id: UUID | None, org_id: UUID) -> str | None:
    if not employee_id:
        return None
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        return None
    return " ".join(part for part in [employee.first_name, employee.middle_name, employee.last_name] if part)


async def validate_employee_assignment(
    db: AsyncSession,
    org_id: UUID,
    employee_id: UUID | None,
    user_id: UUID | None = None,
) -> None:
    if not employee_id:
        return

    employee_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = employee_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    existing_query = select(User).where(User.org_id == org_id, User.employee_id == employee_id)
    if user_id:
        existing_query = existing_query.where(User.id != user_id)
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee already linked to another user")


async def ensure_email_is_unique(
    db: AsyncSession,
    org_id: UUID,
    email: str,
    user_id: UUID | None = None,
) -> None:
    query = select(User).where(
        User.org_id == org_id,
        func.lower(User.email) == email.lower(),
    )
    if user_id:
        query = query.where(User.id != user_id)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with that email already exists")


async def build_user_list_item(db: AsyncSession, user: User) -> UserListItem:
    employee_name = await get_employee_name(db, user.employee_id, user.org_id)
    return UserListItem(
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
        employee_id=user.employee_id,
        employee_name=employee_name,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: UserRole | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id, _ = require_management_access(token_data)

    query = select(User).where(User.org_id == org_id)
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                User.first_name.ilike(term),
                User.last_name.ilike(term),
                User.email.ilike(term),
            )
        )
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))

    total = int(
        (
            await db.execute(
                select(func.count()).select_from(query.subquery())
            )
        ).scalar()
        or 0
    )

    result = await db.execute(
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = result.scalars().all()
    rows = [await build_user_list_item(db, user) for user in users]

    return UserListResponse(
        users=rows,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 1,
    )


@router.post("", response_model=UserListItem, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id, actor_id = require_management_access(token_data)

    await ensure_email_is_unique(db, org_id, payload.email)
    await validate_employee_assignment(db, org_id, payload.employee_id)

    user = User(
        org_id=org_id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        role=payload.role,
        employee_id=payload.employee_id,
        is_active=payload.is_active,
        created_by=actor_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await build_user_list_item(db, user)


@router.put("/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    org_id, actor_id = require_management_access(token_data)

    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == org_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "email" in update_data:
        await ensure_email_is_unique(db, org_id, update_data["email"], user_id=user.id)
        user.email = update_data["email"].lower()
    if "employee_id" in update_data:
        await validate_employee_assignment(db, org_id, update_data["employee_id"], user_id=user.id)
        user.employee_id = update_data["employee_id"]
    if "password" in update_data and update_data["password"]:
        user.password_hash = hash_password(update_data["password"])
    if "first_name" in update_data:
        user.first_name = update_data["first_name"].strip()
    if "last_name" in update_data:
        user.last_name = update_data["last_name"].strip()
    if "role" in update_data:
        user.role = update_data["role"]
    if "is_active" in update_data:
        user.is_active = update_data["is_active"]

    user.created_by = user.created_by or actor_id

    await db.commit()
    await db.refresh(user)
    return await build_user_list_item(db, user)
