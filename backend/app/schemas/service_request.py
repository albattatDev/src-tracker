import enum
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import Priority, SRStatus


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


class SRRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    priority: Priority
    status: SRStatus
    requester_name: str
    assigned_engineer_name: str | None
    created_at: datetime
    updated_at: datetime


class SRPage(BaseModel):
    items: list[SRRead]
    total: int
    page: int
    page_size: int
