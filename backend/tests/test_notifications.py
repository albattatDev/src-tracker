"""Notification engine: threshold rule, claim/idempotency, recipients, retries.

No network: email goes to a fake sender, and Celery runs tasks eagerly in-process
(so `.delay()` executes the send, retries included, against the test transaction).
"""

import smtplib
from contextlib import nullcontext
from datetime import datetime, timedelta

import pytest

from app.models import (
    ApprovalStatus,
    NotificationEntityType,
    NotificationLog,
    NotificationStatus,
)
from app.models.base import utcnow
from app.services import notifications
from app.services.aging import THRESHOLDS
from app.services.notifications import highest_due_threshold
from app.tasks.celery_app import celery_app
from app.tasks.document_jobs import scan_documents
from app.tasks.invoice_jobs import scan_invoices
from tests.helpers import TODAY

# ---------------------------------------------------------------- pure rule


@pytest.mark.parametrize(
    ("age", "expected"),
    [(29, None), (30, 30), (59, 30), (60, 60), (65, 60), (180, 180), (181, 180), (-5, None)],
)
def test_highest_due_threshold(age, expected):
    assert highest_due_threshold(age, THRESHOLDS) == expected


# ---------------------------------------------------------------- fixtures


class FakeSender:
    """Stands in for SMTP: records every message, or raises while `error` is set."""

    def __init__(self):
        self.sent: list[tuple[list[str], str, str]] = []
        self.calls = 0
        self.error: Exception | None = None

    def __call__(self, recipients, subject, body):
        self.calls += 1
        if self.error is not None:
            raise self.error
        self.sent.append((list(recipients), subject, body))


@pytest.fixture
def sender(monkeypatch):
    fake = FakeSender()
    monkeypatch.setattr("app.services.notifications.send_email", fake)
    return fake


@pytest.fixture(autouse=True)
def run_tasks_in_process(monkeypatch, db_session):
    monkeypatch.setattr(celery_app.conf, "task_always_eager", True)
    monkeypatch.setattr(celery_app.conf, "task_eager_propagates", False)
    # The task opens its own session; hand it the test transaction (and never close it).
    monkeypatch.setattr("app.tasks.email_task.SessionLocal", lambda: nullcontext(db_session))
    monkeypatch.setattr("app.tasks.email_task.riyadh_today", lambda: TODAY)


def logs(db_session) -> list[NotificationLog]:
    return list(db_session.query(NotificationLog).order_by(NotificationLog.id))


# ---------------------------------------------------------------- invoices


def test_running_the_scan_twice_sends_one_email_per_threshold(
    db_session, sender, make_sr, make_invoice
):
    invoice = make_invoice(make_sr(), age=30)

    first = scan_invoices(db_session, TODAY)
    second = scan_invoices(db_session, TODAY)

    assert (first.claimed, first.enqueued) == (1, 1)
    assert second.claimed == 0
    rows = logs(db_session)
    assert len(rows) == 1
    assert (rows[0].entity_type, rows[0].entity_id, rows[0].threshold) == (
        NotificationEntityType.INVOICE,
        invoice.id,
        30,
    )
    assert rows[0].status == NotificationStatus.SENT
    assert rows[0].attempts == 1 and rows[0].sent_at is not None
    assert len(sender.sent) == 1
    recipients, subject, body = sender.sent[0]
    assert recipients == ["engineer1@srct.local", "manager@srct.local"]
    assert invoice.invoice_number in subject and "30 days" in subject
    assert "Broken AC" in body


def test_crossing_the_next_threshold_sends_one_more(db_session, sender, make_sr, make_invoice):
    make_invoice(make_sr(), age=30)
    scan_invoices(db_session, TODAY)

    scan_invoices(db_session, TODAY + timedelta(days=30))  # now 60 days old
    scan_invoices(db_session, TODAY + timedelta(days=30))

    assert [row.threshold for row in logs(db_session)] == [30, 60]
    assert len(sender.sent) == 2


