"""Test fixtures.

Everything here is built around one rule: tests must never be able to touch the
real `srct` database. DB_NAME is pointed at srct_test before `app` is imported, and
`assert_test_db` re-checks the URL before any schema-mutating call (running
migrations, building the engine, tearing down).
"""

import os
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from tests.db_guard import TEST_DB_NAME, assert_test_db

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Must run before anything imports `app`: environment variables beat .env in
# pydantic-settings, so from here on the app's own engine (app.core.database) and every
# `settings.database_url` point at srct_test. A test that builds TestClient(app)
# directly, or code that opens its own SessionLocal, therefore cannot reach `srct`.
os.environ["DB_NAME"] = TEST_DB_NAME

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    ApprovalStatus,
    Contractor,
    ContractorDocument,
    DocType,
    Invoice,
    Priority,
    ServiceRequest,
    SRStatus,
    User,
    UserRole,
)
from app.seed import seed_users  # noqa: E402
from tests.helpers import TODAY, get_user  # noqa: E402

# Fails the whole run if `app` was already imported (and configured) before this file.
assert_test_db(settings.database_url)


@pytest.fixture(scope="session")
def alembic_cfg() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.attributes["url"] = assert_test_db(settings.database_url)
    return cfg


@pytest.fixture(scope="session")
def engine(alembic_cfg: Config):
    """Runs `alembic upgrade head` against srct_test for the whole test session,
    then downgrades back to base so the database is left clean."""
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(alembic_cfg.attributes["url"])
    yield engine
    engine.dispose()

    command.downgrade(alembic_cfg, "base")


@pytest.fixture
def db_session(engine):
    """One test = one transaction, rolled back afterwards. Commits inside
    application code (e.g. seed_users) become savepoints via
    join_transaction_mode='create_savepoint', so they don't escape the rollback.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session):
    def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def users(db_session: Session) -> dict[str, User]:
    """The seeded demo users by short name: operations, manager, engineer1, engineer2, admin."""
    seed_users(db_session)
    return {
        name: get_user(db_session, f"{name}@srct.local")
        for name in ("operations", "manager", "engineer1", "engineer2", "admin")
    }


@pytest.fixture
def make_user(db_session: Session):
    def _make_user(
        email: str = "user@srct.local",
        password: str = "correct-password",
        role: UserRole = UserRole.ENGINEER,
        is_active: bool = True,
    ) -> User:
        user = User(
            first_name="Test",
            last_name="User",
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        db_session.add(user)
        db_session.flush()
        return user

    return _make_user


@pytest.fixture
def make_sr(db_session, users):
    def _make(engineer_key: str | None = "engineer1", status: SRStatus = SRStatus.IN_PROGRESS):
        sr = ServiceRequest(
            title="Broken AC",
            description="Room 4 is hot",
            priority=Priority.HIGH,
            status=status,
            requester_id=users["operations"].id,
            assigned_engineer_id=users[engineer_key].id if engineer_key else None,
        )
        db_session.add(sr)
        db_session.commit()
        return sr

    return _make


@pytest.fixture
def make_invoice(db_session, users):
    """An invoice `age` days past its due date, counted from helpers.TODAY (the test must
    freeze the code under test to the same day). due=False leaves due_date empty."""
    counter = iter(range(1, 1000))

    def _make(
        sr: ServiceRequest,
        age: int | None = 10,
        status: ApprovalStatus = ApprovalStatus.PENDING,
        number: str | None = None,
        due: bool = True,
    ) -> Invoice:
        ref = TODAY - timedelta(days=age if age is not None else 0)
        decided = status != ApprovalStatus.PENDING
        invoice = Invoice(
            service_request_id=sr.id,
            invoice_number=number or f"INV-{next(counter):04d}",
            amount="100.00",
            submission_date=ref - timedelta(days=1) if due else ref,
            due_date=ref if due else None,
            approval_status=status,
            # An unassigned request has no engineer; the invoice still needs a creator.
            created_by=sr.assigned_engineer_id or users["engineer1"].id,
            approved_by=users["manager"].id if decided else None,
        )
        db_session.add(invoice)
        db_session.commit()
        return invoice

    return _make


@pytest.fixture
def make_contractor(db_session, users):
    def _make(name="Acme Safety", manager="manager", is_active=True, email="acme@example.com"):
        contractor = Contractor(
            name=name,
            contact_email=email,
            internal_manager_id=users[manager].id,
            is_active=is_active,
        )
        db_session.add(contractor)
        db_session.commit()
        return contractor

    return _make


@pytest.fixture
def make_document(db_session, users):
    """A document expiring `days` days after helpers.TODAY (negative = already expired)."""

    def _make(contractor, doc_type=DocType.HIP, days=90, uploaded_at=None, filename="a.pdf"):
        document = ContractorDocument(
            contractor_id=contractor.id,
            doc_type=doc_type,
            file_path=f"contractors/{contractor.id}/{filename}",
            original_filename=filename,
            expiry_date=TODAY + timedelta(days=days),
            uploaded_by=users["manager"].id,
            uploaded_at=uploaded_at or datetime(2026, 10, 1, 8, 0, 0),
        )
        db_session.add(document)
        db_session.commit()
        return document

    return _make
