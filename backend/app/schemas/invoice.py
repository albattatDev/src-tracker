import enum
from datetime import date
from decimal import Decimal
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, StringConstraints, model_validator

from app.models import ApprovalStatus
from app.schemas.service_request import SortOrder
from app.schemas.types import UtcDatetime
from app.services.aging import AgingBand

# Money goes out as a string ("1250.50"), never a float, so no digit is lost in JSON.
Money = Annotated[Decimal, PlainSerializer(lambda v: format(v, "f"), return_type=str)]

InvoiceNumber = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class InvoiceSortField(str, enum.Enum):
    CREATED_AT = "created_at"
    AMOUNT = "amount"
    AGE = "age"  # age = days since the due date (or submission date)


class InvoiceListParams(BaseModel):
    approval_status: ApprovalStatus | None = None
    aging_band: AgingBand | None = None
    service_request_id: int | None = None
    q: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = None
    sort: InvoiceSortField = InvoiceSortField.CREATED_AT
    order: SortOrder = SortOrder.DESC
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class InvoiceCreate(BaseModel):
    # Unknown fields (approval_status, created_by, ...) are rejected with 422.
    model_config = ConfigDict(extra="forbid")

    service_request_id: int
    invoice_number: InvoiceNumber
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    submission_date: date
    due_date: date | None = None

    @model_validator(mode="after")
    def due_date_not_before_submission(self) -> Self:
        if self.due_date is not None and self.due_date < self.submission_date:
            raise ValueError("due_date must not be before submission_date")
        return self


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_request_id: int
    service_request_title: str
    assigned_engineer_name: str | None
    invoice_number: str
    amount: Money
    submission_date: date
    due_date: date | None
    approval_status: ApprovalStatus
    created_by_name: str
    approved_by_name: str | None
    approved_at: UtcDatetime | None
    created_at: UtcDatetime
    updated_at: UtcDatetime
    # Returned for every invoice; the UI decides whether to show them (approved: no).
    age_days: int
    aging_band: AgingBand


class InvoicePage(BaseModel):
    items: list[InvoiceOut]
    total: int
    page: int
    page_size: int
