from datetime import datetime

import pytest

from app.models import (
    ApprovalStatus,
    DocType,
    Priority,
    ServiceRequest,
    SRStatus,
    UserRole,
)
from tests.helpers import TODAY, auth_headers

ALL_STATUSES = {status.value for status in SRStatus}
BANDS = ["green", "yellow", "orange", "red"]


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    monkeypatch.setattr("app.services.dashboard.riyadh_today", lambda: TODAY)


def dashboard(client, user) -> dict:
    response = client.get("/dashboard", headers=auth_headers(user))
    assert response.status_code == 200
    return response.json()


def zero_statuses(**counts: int) -> dict[str, int]:
    return {status: counts.get(status, 0) for status in ALL_STATUSES}


def zero_bands(**counts: int) -> dict[str, int]:
    return {band: counts.get(band, 0) for band in BANDS}


@pytest.fixture
def other_requests(db_session, users, make_user):
    """A request that neither the operations user nor engineer1 may see: made by another
    operations user and assigned to engineer2. Managers and admins would see it, so their
    tests set up their own rows."""
    other_ops = make_user(email="ops2@srct.local", role=UserRole.OPERATIONS)
    sr = ServiceRequest(
        title="Leak",
        description="Pipe",
        priority=Priority.LOW,
        status=SRStatus.CLOSED,
        requester_id=other_ops.id,
        assigned_engineer_id=users["engineer2"].id,
    )
    db_session.add(sr)
    db_session.commit()
    return sr


# ------------------------------------------------------------------ auth


def test_requires_a_token(client):
    assert client.get("/dashboard").status_code == 401


# ------------------------------------------------------------------ SR counts


def test_all_five_statuses_are_present_with_zeros(client, users):
    for role in ("operations", "engineer1", "manager", "admin"):
        assert dashboard(client, users[role])["sr_by_status"] == zero_statuses()


def test_operations_counts_only_own_requests(client, users, make_sr, other_requests):
    make_sr("engineer1", SRStatus.IN_PROGRESS)
    make_sr(None, SRStatus.OPEN)
    data = dashboard(client, users["operations"])
    assert data["sr_by_status"] == zero_statuses(in_progress=1, open=1)


def test_engineer_counts_only_assigned_requests(client, users, make_sr, other_requests):
    make_sr("engineer1", SRStatus.IN_PROGRESS)
    make_sr("engineer1", SRStatus.RESOLVED)
    make_sr(None, SRStatus.OPEN)
    data = dashboard(client, users["engineer1"])
    assert data["sr_by_status"] == zero_statuses(in_progress=1, resolved=1)


def test_manager_counts_all_requests(client, users, make_sr):
    make_sr("engineer1", SRStatus.IN_PROGRESS)
    make_sr(None, SRStatus.OPEN)
    make_sr("engineer2", SRStatus.CLOSED)
    data = dashboard(client, users["manager"])
    assert data["sr_by_status"] == zero_statuses(in_progress=1, open=1, closed=1)


def test_admin_counts_all_requests(client, users, make_sr):
    make_sr("engineer1", SRStatus.IN_PROGRESS)
    make_sr(None, SRStatus.OPEN)
    make_sr("engineer2", SRStatus.CLOSED)
    data = dashboard(client, users["admin"])
    assert data["sr_by_status"] == zero_statuses(in_progress=1, open=1, closed=1)


# ------------------------------------------------------------------ invoices


def test_invoices_are_null_for_operations(client, users, make_sr, make_invoice):
    make_invoice(make_sr("engineer1"), age=100)
    assert dashboard(client, users["operations"])["invoices_by_band"] is None


def test_all_four_bands_present_with_zeros(client, users):
    for role in ("engineer1", "manager", "admin"):
        assert dashboard(client, users[role])["invoices_by_band"] == zero_bands()


