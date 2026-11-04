"""Alert emails: which threshold is due, who gets the mail, the once-per-threshold claim,
and the delivery itself. No Celery imports: the tasks in app/tasks call into this module.

One `notification_log` row per (entity_type, entity_id, threshold) is the idempotency key.
A scan "claims" the row (insert, or take back a failed/stale one), the worker then sends and
marks it sent/failed. All timestamps here are naive UTC, like every stored timestamp.
"""

import logging
import smtplib
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from typing import NamedTuple

from sqlalchemy import and_, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Contractor,
    ContractorDocument,
    Invoice,
    NotificationEntityType,
    NotificationLog,
    NotificationStatus,
    ServiceRequest,
    User,
)
from app.models.base import utcnow
from app.services.aging import compute_aging
from app.services.compliance import days_left

logger = logging.getLogger(__name__)

# A row left `pending` longer than this was claimed by a scan whose worker never finished
# (crash, lost message), so the next scan may claim it again.
STALE_PENDING_AFTER = timedelta(hours=1)

NO_RECIPIENTS_ERROR = "no recipients"
LAST_ERROR_MAX_LENGTH = 2000
RECIPIENTS_MAX_LENGTH = 1000  # notification_log.recipients is VARCHAR(1000)

# Errors worth another attempt: the mail server is down or refused us for now.
RETRYABLE_ERRORS = (smtplib.SMTPException, OSError)


class EmailContent(NamedTuple):
    subject: str
    body: str


@dataclass
class ScanResult:
    claimed: int = 0
    enqueued: int = 0
    no_recipients: int = 0
    errors: int = 0


# ---------------------------------------------------------------- thresholds


def highest_due_threshold(age: int, thresholds: Sequence[int]) -> int | None:
    """The largest threshold the age has reached, or None if it has reached none. Only the
    highest one alerts: an invoice first seen at 65 days gets the 60 alert, not 30 and 60."""
    reached = [threshold for threshold in thresholds if age >= threshold]
    return max(reached) if reached else None


# ---------------------------------------------------------------- recipients


def _unique_emails(candidates: Iterable[str | None]) -> list[str]:
    seen: set[str] = set()
    emails: list[str] = []
    for candidate in candidates:
        email = (candidate or "").strip()
        if email and email.lower() not in seen:
            seen.add(email.lower())
            emails.append(email)
    return emails


def _active_email(user: User | None) -> str | None:
    return user.email if user is not None and user.is_active else None


def invoice_recipients(db: Session, invoice: Invoice) -> list[str]:
    """The engineer assigned to the invoice's service request and that engineer's manager.
    Inactive users and a missing assignment are skipped."""
    request = db.get(ServiceRequest, invoice.service_request_id)
    if request is None or request.assigned_engineer_id is None:
        return []
    engineer = db.get(User, request.assigned_engineer_id)
    if engineer is None:
        return []
    manager = db.get(User, engineer.manager_id) if engineer.manager_id is not None else None
    return _unique_emails([_active_email(engineer), _active_email(manager)])


def document_recipients(db: Session, document: ContractorDocument) -> list[str]:
    """The contractor's contact email and the internal manager (if still active)."""
    contractor = db.get(Contractor, document.contractor_id)
    if contractor is None:
        return []
    manager = db.get(User, contractor.internal_manager_id)
    return _unique_emails([contractor.contact_email, _active_email(manager)])


# ---------------------------------------------------------------- claiming


def _row_for(db: Session, entity_type, entity_id: int, threshold: int) -> NotificationLog:
    """Reloads the row after the bulk UPDATE in claim(), which bypasses the ORM identity map."""
    return db.execute(
        select(NotificationLog)
        .where(
            NotificationLog.entity_type == entity_type,
            NotificationLog.entity_id == entity_id,
            NotificationLog.threshold == threshold,
        )
        .execution_options(populate_existing=True)
    ).scalar_one()


