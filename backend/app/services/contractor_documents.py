"""Contractor safety documents: queries, upload and download.

"Current document": for each (contractor, doc_type) the row with the latest uploaded_at
(highest id on a tie). Older rows stay as history. `current_documents` is the one place that
rule lives; the contractor list and detail and the daily expiry job all use it.
"""

from collections.abc import Sequence
from datetime import date
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Contractor, ContractorDocument, DocType, User
from app.schemas.contractor import CurrentDocumentOut, DocumentOut
from app.services.audit import AuditAction, AuditEntity, audited_write, log_action, row_values
from app.services.compliance import days_left, document_status
from app.services.contractor_lookup import lock_contractor, require_contractor
from app.services.dates import riyadh_today
from app.services.document_storage import (
    MEDIA_TYPES,
    DocumentNotFound,
    UploadedFile,
    delete_stored,
    resolve_stored,
    save_upload,
)


class ContractorInactive(Exception):
    """Documents cannot be uploaded to an inactive contractor. app.main answers with a 409."""


# ---------------------------------------------------------------- reading


def current_documents(
    db: Session, contractor_ids: Sequence[int] | None = None, *, active_only: bool = False
) -> list[ContractorDocument]:
    """The current document of every (contractor, doc_type) pair, for the given contractors
    or for all of them when `contractor_ids` is None. `active_only` drops the documents of
    inactive contractors (the daily expiry job and the dashboard count only active ones)."""
    ranked = select(
        ContractorDocument.id,
        func.row_number()
        .over(
            partition_by=(ContractorDocument.contractor_id, ContractorDocument.doc_type),
            order_by=(ContractorDocument.uploaded_at.desc(), ContractorDocument.id.desc()),
        )
        .label("rank"),
    )
    if contractor_ids is not None:
        ranked = ranked.where(ContractorDocument.contractor_id.in_(contractor_ids))
    ranked_rows = ranked.subquery()

    query = (
        select(ContractorDocument)
        .join(ranked_rows, ranked_rows.c.id == ContractorDocument.id)
        .where(ranked_rows.c.rank == 1)
        .order_by(ContractorDocument.contractor_id, ContractorDocument.doc_type)
    )
    if active_only:
        query = query.join(Contractor, Contractor.id == ContractorDocument.contractor_id).where(
            Contractor.is_active.is_(True)
        )
    return list(db.scalars(query))


def _uploader_names(db: Session, documents: Sequence[ContractorDocument]) -> dict[int, str]:
    ids = {document.uploaded_by for document in documents}
    if not ids:
        return {}
    rows = db.execute(select(User.id, User.full_name).where(User.id.in_(ids)))
    return {user_id: name for user_id, name in rows}


def _document_fields(
    document: ContractorDocument, names: dict[int, str], today: date, is_current: bool
) -> dict:
    return {
        "id": document.id,
        "contractor_id": document.contractor_id,
        "doc_type": document.doc_type,
        "original_filename": document.original_filename,
        "expiry_date": document.expiry_date,
        "status": document_status(document.expiry_date, today),
        "days_left": days_left(document.expiry_date, today),
        "uploaded_by_name": names[document.uploaded_by],
        "uploaded_at": document.uploaded_at,
        "is_current": is_current,
    }


def list_current_documents(db: Session, contractor_id: int) -> list[CurrentDocumentOut]:
    """The current document of each type the contractor has, with its status and how many
    uploads of that type exist (the current one included)."""
    today = riyadh_today()
    documents = current_documents(db, [contractor_id])
    names = _uploader_names(db, documents)
    upload_counts = {
        doc_type: count
        for doc_type, count in db.execute(
            select(ContractorDocument.doc_type, func.count())
            .where(ContractorDocument.contractor_id == contractor_id)
            .group_by(ContractorDocument.doc_type)
        )
    }
    return [
        CurrentDocumentOut.model_validate(
            {
                **_document_fields(document, names, today, is_current=True),
                "upload_count": upload_counts[document.doc_type],
            }
        )
        for document in documents
    ]


def list_documents(
    db: Session, contractor_id: int, doc_type: DocType | None = None
) -> list[DocumentOut]:
    """Every upload of the contractor (optionally of one type), newest first, with
    `is_current` marking the one that counts."""
    require_contractor(db, contractor_id)  # 404 for an unknown contractor
    query = select(ContractorDocument).where(ContractorDocument.contractor_id == contractor_id)
    if doc_type is not None:
        query = query.where(ContractorDocument.doc_type == doc_type)
    documents = list(
        db.scalars(query.order_by(ContractorDocument.uploaded_at.desc(), ContractorDocument.id.desc()))
    )

    current_ids = {document.id for document in current_documents(db, [contractor_id])}
    names = _uploader_names(db, documents)
    today = riyadh_today()
    return [
        DocumentOut.model_validate(
            _document_fields(document, names, today, is_current=document.id in current_ids)
        )
        for document in documents
    ]


# ---------------------------------------------------------------- writing


def upload_document(
    db: Session,
    user: User,
    contractor_id: int,
    doc_type: DocType,
    expiry_date: date,
    upload: UploadedFile,
) -> DocumentOut:
    """Stores the file, adds a new row (the older rows of this type become history) and its
    audit row. If anything fails, including the commit, the saved file is deleted.

    The slow part, writing up to 10 MB to disk, happens before the contractor row is locked:
    the lock only covers "is it still active?" and the insert."""
    require_contractor(db, contractor_id)  # 404 before any file is written
    stored = save_upload(upload, contractor_id)
    try:
        with audited_write(db):
            contractor = lock_contractor(db, contractor_id)
            if not contractor.is_active:
                raise ContractorInactive()

            document = ContractorDocument(
                contractor_id=contractor_id,
                doc_type=doc_type,
                file_path=stored.relative_path,
                original_filename=stored.original_filename,
                expiry_date=expiry_date,
                uploaded_by=user.id,
            )
            db.add(document)
            db.flush()
            log_action(
                db,
                user.id,
                AuditAction.CREATE,
                AuditEntity.CONTRACTOR_DOCUMENT,
                document.id,
                new_values=row_values(document),
            )
    except BaseException:
        delete_stored(stored.relative_path)
        raise

    names = _uploader_names(db, [document])
    return DocumentOut.model_validate(
        _document_fields(document, names, riyadh_today(), is_current=True)
    )


def get_document_file(db: Session, document_id: int) -> tuple[Path, str, str]:
    """(path on disk, name to download as, media type). DocumentNotFound when the row or
    the file is missing, or the stored path points outside UPLOAD_DIR."""
    document = db.get(ContractorDocument, document_id)
    if document is None:
        raise DocumentNotFound()
    path = resolve_stored(document.file_path)
    media_type = MEDIA_TYPES.get(path.suffix.lstrip(".").lower(), "application/octet-stream")
    return path, document.original_filename, media_type