@pytest.mark.parametrize(
    "age, band",
    [
        (29, "green"),
        (30, "yellow"),
        (59, "yellow"),
        (60, "orange"),
        (180, "orange"),
        (181, "red"),
    ],
)
def test_band_boundaries(client, users, make_sr, make_invoice, age, band):
    make_invoice(make_sr("engineer1"), age=age)
    data = dashboard(client, users["manager"])
    assert data["invoices_by_band"] == zero_bands(**{band: 1})


def test_not_yet_due_invoice_is_green(client, users, make_sr, make_invoice):
    make_invoice(make_sr("engineer1"), age=-5)
    assert dashboard(client, users["manager"])["invoices_by_band"] == zero_bands(green=1)


def test_submission_date_is_used_without_a_due_date(client, users, make_sr, make_invoice):
    make_invoice(make_sr("engineer1"), age=181, due=False)
    assert dashboard(client, users["manager"])["invoices_by_band"] == zero_bands(red=1)


@pytest.mark.parametrize("status", [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED])
def test_decided_invoices_are_not_counted(client, users, make_sr, make_invoice, status):
    sr = make_sr("engineer1")
    make_invoice(sr, age=200, status=status)
    make_invoice(sr, age=10)
    assert dashboard(client, users["manager"])["invoices_by_band"] == zero_bands(green=1)


def test_invoice_counts_per_role(client, users, make_sr, make_invoice):
    mine = make_sr("engineer1")
    theirs = make_sr("engineer2")
    make_invoice(mine, age=10)
    make_invoice(mine, age=70)
    make_invoice(theirs, age=200)
    assert dashboard(client, users["engineer1"])["invoices_by_band"] == zero_bands(
        green=1, orange=1
    )
    everything = zero_bands(green=1, orange=1, red=1)
    assert dashboard(client, users["manager"])["invoices_by_band"] == everything
    assert dashboard(client, users["admin"])["invoices_by_band"] == everything


# ------------------------------------------------------------------ documents


@pytest.mark.parametrize("role", ["operations", "engineer1"])
def test_documents_are_null_for_operations_and_engineers(
    client, users, make_contractor, make_document, role
):
    make_document(make_contractor(), days=-5)
    assert dashboard(client, users[role])["documents"] is None


@pytest.mark.parametrize(
    "days, expiring, expired",
    [(31, 0, 0), (30, 1, 0), (0, 1, 0), (-1, 0, 1)],
)
def test_document_boundaries(
    client, users, make_contractor, make_document, days, expiring, expired
):
    make_document(make_contractor(), days=days)
    for role in ("manager", "admin"):
        assert dashboard(client, users[role])["documents"] == {
            "expiring_soon": expiring,
            "expired": expired,
        }


def test_only_the_current_document_counts(client, users, make_contractor, make_document):
    contractor = make_contractor()
    make_document(contractor, DocType.HIP, days=-10, uploaded_at=datetime(2026, 9, 1))
    make_document(contractor, DocType.HIP, days=90, uploaded_at=datetime(2026, 10, 1))
    assert dashboard(client, users["manager"])["documents"] == {"expiring_soon": 0, "expired": 0}


def test_newest_upload_wins_even_when_the_older_one_is_valid(
    client, users, make_contractor, make_document
):
    contractor = make_contractor()
    make_document(contractor, DocType.HIP, days=90, uploaded_at=datetime(2026, 9, 1))
    make_document(contractor, DocType.HIP, days=-3, uploaded_at=datetime(2026, 10, 1))
    assert dashboard(client, users["manager"])["documents"] == {"expiring_soon": 0, "expired": 1}


def test_inactive_contractor_is_ignored(client, users, make_contractor, make_document):
    inactive = make_contractor(name="Old Co", is_active=False)
    active = make_contractor(name="New Co", email="new@example.com")
    make_document(inactive, days=-5)
    make_document(inactive, DocType.JSA, days=10)
    make_document(active, days=10)
    assert dashboard(client, users["manager"])["documents"] == {"expiring_soon": 1, "expired": 0}