def test_only_the_highest_threshold_alerts(db_session, sender, make_sr, make_invoice):
    make_invoice(make_sr(), age=200)

    scan_invoices(db_session, TODAY)

    assert [row.threshold for row in logs(db_session)] == [180]
    assert len(sender.sent) == 1


def test_young_invoice_does_not_alert(db_session, sender, make_sr, make_invoice):
    make_invoice(make_sr(), age=29)

    result = scan_invoices(db_session, TODAY)

    assert result.claimed == 0 and logs(db_session) == [] and sender.sent == []


@pytest.mark.parametrize("status", [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED])
def test_decided_invoices_never_alert(db_session, sender, make_sr, make_invoice, status):
    make_invoice(make_sr(), age=200, status=status)

    result = scan_invoices(db_session, TODAY)

    assert result.claimed == 0 and logs(db_session) == [] and sender.sent == []


def test_inactive_manager_and_duplicates_are_skipped(
    db_session, sender, users, make_sr, make_invoice
):
    users["manager"].is_active = False
    db_session.commit()
    make_invoice(make_sr(), age=30)

    scan_invoices(db_session, TODAY)

    assert sender.sent[0][0] == ["engineer1@srct.local"]


def test_unassigned_request_marks_failed_without_crashing(
    db_session, sender, make_sr, make_invoice
):
    make_invoice(make_sr(engineer_key=None), age=30)

    first = scan_invoices(db_session, TODAY)
    second = scan_invoices(db_session, TODAY)  # looked at again, still no crash

    assert first.no_recipients == 1 and first.claimed == 0 and first.errors == 0
    assert second.no_recipients == 1
    (row,) = logs(db_session)
    assert row.status == NotificationStatus.FAILED
    assert row.last_error == "no recipients"
    assert sender.calls == 0


# ---------------------------------------------------------------- documents


def test_document_expiring_soon_alerts_once(
    db_session, sender, make_contractor, make_document
):
    document = make_document(make_contractor(), days=12)

    scan_documents(db_session, TODAY)
    scan_documents(db_session, TODAY)

    (row,) = logs(db_session)
    assert (row.entity_type, row.entity_id, row.threshold) == (
        NotificationEntityType.DOCUMENT,
        document.id,
        30,
    )
    assert row.status == NotificationStatus.SENT
    assert len(sender.sent) == 1
    recipients, subject, _ = sender.sent[0]
    assert recipients == ["acme@example.com", "manager@srct.local"]
    assert "HIP" in subject and "12 days" in subject


@pytest.mark.parametrize(("days", "alerts"), [(0, True), (30, True), (31, False), (-1, False)])
def test_document_window_edges(db_session, sender, make_contractor, make_document, days, alerts):
    make_document(make_contractor(), days=days)

    scan_documents(db_session, TODAY)

    assert len(sender.sent) == (1 if alerts else 0)


def test_inactive_contractor_never_alerts(db_session, sender, make_contractor, make_document):
    make_document(make_contractor(is_active=False), days=10)

    result = scan_documents(db_session, TODAY)

    assert result.claimed == 0 and logs(db_session) == [] and sender.sent == []


def test_replaced_document_never_alerts(db_session, sender, make_contractor, make_document):
    contractor = make_contractor()
    make_document(contractor, days=10, uploaded_at=datetime(2026, 1, 1))  # old, expiring
    make_document(contractor, days=365, uploaded_at=datetime(2026, 10, 1))  # current, valid

    result = scan_documents(db_session, TODAY)

    assert result.claimed == 0 and logs(db_session) == [] and sender.sent == []


# ---------------------------------------------------------------- failures and retries


