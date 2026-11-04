"""Human labels for audit rows: the name behind an entity id or a foreign-key value.

Read-only and additive: nothing here changes what is stored. A page of rows is resolved with
one query per entity type (users, contractors, service requests, invoices, documents), never
one per row, so the cost does not grow with the page size.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.models import AuditLog, Contractor, ContractorDocument, Invoice, ServiceRequest, User
from app.services.audit import AuditEntity

# Foreign-key fields found in old_values / new_values, and the kind of row each one points at.
_USER_FIELDS = (
    "uploaded_by",
    "created_by",
    "approved_by",
    "requester_id",
    "assigned_engineer_id",
    "manager_id",
    "internal_manager_id",
    "user_id",
)
_FIELD_KIND: dict[str, str] = {name: "user" for name in _USER_FIELDS} | {
    "contractor_id": "contractor",
    "service_request_id": "service_request",
}

# audit_log.entity_type -> the kind of row entity_id points at.
_ENTITY_KIND = {
    AuditEntity.USER.value: "user",
    AuditEntity.CONTRACTOR.value: "contractor",
    AuditEntity.SERVICE_REQUEST.value: "service_request",
    AuditEntity.INVOICE.value: "invoice",
    AuditEntity.CONTRACTOR_DOCUMENT.value: "document",
}

_IdColumn = InstrumentedAttribute[int]
# User.full_name is a SQL expression, the other names are plain columns.
_NameColumn = InstrumentedAttribute[str] | ColumnElement[str]


@dataclass
class Names:
    """Every name one page of rows needs, loaded up front: id -> name per kind of row."""

    users: dict[int, str]
    contractors: dict[int, str]
    requests: dict[int, str]
    invoices: dict[int, str]
    documents: dict[int, tuple[str, int]]  # id -> (doc type, contractor id)

    def for_field_kind(self, kind: str) -> dict[int, str]:
        """The names a foreign-key field's kind points at (see _FIELD_KIND)."""
        return {"user": self.users, "contractor": self.contractors, "service_request": self.requests}[kind]


@dataclass
class EntryLabels:
    entity_label: str | None = None
    # field -> {str(id): name}, for the foreign-key fields of both snapshots.
    value_labels: dict[str, dict[str, str]] = field(default_factory=dict)


def _as_id(value: Any) -> int | None:
    # bool is an int in Python, but True is never an id.
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _snapshot_value(entry: AuditLog, key: str) -> Any:
    """A value from the stored snapshots (new first, then old): the fallback when the row
    itself is gone, for example after a delete."""
    for values in (entry.new_values, entry.old_values):
        if values and values.get(key) is not None:
            return values[key]
    return None


def _snapshot_text(entry: AuditLog, key: str) -> str | None:
    value = _snapshot_value(entry, key)
    return value if isinstance(value, str) and value != "" else None


def _references(entry: AuditLog) -> Iterable[tuple[str, str, int]]:
    """(field, kind, id) for every foreign-key value in either snapshot."""
    for values in (entry.old_values, entry.new_values):
        for name, value in (values or {}).items():
            kind = _FIELD_KIND.get(name)
            ref = _as_id(value)
            if kind is not None and ref is not None:
                yield name, kind, ref


def _user_snapshot_name(entry: AuditLog) -> str | None:
    parts = [_snapshot_text(entry, "first_name"), _snapshot_text(entry, "last_name")]
    return " ".join(part for part in parts if part) or None


def _collect_ids(entries: Sequence[AuditLog]) -> dict[str, set[int]]:
    """The ids to look up, by kind of row: every foreign key in the snapshots, plus each entity."""
    wanted: dict[str, set[int]] = {
        "user": set(),
        "contractor": set(),
        "service_request": set(),
        "invoice": set(),
        "document": set(),
    }
    for entry in entries:
        for _, kind, ref in _references(entry):
            wanted[kind].add(ref)
        kind = _ENTITY_KIND.get(entry.entity_type)
        if kind is not None:
            wanted[kind].add(entry.entity_id)
    return wanted


def _names(db: Session, id_column: _IdColumn, name_column: _NameColumn, ids: set[int]) -> dict[int, str]:
    if not ids:
        return {}
    rows = db.execute(select(id_column, name_column).where(id_column.in_(ids))).all()
    return {row_id: name for row_id, name in rows}


def _load_names(db: Session, wanted: dict[str, set[int]]) -> Names:
    """One query per kind of row, however many ids there are."""
    # Documents first: each one names a contractor that the contractors query must include.
    documents: dict[int, tuple[str, int]] = {}
    contractor_ids = set(wanted["contractor"])
    if wanted["document"]:
        rows = db.execute(
            select(
                ContractorDocument.id, ContractorDocument.doc_type, ContractorDocument.contractor_id
            ).where(ContractorDocument.id.in_(wanted["document"]))
        ).all()
        documents = {doc_id: (doc_type.value, contractor_id) for doc_id, doc_type, contractor_id in rows}
        contractor_ids |= {contractor_id for _, contractor_id in documents.values()}

    return Names(
        users=_names(db, User.id, User.full_name, wanted["user"]),
        contractors=_names(db, Contractor.id, Contractor.name, contractor_ids),
        requests=_names(db, ServiceRequest.id, ServiceRequest.title, wanted["service_request"]),
        invoices=_names(db, Invoice.id, Invoice.invoice_number, wanted["invoice"]),
        documents=documents,
    )


def _entity_label(entry: AuditLog, names: Names) -> str | None:
    """What the entity is called: its current name, else the name in the stored snapshot."""
    entity_id = entry.entity_id
    match entry.entity_type:
        case AuditEntity.CONTRACTOR.value:
            return names.contractors.get(entity_id) or _snapshot_text(entry, "name")
        case AuditEntity.INVOICE.value:
            return names.invoices.get(entity_id) or _snapshot_text(entry, "invoice_number")
        case AuditEntity.SERVICE_REQUEST.value:
            return names.requests.get(entity_id) or _snapshot_text(entry, "title")
        case AuditEntity.USER.value:
            return names.users.get(entity_id) or _user_snapshot_name(entry)
        case AuditEntity.CONTRACTOR_DOCUMENT.value:
            found = names.documents.get(entity_id)
            doc_type = found[0] if found else _snapshot_text(entry, "doc_type")
            contractor_id = found[1] if found else _as_id(_snapshot_value(entry, "contractor_id"))
            contractor = names.contractors.get(contractor_id) if contractor_id is not None else None
            return f"{doc_type} · {contractor}" if doc_type and contractor else doc_type
        case _:
            return None


def _value_labels(entry: AuditLog, names: Names) -> dict[str, dict[str, str]]:
    labels: dict[str, dict[str, str]] = {}
    for name, kind, ref in _references(entry):
        label = names.for_field_kind(kind).get(ref)
        if label is not None:
            labels.setdefault(name, {})[str(ref)] = label
    return labels


def resolve_labels(db: Session, entries: Sequence[AuditLog]) -> dict[int, EntryLabels]:
    """Labels for each entry, by audit row id."""
    if not entries:
        return {}
    names = _load_names(db, _collect_ids(entries))
    return {
        entry.id: EntryLabels(entity_label=_entity_label(entry, names), value_labels=_value_labels(entry, names))
        for entry in entries
    }
