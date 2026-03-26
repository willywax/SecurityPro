"""Signed URL refresh endpoint — validates org ownership before signing."""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from db.dependencies import get_db
from utils.auth import get_token_data
from models.employee import Employee, EmployeeDocument

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/signed-url")
async def get_signed_url(
    path: str = Query(..., description="GCS object path"),
    type: str = Query("view", description="view or download"),
    filename: Optional[str] = Query(None, description="Original filename for download"),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_token_data),
):
    """
    Generate a fresh signed URL for a GCS path.
    Validates the path belongs to the requesting organization before signing.
    """
    from services.storage_service import storage_service

    org_id = UUID(token_data.get("org_id"))

    # Validate path belongs to this org via employee_documents or employees.photo_path
    is_authorized = False

    # Check employee documents
    doc_result = await db.execute(
        select(EmployeeDocument).where(
            EmployeeDocument.gcs_path == path,
            EmployeeDocument.org_id == org_id,
        )
    )
    if doc_result.scalar_one_or_none():
        is_authorized = True

    if not is_authorized:
        # Check employee photo_path
        emp_result = await db.execute(
            select(Employee).where(
                Employee.photo_path == path,
                Employee.org_id == org_id,
            )
        )
        if emp_result.scalar_one_or_none():
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to access this file")

    try:
        if type == "download":
            url = storage_service.get_download_url(
                path,
                original_filename=filename or "document",
                expiry_minutes=60,
            )
        else:
            url = storage_service.get_signed_url(path, expiry_minutes=60)

        return {"url": url, "expires_in": 3600}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {exc}")
