"""Reading the audit log for the Audit Log page. Writing lives in services/audit.py."""

from sqlalchemy import ColumnElement, desc, func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.schemas.audit import AuditListParams, AuditLogOut, AuditLogPage, AuditUser
from app.services.audit_labels import EntryLabels, resolve_labels
from app.services.dates import riyadh_day_conditions


def _audit_conditions(params: AuditListParams) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if params.entity_type is not None:
        conditions.append(AuditLog.entity_type == params.entity_type.value)
    if params.action is not None:
        conditions.append(AuditLog.action == params.action.value)
    if params.user_id is not None:
        conditions.append(AuditLog.user_id == params.user_id)
    conditions += riyadh_day_conditions(AuditLog.created_at, params.date_from, params.date_to)
    return conditions


def _to_out(entry: AuditLog, uid: int | None, uname: str | None, labels: EntryLabels) -> AuditLogOut:
    return AuditLogOut(
        id=entry.id,
        created_at=entry.created_at,
        user=AuditUser(id=uid, full_name=uname) if uid is not None else None,
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        old_values=entry.old_values,
        new_values=entry.new_values,
        entity_label=labels.entity_label,
        value_labels=labels.value_labels,
    )


def list_audit_log(db: Session, params: AuditListParams) -> AuditLogPage:
    """One page of audit rows, newest first. `total` counts every matching row."""
    conditions = _audit_conditions(params)
    total = db.scalar(select(func.count()).select_from(AuditLog).where(*conditions)) or 0

    offset = (params.page - 1) * params.page_size
    items: list[AuditLogOut] = []
    if offset < total:
        query = (
            select(AuditLog, User.id.label("uid"), User.full_name.label("uname"))
            # Outer join: a system action has no user, and the join never filters on is_active.
            .outerjoin(User, AuditLog.user_id == User.id)
            .where(*conditions)
            .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
            .limit(params.page_size)
            .offset(offset)
        )
        rows = db.execute(query).all()
        # One lookup per entity type for the whole page, not one per row.
        labels = resolve_labels(db, [entry for entry, _, _ in rows])
        for entry, uid, uname in rows:
            items.append(_to_out(entry, uid, uname, labels[entry.id]))
    return AuditLogPage(items=items, total=total, page=params.page, page_size=params.page_size)


def list_audit_users(db: Session) -> list[AuditUser]:
    """The distinct users who have audit rows, by name: the options of the user filter."""
    rows = db.execute(
        select(User.id, User.full_name)
        .where(User.id.in_(select(AuditLog.user_id).where(AuditLog.user_id.is_not(None))))
        .order_by(User.full_name, User.id)
    ).all()
    return [AuditUser(id=uid, full_name=name) for uid, name in rows]


def get_audit_entry(db: Session, entry_id: int) -> AuditLogOut | None:
    """One audit row with the same shape as a list item, or None when it does not exist."""
    row = db.execute(
        select(AuditLog, User.id.label("uid"), User.full_name.label("uname"))
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.id == entry_id)
    ).first()
    if row is None:
        return None
    entry, uid, uname = row
    return _to_out(entry, uid, uname, resolve_labels(db, [entry])[entry.id])
