import enum
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from pydantic_core import to_jsonable_python
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models import AuditLog, Base


class AuditAction(str, enum.Enum):
    """The action names listed for audit_log.action in docs/erd.md."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    ASSIGN = "assign"
    REJECT = "reject"


class AuditEntity(str, enum.Enum):
    """audit_log.entity_type values. Add a member when a new table starts being audited."""

    SERVICE_REQUEST = "service_request"
    INVOICE = "invoice"
    CONTRACTOR = "contractor"
    CONTRACTOR_DOCUMENT = "contractor_document"
    USER = "user"


# Bookkeeping columns that change on every write and say nothing about what was edited.
_NOISE_COLUMNS = frozenset({"id", "created_at", "updated_at"})
# Columns that must never reach audit_log. Excluded here, in the one place that reads row
# values, so no caller has to remember to strip them.
SECRET_COLUMNS = frozenset({"password_hash"})


def row_values(row: Base) -> dict[str, Any]:
    """The row's column values by column name, for old_values / new_values. Take it before
    a change for old_values and after for new_values, so a new column is audited without
    anyone editing a field list. Values can still be enums or dates; log_action makes them
    JSON-safe.
    """
    return {
        column.key: getattr(row, column.key)
        for column in inspect(row).mapper.column_attrs
        if column.key not in _NOISE_COLUMNS | SECRET_COLUMNS
    }


@contextmanager
def audited_write(db: Session) -> Iterator[None]:
    """Wraps a change and its log_action call. The one commit at the end saves both
    together, and any error undoes both."""
    try:
        yield
        db.commit()
    except Exception:
        # Roll back on purpose. In production get_db closes the session and would undo it
        # anyway, but this keeps the guarantee ("nothing saved if anything fails") true on
        # its own, and the audit-failure test relies on it because its session is shared.
        db.rollback()
        raise


def log_action(
    db: Session,
    user_id: int | None,
    action: AuditAction,
    entity_type: AuditEntity,
    entity_id: int,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> AuditLog:
    """Adds one audit_log row to the session. It never commits: the caller commits, so the
    audit row and the change it describes are saved together or not at all.
    The table is append-only, so this module only ever inserts.
    """
    entry = AuditLog(
        user_id=user_id,
        # .value, not the enum itself: the column stores the plain string.
        action=action.value,
        entity_type=entity_type.value,
        entity_id=entity_id,
        # Enums and dates become plain strings, because the JSON column cannot store them.
        old_values=to_jsonable_python(old_values),
        new_values=to_jsonable_python(new_values),
    )
    db.add(entry)
    return entry
