from datetime import date, datetime
from decimal import Decimal
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UUIDModel(ORMModel):
    id: UUID


class TimestampModel(UUIDModel):
    created_at: datetime
    updated_at: datetime


class Message(BaseModel):
    message: str


T = TypeVar("T")


class ListResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
