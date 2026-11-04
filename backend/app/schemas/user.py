from typing import Annotated, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    StringConstraints,
    model_validator,
)

from app.models import UserRole
from app.schemas.types import UtcDatetime, check_email


class UserBrief(BaseModel):
    """What a picker needs to show a person: never the password hash, role or manager."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str


class UserAdminOut(BaseModel):
    """A row of the admin Users page. There is deliberately no password field here."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    role: UserRole
    manager_id: int | None
    manager_name: str | None
    is_active: bool
    created_at: UtcDatetime
    updated_at: UtcDatetime


PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=75)]
UserEmail = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=255),
    AfterValidator(check_email),
]
# 72 is bcrypt's limit: longer input would be silently cut off.
InitialPassword = Annotated[str, StringConstraints(min_length=8, max_length=72)]


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: PersonName
    last_name: PersonName
    email: UserEmail
    role: UserRole
    manager_id: int | None = None
    password: InitialPassword


class UserUpdate(BaseModel):
    """Only the fields that are sent change. There is no role (a role is fixed at creation,
    because a changed role would leave assigned requests, invoice approvals and contractor
    ownership pointing at the wrong kind of user), no email and no password. extra="forbid"
    turns any of those into a 422. manager_id may be null (no manager); the rest may not."""

    model_config = ConfigDict(extra="forbid")

    first_name: PersonName | None = None
    last_name: PersonName | None = None
    manager_id: int | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def no_explicit_nulls(self) -> Self:
        for field in self.model_fields_set - {"manager_id"}:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self
