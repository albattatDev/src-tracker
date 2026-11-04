"""Daily document-expiry scan: claims one 30-day alert per current document that is expiring
soon and hands it to the worker (send_notification). Never sends mail itself."""

from dataclasses import asdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Contractor, NotificationEntityType
from app.services import notifications
from app.services.compliance import EXPIRY_WARNING_DAYS, DocumentStatus, document_status
from app.services.contractor_documents import current_documents
from app.services.dates import riyadh_today
from app.tasks.celery_app import celery_app
from app.tasks.email_task import send_notification


def scan_documents(db: Session, today: date | None = None) -> notifications.ScanResult:
    """Only the current document of each (contractor, type), only for active contractors,
    only while expiring_soon (expiry day included). Expired documents never alert."""
    today = today or riyadh_today()
    result = notifications.ScanResult()

    inactive_ids = set(db.scalars(select(Contractor.id).where(Contractor.is_active.is_(False))))
    for document in current_documents(db):
        if document.contractor_id in inactive_ids:
            continue
        if document_status(document.expiry_date, today) != DocumentStatus.EXPIRING_SOON:
            continue
        notifications.claim_and_enqueue(
            db,
            NotificationEntityType.DOCUMENT,
            document.id,
            EXPIRY_WARNING_DAYS,
            lambda: notifications.document_recipients(db, document),
            send_notification.delay,
            result,
        )
    return result


@celery_app.task
def scan_documents_daily() -> dict:
    with SessionLocal() as db:
        return asdict(scan_documents(db))