def test_smtp_failure_marks_failed_counts_attempts_and_next_run_retries(
    db_session, sender, make_sr, make_invoice
):
    make_invoice(make_sr(), age=30)
    sender.error = smtplib.SMTPServerDisconnected("mailpit is down")

    result = scan_invoices(db_session, TODAY)  # must not raise

    assert result.errors == 0
    (row,) = logs(db_session)
    assert row.status == NotificationStatus.FAILED
    assert row.attempts == 3  # first try + 2 retries
    assert "mailpit is down" in row.last_error
    assert sender.calls == 3

    sender.error = None  # the mail server is back
    again = scan_invoices(db_session, TODAY)

    assert again.claimed == 1
    (row,) = logs(db_session)
    assert row.status == NotificationStatus.SENT
    assert row.attempts == 4
    assert len(sender.sent) == 1


def test_enqueue_failure_marks_failed_so_the_next_scan_retries(
    db_session, sender, monkeypatch, make_sr, make_invoice
):
    make_invoice(make_sr(), age=30)

    def broker_down(log_id):
        raise ConnectionError("redis is down")

    with monkeypatch.context() as broken_broker:
        broken_broker.setattr("app.tasks.invoice_jobs.send_notification.delay", broker_down)
        broken = scan_invoices(db_session, TODAY)  # must not raise

    assert (broken.claimed, broken.enqueued, broken.errors) == (1, 0, 1)
    (row,) = logs(db_session)
    assert row.status == NotificationStatus.FAILED and "redis is down" in row.last_error

    # the broker is back: the patch above ended with the context
    fixed = scan_invoices(db_session, TODAY)

    assert fixed.enqueued == 1
    assert len(sender.sent) == 1


def test_non_retryable_error_fails_at_once(db_session, sender, make_sr, make_invoice):
    make_invoice(make_sr(), age=30)
    sender.error = ValueError("bad address")

    scan_invoices(db_session, TODAY)

    (row,) = logs(db_session)
    assert row.status == NotificationStatus.FAILED and row.attempts == 1
    assert sender.calls == 1


def test_failed_alert_is_not_retried_once_the_invoice_is_decided(
    db_session, sender, make_sr, make_invoice
):
    invoice = make_invoice(make_sr(), age=30)
    sender.error = smtplib.SMTPException("down")
    scan_invoices(db_session, TODAY)
    sender.error = None
    invoice.approval_status = ApprovalStatus.APPROVED
    db_session.commit()

    scan_invoices(db_session, TODAY)

    assert logs(db_session)[0].status == NotificationStatus.FAILED
    assert sender.sent == []


def _pending_row(db_session, created_at: datetime) -> NotificationLog:
    row = NotificationLog(
        entity_type=NotificationEntityType.INVOICE,
        entity_id=1,
        threshold=30,
        recipients="a@example.com",
        status=NotificationStatus.PENDING,
        created_at=created_at,
    )
    db_session.add(row)
    db_session.commit()
    return row


def _claim(db_session, now=None):
    return notifications.claim(
        db_session, NotificationEntityType.INVOICE, 1, 30, ["b@example.com"], now=now
    )


def test_fresh_pending_row_is_not_claimed_again(db_session):
    _pending_row(db_session, created_at=utcnow() - timedelta(minutes=10))

    assert _claim(db_session) is None


def test_stale_pending_row_is_claimed_and_its_clock_restarts(db_session):
    _pending_row(db_session, created_at=utcnow() - timedelta(hours=2))
    now = utcnow().replace(microsecond=0)  # DATETIME columns drop microseconds

    row = _claim(db_session, now=now)

    assert row is not None
    assert row.status == NotificationStatus.PENDING
    assert row.recipients == "b@example.com"
    assert row.created_at == now
    assert _claim(db_session, now=now) is None  # claimed, so no longer stale


def test_sent_row_is_never_claimed_again(db_session):
    row = _pending_row(db_session, created_at=utcnow() - timedelta(days=5))
    row.status = NotificationStatus.SENT
    db_session.commit()

    assert _claim(db_session) is None
