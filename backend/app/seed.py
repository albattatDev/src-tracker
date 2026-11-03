"""Idempotent demo data seed.

`seed_users(db)` holds all the logic and takes a session, so tests can call it against
a session bound to a rolled-back transaction (see tests/conftest.py). `__main__` is the
only place that creates a real session, for `python -m app.seed`.
"""

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    ApprovalStatus,
    Invoice,
    Priority,
    ServiceRequest,
    SRStatus,
    User,
    UserRole,
)
from app.models.base import utcnow
from app.services.dates import riyadh_today


@dataclass(frozen=True)
class SeedUser:
    first_name: str
    last_name: str
    email: str
    role: UserRole
    manager_email: str | None = None


# A user's manager must be listed before them: seed_users resolves manager_email
# against rows that already exist, and fails if it cannot.
SEED_USERS = [
    SeedUser("Admin", "User", "admin@srct.local", UserRole.ADMIN),
    SeedUser("Abdullah", "Alqahtani", "manager@srct.local", UserRole.MANAGER),
    SeedUser("Fahad", "Alharbi", "engineer1@srct.local", UserRole.ENGINEER, "manager@srct.local"),
    SeedUser("Saad", "Alotaibi", "engineer2@srct.local", UserRole.ENGINEER, "manager@srct.local"),
    SeedUser("Noura", "Alshehri", "operations@srct.local", UserRole.OPERATIONS),
]


def seed_users(db: Session) -> dict[str, int]:
    """Creates the 5 demo users if they do not already exist (matched by email).

    Existing rows are left untouched (their password hash is not re-rolled).
    Returns a summary like {"created": 2, "skipped": 3}.
    """
    created = 0
    skipped = 0
    password_hash = hash_password(settings.seed_password)

    for seed in SEED_USERS:
        if db.query(User).filter(User.email == seed.email).one_or_none() is not None:
            skipped += 1
            continue

        manager_id = None
        if seed.manager_email is not None:
            manager = db.query(User).filter(User.email == seed.manager_email).one_or_none()
            if manager is None:
                raise RuntimeError(
                    f"Seed user {seed.email} needs manager {seed.manager_email}, "
                    "which does not exist. List the manager before this user in SEED_USERS."
                )
            manager_id = manager.id

        db.add(
            User(
                first_name=seed.first_name,
                last_name=seed.last_name,
                email=seed.email,
                password_hash=password_hash,
                role=seed.role,
                manager_id=manager_id,
            )
        )
        db.flush()  # so later rows in this same call can resolve their manager
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped}


@dataclass(frozen=True)
class SeedInvoice:
    number: str
    amount: str
    days_old: int  # due date = today - days_old, so the aging colour never goes stale
    status: ApprovalStatus
    request_title: str


# (title, status, engineer email). The invoices below attach to these requests.
SEED_REQUESTS = [
    ("Demo: AC unit failure, Building A", SRStatus.IN_PROGRESS, "engineer1@srct.local"),
    ("Demo: Elevator inspection, Tower B", SRStatus.ASSIGNED, "engineer2@srct.local"),
]
_R1, _R2 = SEED_REQUESTS[0][0], SEED_REQUESTS[1][0]

SEED_INVOICES = [
    SeedInvoice("INV-DEMO-010", "1250.00", 10, ApprovalStatus.PENDING, _R1),  # green
    SeedInvoice("INV-DEMO-045", "8400.50", 45, ApprovalStatus.PENDING, _R1),  # yellow
    SeedInvoice("INV-DEMO-090", "15999.99", 90, ApprovalStatus.PENDING, _R2),  # orange
    SeedInvoice("INV-DEMO-200", "42000.00", 200, ApprovalStatus.PENDING, _R2),  # red
    SeedInvoice("INV-DEMO-APR", "3200.00", 200, ApprovalStatus.APPROVED, _R1),  # no aging shown
    SeedInvoice("INV-DEMO-REJ", "760.25", 45, ApprovalStatus.REJECTED, _R2),
]


def seed_demo_invoices(db: Session) -> dict[str, int]:
    """Creates 2 assigned service requests and 6 invoices on them, if missing (matched by
    title / invoice number). Needs seed_users to have run. Dates are relative to today in
    Riyadh, so every aging colour shows whenever the seed runs.
    Returns {"requests": created, "invoices": created}.
    """
    manager = db.query(User).filter(User.email == "manager@srct.local").one()
    operations = db.query(User).filter(User.email == "operations@srct.local").one()

    requests: dict[str, ServiceRequest] = {}
    requests_created = 0
    for title, request_status, engineer_email in SEED_REQUESTS:
        request = db.query(ServiceRequest).filter(ServiceRequest.title == title).first()
        if request is None:
            engineer = db.query(User).filter(User.email == engineer_email).one()
            request = ServiceRequest(
                title=title,
                description="Demo data for invoice aging.",
                priority=Priority.MEDIUM,
                status=request_status,
                requester_id=operations.id,
                assigned_engineer_id=engineer.id,
            )
            db.add(request)
            db.flush()
            requests_created += 1
        requests[title] = request

    today = riyadh_today()
    invoices_created = 0
    for seed in SEED_INVOICES:
        if db.query(Invoice).filter(Invoice.invoice_number == seed.number).first() is not None:
            continue
        request = requests[seed.request_title]
        due_date = today - timedelta(days=seed.days_old)
        decided = seed.status != ApprovalStatus.PENDING
        db.add(
            Invoice(
                service_request_id=request.id,
                invoice_number=seed.number,
                amount=Decimal(seed.amount),
                submission_date=due_date - timedelta(days=30),
                due_date=due_date,
                approval_status=seed.status,
                created_by=request.assigned_engineer_id,
                approved_by=manager.id if decided else None,
                approved_at=utcnow() if decided else None,
            )
        )
        invoices_created += 1

    db.commit()
    return {"requests": requests_created, "invoices": invoices_created}


if __name__ == "__main__":
    with SessionLocal() as session:
        summary = seed_users(session)
        print(f"Seed complete: {summary['created']} created, {summary['skipped']} skipped.")
        demo = seed_demo_invoices(session)
        print(f"Demo data: {demo['requests']} requests, {demo['invoices']} invoices created.")
