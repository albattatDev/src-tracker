import re
from datetime import date
from typing import Annotated, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.models import DocType
from app.schemas.types import UtcDatetime
from app.services.compliance import DocumentStatus

# A deliberately simple check (one @, a dot in the domain, no spaces). It catches typos
# without adding the email-validator dependency.
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _check_email(value: str) -> str:
    if not _EMAIL.match(value):
        raise ValueError("Enter a valid email address")
    return value


ContractorName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
ContactEmail = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=255),
    AfterValidator(_check_email),
]


class ContractorListParams(BaseModel):
    q: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None
    is_active: bool | None = None  # None = both
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ContractorCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ContractorName
    contact_email: ContactEmail
    internal_manager_id: int


class ContractorUpdate(BaseModel):
    """Only the fields that are sent change. An explicit null is rejected: none of these
    columns accepts NULL."""

    model_config = ConfigDict(extra="forbid")

    name: ContractorName | None = None
    contact_email: ContactEmail | None = None
    internal_manager_id: int | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def no_explicit_nulls(self) -> Self:
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class DocCounts(BaseModel):
    valid: int = 0
    expiring_soon: int = 0
    expired: int = 0


class DocumentOut(BaseModel):
    id: int
    contractor_id: int
    doc_type: DocType
    original_filename: str
    expiry_date: date
    status: DocumentStatus
    days_left: int  # negative once expired
    uploaded_by_name: str
    uploaded_at: UtcDatetime
    is_current: bool


class CurrentDocumentOut(DocumentOut):
    # How many uploads exist for this type, the current one included (for "History (n)").
    upload_count: int


class ContractorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    contact_email: str
    internal_manager_id: int
    internal_manager_name: str
    is_active: bool
    created_at: UtcDatetime
    updated_at: UtcDatetime


class ContractorListItem(ContractorOut):
    doc_counts: DocCounts
    types_uploaded: int  # how many of the 5 document types have a current document


class ContractorPage(BaseModel):
    items: list[ContractorListItem]
    total: int
    page: int
    page_size: int


class ContractorDetail(ContractorOut):
    current_documents: list[CurrentDocumentOut]
