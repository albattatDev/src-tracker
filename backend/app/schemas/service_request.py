import enum
from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import Priority, SRStatus
from app.schemas.types import UtcDatetime


class SRSortField(str, enum.Enum):
    CREATED_AT = "created_at"
    PRIORITY = "priority"


class SortOrder(str, enum.Enum):
    ASC = "asc"
    DESC = "desc"


class SRListParams(BaseModel):
    status: SRStatus | None = None
    priority: Priority | None = None
    assigned_engineer_id: int | None = None
    # Riyadh calendar dates (YYYY-MM-DD), both inclusive.
    created_from: date | None = None
    created_to: date | None = None
    sort: SRSortField = SRSortField.CREATED_AT
    order: SortOrder = SortOrder.DESC
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# Surrounding whitespace is removed before the length checks, so "   " counts as empty.
TrimmedStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SRCreate(BaseModel):
    # Unknown fields (requester_id, status, ...) are rejected with 422, not ignored.
    model_config = ConfigDict(extra="forbid")

    title: TrimmedStr = Field(max_length=200)
    description: TrimmedStr
    priority: Priority


class SRAssign(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assigned_engineer_id: int


class SRStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SRStatus


class SRRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    priority: Priority
    status: SRStatus
    requester_name: str
    assigned_engineer_name: str | None
    # The id behind the name, so a client can tell which engineer is assigned without comparing
    # display names (two engineers can share one). NULL when nobody is assigned.
    assigned_engineer_id: int | None
    created_at: UtcDatetime
    updated_at: UtcDatetime


class SRPage(BaseModel):
    items: list[SRRead]
    total: int
    page: int
    page_size: int