def claim(
    db: Session,
    entity_type: NotificationEntityType,
    entity_id: int,
    threshold: int,
    recipients: Sequence[str],
    now: datetime | None = None,
) -> NotificationLog | None:
    """Takes the right to send this alert, or returns None when someone else has it.

    1. INSERT a `pending` row. The UNIQUE constraint makes this the once-per-threshold guard.
    2. If the row exists, one conditional UPDATE takes it back, but only when it is `failed`
       or has been `pending` for over an hour. `rowcount == 1` means this caller won.
       Two scans racing for the same row cannot both win.

    `created_at` is reset to `now` when a row is taken back, so it reads "last claimed at"
    and the stale window restarts. `now` is naive UTC (same as stored timestamps).

    With no recipients the row is stored as `failed` ("no recipients") and None is returned:
    there is nothing to send, and the next scan looks at it again. The caller commits."""
    now = now or utcnow()
    joined = ", ".join(recipients)[:RECIPIENTS_MAX_LENGTH]
    status = NotificationStatus.PENDING if recipients else NotificationStatus.FAILED
    error = None if recipients else NO_RECIPIENTS_ERROR

    row = NotificationLog(
        entity_type=entity_type,
        entity_id=entity_id,
        threshold=threshold,
        recipients=joined,
        status=status,
        last_error=error,
        created_at=now,
    )
    try:
        with db.begin_nested():
            db.add(row)
    except IntegrityError:
        values: dict = {"status": status, "recipients": joined, "created_at": now}
        if error is not None:
            values["last_error"] = error
        result = db.execute(
            update(NotificationLog)
            .where(
                NotificationLog.entity_type == entity_type,
                NotificationLog.entity_id == entity_id,
                NotificationLog.threshold == threshold,
                or_(
                    NotificationLog.status == NotificationStatus.FAILED,
                    and_(
                        NotificationLog.status == NotificationStatus.PENDING,
                        NotificationLog.created_at < now - STALE_PENDING_AFTER,
                    ),
                ),
            )
            .values(**values)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            return None
        row = _row_for(db, entity_type, entity_id, threshold)

    return row if recipients else None


def claim_and_enqueue(
    db: Session,
    entity_type: NotificationEntityType,
    entity_id: int,
    threshold: int,
    find_recipients: Callable[[], Sequence[str]],
    enqueue: Callable[[int], object],
    result: ScanResult,
) -> None:
    """The step both scans share: claim, commit (the worker must see the row), enqueue.
    If enqueueing fails the row is marked `failed` at once, so the next scan retries it
    instead of waiting an hour for it to go stale. Never raises for a bad entity."""
    try:
        recipients = find_recipients()
        log = claim(db, entity_type, entity_id, threshold, recipients)
        db.commit()
    except Exception:
        db.rollback()
        result.errors += 1
        logger.exception("could not claim %s %s", entity_type.value, entity_id)
        return

    if not recipients:
        result.no_recipients += 1
    if log is None:
        return
    result.claimed += 1
    try:
        enqueue(log.id)
    except Exception as error:
        logger.exception("could not enqueue notification %s", log.id)
        result.errors += 1
        log.status = NotificationStatus.FAILED
        log.last_error = f"could not enqueue: {type(error).__name__}: {error}"[:LAST_ERROR_MAX_LENGTH]
        db.commit()
        return
    result.enqueued += 1


# ---------------------------------------------------------------- email content


def build_invoice_email(
    invoice: Invoice, request: ServiceRequest, age_days: int, threshold: int
) -> EmailContent:
    basis = "its due date" if invoice.due_date else "its submission date"
    subject = f"[SRC-T] Invoice {invoice.invoice_number} is {age_days} days overdue"
    body = (
        f"Invoice {invoice.invoice_number} (SAR {invoice.amount}) for service request "
        f"#{request.id} \"{request.title}\" is still pending approval.\n"
        f"\n"
        f"It is now {age_days} days past {basis}, which crossed the {threshold}-day alert.\n"
        f"\n"
        f"Open the invoices page: {settings.frontend_url}/invoices\n"
    )
    return EmailContent(subject, body)


def build_document_email(
    document: ContractorDocument, contractor: Contractor, remaining_days: int
) -> EmailContent:
    when = "expires today" if remaining_days == 0 else f"expires in {remaining_days} days"
    doc_type = document.doc_type.value
    subject = f"[SRC-T] {doc_type} for {contractor.name} {when}"
    body = (
        f"The {doc_type} safety document for contractor \"{contractor.name}\" {when} "
        f"(expiry date {document.expiry_date.isoformat()}).\n"
        f"\n"
        f"Please upload a renewed document before it expires.\n"
        f"\n"
        f"Open the contractors page: {settings.frontend_url}/contractors\n"
    )
    return EmailContent(subject, body)


def send_email(recipients: Sequence[str], subject: str, body: str) -> None:
    """Sends one plain-text message through the SMTP server (Mailpit in dev)."""
    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.send_message(message)


# ---------------------------------------------------------------- delivery


def _content_for(db: Session, log: NotificationLog, today: date) -> EmailContent:
    if log.entity_type == NotificationEntityType.INVOICE:
        invoice = db.get(Invoice, log.entity_id)
        request = db.get(ServiceRequest, invoice.service_request_id) if invoice else None
        if invoice is None or request is None:
            raise LookupError("invoice no longer exists")
        age_days, _band = compute_aging(invoice.due_date, invoice.submission_date, today)
        return build_invoice_email(invoice, request, age_days, log.threshold)

    document = db.get(ContractorDocument, log.entity_id)
    contractor = db.get(Contractor, document.contractor_id) if document else None
    if document is None or contractor is None:
        raise LookupError("document no longer exists")
    return build_document_email(document, contractor, days_left(document.expiry_date, today))


def deliver(
    db: Session,
    log_id: int,
    today: date,
    final_attempt: bool,
) -> None:
    """One delivery attempt for a claimed row. Only `pending` rows are sent, so a duplicate
    task for an already-sent row does nothing.

    Success: attempts + 1, status `sent`. Failure: attempts + 1 and last_error are committed
    first, then a retryable error is re-raised (so Celery retries) unless this is the final
    attempt, which marks the row `failed` and returns quietly. A non-retryable error (for
    example the invoice was deleted) fails the row at once."""
    log = db.get(NotificationLog, log_id)
    if log is None or log.status != NotificationStatus.PENDING:
        return

    try:
        content = _content_for(db, log, today)
        send_email([r.strip() for r in log.recipients.split(",") if r.strip()], *content)
    except Exception as error:
        log.attempts += 1
        log.last_error = f"{type(error).__name__}: {error}"[:LAST_ERROR_MAX_LENGTH]
        retry = isinstance(error, RETRYABLE_ERRORS) and not final_attempt
        if not retry:
            log.status = NotificationStatus.FAILED
        db.commit()  # keep the attempt count and error even though we may re-raise
        if retry:
            raise
        logger.warning("notification %s failed: %s", log_id, log.last_error)
        return

    log.attempts += 1
    log.status = NotificationStatus.SENT
    log.sent_at = utcnow()
    log.last_error = None
    db.commit()
