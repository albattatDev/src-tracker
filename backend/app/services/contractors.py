"""Contractor queries and writes. Their safety documents live in contractor_documents."""

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session, aliased

from app.core.errors import BadRequest
from app.models import Contractor, User, UserRole
from app.schemas.contractor import (
    ContractorCreate,
    ContractorDetail,
    ContractorListItem,
    ContractorListParams,
    ContractorOut,
    ContractorPage,
    ContractorUpdate,
    DocCounts,
)
from app.services.audit import AuditAction, AuditEntity, audited_write, log_action, row_values
from app.services.compliance import document_status
from app.services.contractor_documents import current_documents, list_current_documents
from app.services.contractor_lookup import ContractorNotFound, lock_contractor
from app.services.dates import riyadh_today


class InvalidInternalManager(BadRequest):
    """The internal manager must be an active user with the manager role."""


# ---------------------------------------------------------------- contractors (read)


def _contractor_out(contractor: Contractor, manager_name: str) -> dict:
    return {
        "id": contractor.id,
        "name": contractor.name,
        "contact_email": contractor.contact_email,
        "internal_manager_id": contractor.internal_manager_id,
        "internal_manager_name": manager_name,
        "is_active": contractor.is_active,
        "created_at": contractor.created_at,
        "updated_at": contractor.updated_at,
    }


def _contractor_query():
    manager = aliased(User)
    return select(Contractor, manager.full_name).join(
        manager, Contractor.internal_manager_id == manager.id
    )


def _filter_conditions(params: ContractorListParams) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if params.q:
        conditions.append(Contractor.name.contains(params.q, autoescape=True))
    if params.is_active is not None:
        conditions.append(Contractor.is_active.is_(params.is_active))
    return conditions


def list_contractors(db: Session, params: ContractorListParams) -> ContractorPage:
    """One page of contractors by name, each with the counts of its current documents by
    status. Only current documents count: replaced ones are history."""
    conditions = _filter_conditions(params)
    total = db.scalar(select(func.count()).select_from(Contractor).where(*conditions)) or 0

    offset = (params.page - 1) * params.page_size
    if offset >= total:
        return ContractorPage(items=[], total=total, page=params.page, page_size=params.page_size)

    rows = db.execute(
        _contractor_query()
        .where(*conditions)
        .order_by(Contractor.name, Contractor.id)
        .limit(params.page_size)
        .offset(offset)
    ).all()

    today = riyadh_today()
    documents = current_documents(db, [contractor.id for contractor, _ in rows])
    counts: dict[int, DocCounts] = {contractor.id: DocCounts() for contractor, _ in rows}
    uploaded: dict[int, int] = {contractor.id: 0 for contractor, _ in rows}
    for document in documents:
        status = document_status(document.expiry_date, today).value
        bucket = counts[document.contractor_id]
        setattr(bucket, status, getattr(bucket, status) + 1)
        uploaded[document.contractor_id] += 1

    items = [
        ContractorListItem.model_validate(
            {
                **_contractor_out(contractor, manager_name),
                "doc_counts": counts[contractor.id],
                "types_uploaded": uploaded[contractor.id],
            }
        )
        for contractor, manager_name in rows
    ]
    return ContractorPage(items=items, total=total, page=params.page, page_size=params.page_size)


def _get_row(db: Session, contractor_id: int) -> tuple[Contractor, str]:
    row = db.execute(_contractor_query().where(Contractor.id == contractor_id)).one_or_none()
    if row is None:
        raise ContractorNotFound()
    return row[0], row[1]


def get_contractor(db: Session, contractor_id: int) -> ContractorDetail:
    contractor, manager_name = _get_row(db, contractor_id)
    return ContractorDetail.model_validate(
        {
            **_contractor_out(contractor, manager_name),
            "current_documents": list_current_documents(db, contractor_id),
        }
    )


# ---------------------------------------------------------------- contractors (write)


def _require_manager(db: Session, user_id: int) -> None:
    found = db.scalar(
        select(User.id).where(
            User.id == user_id, User.role == UserRole.MANAGER, User.is_active.is_(True)
        )
    )
    if found is None:
        raise InvalidInternalManager("Internal manager must be an active user with the manager role")


def create_contractor(db: Session, user: User, data: ContractorCreate) -> ContractorOut:
    with audited_write(db):
        _require_manager(db, data.internal_manager_id)
        contractor = Contractor(
            name=data.name,
            contact_email=data.contact_email,
            internal_manager_id=data.internal_manager_id,
            is_active=True,
        )
        db.add(contractor)
        db.flush()
        log_action(
            db,
            user.id,
            AuditAction.CREATE,
            AuditEntity.CONTRACTOR,
            contractor.id,
            new_values=row_values(contractor),
        )

    return ContractorOut.model_validate(_contractor_out(*_get_row(db, contractor.id)))


def update_contractor(
    db: Session, user: User, contractor_id: int, data: ContractorUpdate
) -> ContractorOut:
    """Applies only the fields that were sent. The row is locked until the commit. No audit
    row is written when nothing actually changed."""
    changes = data.model_dump(exclude_unset=True)

    with audited_write(db):
        contractor = lock_contractor(db, contractor_id)

        if (
            "internal_manager_id" in changes
            and changes["internal_manager_id"] != contractor.internal_manager_id
        ):
            _require_manager(db, changes["internal_manager_id"])

        old_values = row_values(contractor)
        for field, value in changes.items():
            setattr(contractor, field, value)
        new_values = row_values(contractor)

        if new_values != old_values:
            log_action(
                db,
                user.id,
                AuditAction.UPDATE,
                AuditEntity.CONTRACTOR,
                contractor.id,
                old_values=old_values,
                new_values=new_values,
            )

    return ContractorOut.model_validate(_contractor_out(*_get_row(db, contractor_id)))
