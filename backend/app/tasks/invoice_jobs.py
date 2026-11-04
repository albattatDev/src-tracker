"""Daily invoice-aging scan: claims one alert per pending invoice that crossed a threshold
and hands each to the worker (send_notification). Never sends mail itself."""

from dataclasses import asdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Invoice, NotificationEntityType
from app.services import notifications
from app.services.aging import AGING_STATUS, THRESHOLDS, compute_aging
from app.services.dates import riyadh_today
from app.tasks.celery_app import celery_app
from app.tasks.email_task import send_notification


def scan_invoices(db: Session, today: date | None = None) -> notifications.ScanResult:
    """Only invoices that still age (pending). The highest threshold reached is claimed; a
    failed or stale row for it is claimed again. One bad invoice never stops the scan."""
    today = today or riyadh_today()
    result = notifications.ScanResult()

    invoices = db.scalars(select(Invoice).where(Invoice.approval_status == AGING_STATUS)).all()
    for invoice in invoices:
        age_days, _band = compute_aging(invoice.due_date, invoice.submission_date, today)
        threshold = notifications.highest_due_threshold(age_days, THRESHOLDS)
        if threshold is None:
            continue
        notifications.claim_and_enqueue(
            db,
            NotificationEntityType.INVOICE,
            invoice.id,
            threshold,
            lambda: notifications.invoice_recipients(db, invoice),
            send_notification.delay,
            result,
        )
    return result


@celery_app.task
def scan_invoices_daily() -> dict:
    with SessionLocal() as db:
        return asdict(scan_invoices(db))
