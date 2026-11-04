from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.types import UtcDatetime
from app.services.audit import AuditAction, AuditEntity, redact


class AuditListParams(BaseModel):
    # The filters are enums, so a bad value is a 422. The response fields are plain strings.
    entity_type: AuditEntity | None = None
    action: AuditAction | None = None
    user_id: int | None = None
    # Riyadh calendar dates (YYYY-MM-DD), both inclusive.
    date_from: date | None = None
    date_to: date | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class AuditUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str


class AuditLogOut(BaseModel):
    id: int
    created_at: UtcDatetime
    # None for system actions. An inactive user is still returned with their name.
    user: AuditUser | None
    # Plain str, not the enums: an old row with an unexpected value must never cause a 500.
    action: str
    entity_type: str
    entity_id: int
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None

    @field_validator("old_values", "new_values")
    @classmethod
    def strip_secrets(cls, values: dict[str, Any] | None) -> dict[str, Any] | None:
        # Here, not in the query, so no read path can build an AuditLogOut with a secret in it.
        return redact(values)


class AuditLogPage(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int
