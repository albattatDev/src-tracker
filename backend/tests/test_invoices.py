import pytest

from app.models import (
    ApprovalStatus,
    AuditLog,
    ServiceRequest,
    SRStatus,
)
from tests.helpers import TODAY, auth_headers


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    monkeypatch.setattr("app.services.invoices.riyadh_today", lambda: TODAY)


def body(sr: ServiceRequest, **overrides) -> dict:
    data = {
        "service_request_id": sr.id,
        "invoice_number": "INV-1",
        "amount": "1250.50",
        "submission_date": "2026-10-01",
        "due_date": "2026-10-31",
    }
    return {**data, **overrides}


def post(client, user, path, json=None):
    return client.post(path, json=json, headers=auth_headers(user))


def get(client, user, path):
    return client.get(path, headers=auth_headers(user))


def numbers(response) -> set[str]:
    return {item["invoice_number"] for item in response.json()["items"]}


def audit_rows(db_session, invoice_id):
    return (
        db_session.query(AuditLog)
        .filter(AuditLog.entity_type == "invoice", AuditLog.entity_id == invoice_id)
        .order_by(AuditLog.id)
        .all()
    )


# --- POST /invoices ---


def test_engineer_creates_an_invoice_on_own_request(client, db_session, users, make_sr):
    sr = make_sr("engineer1")
    response = post(client, users["engineer1"], "/invoices", body(sr))

    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == "1250.50"  # a string, never a float
    assert data["approval_status"] == "pending"
    assert data["service_request_title"] == "Broken AC"
    assert data["assigned_engineer_name"] == "Fahad Alharbi"
    assert data["created_by_name"] == "Fahad Alharbi"
    assert data["approved_by_name"] is None and data["approved_at"] is None
    assert data["age_days"] == 3 and data["aging_band"] == "green"  # due 2026-10-31

    [row] = audit_rows(db_session, data["id"])
    assert row.action == "create" and row.user_id == users["engineer1"].id
    assert row.new_values["approval_status"] == "pending"
    assert row.new_values["approved_by"] is None and row.new_values["approved_at"] is None


def test_other_engineers_request_is_404(client, users, make_sr):
    sr = make_sr("engineer2")
    response = post(client, users["engineer1"], "/invoices", body(sr))
    assert response.status_code == 404


def test_missing_request_is_404(client, users, make_sr):
    sr = make_sr("engineer1")
    response = post(client, users["engineer1"], "/invoices", body(sr, service_request_id=99999))
    assert response.status_code == 404


def test_operations_cannot_create(client, users, make_sr):
    sr = make_sr("engineer1")
    assert post(client, users["operations"], "/invoices", body(sr)).status_code == 403


def test_manager_cannot_create(client, users, make_sr):
    sr = make_sr("engineer1")
    assert post(client, users["manager"], "/invoices", body(sr)).status_code == 403


def test_duplicate_number_is_409(client, users, make_sr):
    sr = make_sr("engineer1")
    assert post(client, users["engineer1"], "/invoices", body(sr)).status_code == 201
    response = post(client, users["engineer1"], "/invoices", body(sr))
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_unique_index_violation_is_also_409(
    client, db_session, users, make_sr, make_invoice, monkeypatch
):
    """Two requests can both pass the pre-check; the UNIQUE index must still give a 409."""
    sr = make_sr("engineer1")
    make_invoice(sr, number="INV-RACE")
    # Simulate the lost race by hiding the existing row from the pre-check only (it is the
    # one db.scalar call in create_invoice).
    monkeypatch.setattr(db_session, "scalar", lambda *args, **kwargs: None)
    response = post(client, users["engineer1"], "/invoices", body(sr, invoice_number="INV-RACE"))
    assert response.status_code == 409


def test_closed_request_is_400(client, users, make_sr):
    sr = make_sr("engineer1", SRStatus.CLOSED)
    response = post(client, users["engineer1"], "/invoices", body(sr))
    assert response.status_code == 400
    assert "closed" in response.json()["detail"]


@pytest.mark.parametrize("amount", ["0", "-5", "1.234", "10000000000.00", "abc"])
def test_bad_amount_is_422(client, users, make_sr, amount):
    sr = make_sr("engineer1")
    assert post(client, users["engineer1"], "/invoices", body(sr, amount=amount)).status_code == 422


def test_due_date_before_submission_is_422(client, users, make_sr):
    sr = make_sr("engineer1")
    response = post(client, users["engineer1"], "/invoices", body(sr, due_date="2026-09-30"))
    assert response.status_code == 422


def test_due_date_is_optional_and_aging_uses_submission_date(client, users, make_sr):
    sr = make_sr("engineer1")
    response = post(client, users["engineer1"], "/invoices", body(sr, due_date=None))
    assert response.status_code == 201
    assert response.json()["age_days"] == 33  # 2026-10-01 -> 2026-11-03


def test_client_cannot_set_approval_fields(client, users, make_sr):
    sr = make_sr("engineer1")
    response = post(client, users["engineer1"], "/invoices", body(sr, approval_status="approved"))
    assert response.status_code == 422


# --- approve / reject ---


def test_manager_approves_pending_invoice(client, db_session, users, make_sr, make_invoice):
    invoice = make_invoice(make_sr("engineer1"))
    response = post(client, users["manager"], f"/invoices/{invoice.id}/approve")

    assert response.status_code == 200
    data = response.json()
    assert data["approval_status"] == "approved"
    assert data["approved_by_name"] == "Abdullah Alqahtani"
    assert data["approved_at"].endswith("Z")

    [row] = audit_rows(db_session, invoice.id)
    assert row.action == "approve"
    assert row.old_values["approval_status"] == "pending"
    assert row.new_values["approval_status"] == "approved"
    assert row.new_values["approved_by"] == users["manager"].id
    assert row.new_values["approved_at"] is not None


def test_manager_rejects_pending_invoice(client, db_session, users, make_sr, make_invoice):
    invoice = make_invoice(make_sr("engineer1"))
    response = post(client, users["manager"], f"/invoices/{invoice.id}/reject")

    assert response.status_code == 200
    assert response.json()["approval_status"] == "rejected"
    [row] = audit_rows(db_session, invoice.id)
    assert row.action == "reject" and row.new_values["approved_by"] == users["manager"].id


@pytest.mark.parametrize("who", ["engineer1", "operations", "admin"])
@pytest.mark.parametrize("action", ["approve", "reject"])
def test_only_manager_can_decide(client, users, make_sr, make_invoice, who, action):
    invoice = make_invoice(make_sr("engineer1"))
    assert post(client, users[who], f"/invoices/{invoice.id}/{action}").status_code == 403


def test_approve_twice_is_400(client, users, make_sr, make_invoice):
    invoice = make_invoice(make_sr("engineer1"))
    assert post(client, users["manager"], f"/invoices/{invoice.id}/approve").status_code == 200
    assert post(client, users["manager"], f"/invoices/{invoice.id}/approve").status_code == 400


def test_approving_a_rejected_invoice_is_400_and_it_stays_rejected(
    client, db_session, users, make_sr, make_invoice
):
    invoice = make_invoice(make_sr("engineer1"))
    assert post(client, users["manager"], f"/invoices/{invoice.id}/reject").status_code == 200

    response = post(client, users["manager"], f"/invoices/{invoice.id}/approve")
    assert response.status_code == 400

    assert get(client, users["manager"], f"/invoices/{invoice.id}").json()["approval_status"] == (
        "rejected"
    )
    assert [r.action for r in audit_rows(db_session, invoice.id)] == ["reject"]


def test_deciding_a_missing_invoice_is_404(client, users):
    assert post(client, users["manager"], "/invoices/99999/approve").status_code == 404


# --- GET /invoices, GET /invoices/{id} ---


def test_list_visibility_per_role(client, users, make_sr, make_invoice):
    sr1, sr2 = make_sr("engineer1"), make_sr("engineer2")
    make_invoice(sr1, number="A-1")
    make_invoice(sr2, number="B-1")

    assert numbers(get(client, users["engineer1"], "/invoices")) == {"A-1"}
    assert numbers(get(client, users["engineer2"], "/invoices")) == {"B-1"}
    assert numbers(get(client, users["manager"], "/invoices")) == {"A-1", "B-1"}
    assert numbers(get(client, users["admin"], "/invoices")) == {"A-1", "B-1"}
    assert get(client, users["operations"], "/invoices").status_code == 403


def test_detail_outside_visibility_is_404(client, users, make_sr, make_invoice):
    invoice = make_invoice(make_sr("engineer2"))
    assert get(client, users["engineer1"], f"/invoices/{invoice.id}").status_code == 404
    assert get(client, users["manager"], f"/invoices/{invoice.id}").status_code == 200
    assert get(client, users["operations"], f"/invoices/{invoice.id}").status_code == 403
    assert get(client, users["manager"], "/invoices/99999").status_code == 404


def test_api_returns_aging_for_every_invoice_including_approved(client, users, make_sr, make_invoice):
    sr = make_sr("engineer1")
    invoice = make_invoice(sr, age=200, status=ApprovalStatus.APPROVED)
    data = get(client, users["manager"], f"/invoices/{invoice.id}").json()
    assert data["age_days"] == 200 and data["aging_band"] == "red"


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
def test_aging_band_filter_at_boundaries(client, users, make_sr, make_invoice, age, band):
    sr = make_sr("engineer1")
    for n in (29, 30, 59, 60, 180, 181):
        make_invoice(sr, age=n, number=f"AGE-{n}")

    response = get(client, users["manager"], "/invoices?aging_band=" + band)
    expected = {f"AGE-{n}" for n in (29, 30, 59, 60, 180, 181) if band_of(n) == band}
    assert numbers(response) == expected
    assert f"AGE-{age}" in numbers(response)


def band_of(age: int) -> str:
    return "green" if age < 30 else "yellow" if age < 60 else "orange" if age <= 180 else "red"


def test_aging_band_filter_uses_submission_date_when_no_due_date(
    client, users, make_sr, make_invoice
):
    sr = make_sr("engineer1")
    make_invoice(sr, age=45, due=False, number="NO-DUE")
    assert numbers(get(client, users["manager"], "/invoices?aging_band=yellow")) == {"NO-DUE"}


def test_approved_invoice_is_not_in_the_red_band(client, users, make_sr, make_invoice):
    sr = make_sr("engineer1")
    make_invoice(sr, age=200, status=ApprovalStatus.APPROVED, number="OLD-APPROVED")
    make_invoice(sr, age=200, status=ApprovalStatus.PENDING, number="OLD-PENDING")

    assert numbers(get(client, users["manager"], "/invoices?aging_band=red")) == {"OLD-PENDING"}
    # Without the band filter it is still listed.
    assert "OLD-APPROVED" in numbers(get(client, users["manager"], "/invoices"))


def test_rejected_invoice_is_not_in_the_red_band(client, users, make_sr, make_invoice):
    sr = make_sr("engineer1")
    make_invoice(sr, age=200, status=ApprovalStatus.REJECTED, number="OLD-REJECTED")
    make_invoice(sr, age=200, status=ApprovalStatus.PENDING, number="OLD-PENDING")

    assert numbers(get(client, users["manager"], "/invoices?aging_band=red")) == {"OLD-PENDING"}
    assert "OLD-REJECTED" in numbers(get(client, users["manager"], "/invoices"))
    # The API still reports the age of a decided invoice; only the filter and the UI ignore it.
    rejected = get(client, users["manager"], "/invoices?approval_status=rejected").json()["items"][0]
    assert rejected["age_days"] == 200 and rejected["aging_band"] == "red"


def test_status_request_and_search_filters(client, users, make_sr, make_invoice):
    sr1, sr2 = make_sr("engineer1"), make_sr("engineer1")
    make_invoice(sr1, number="ABC-1")
    make_invoice(sr2, number="XYZ-1", status=ApprovalStatus.REJECTED)

    manager = users["manager"]
    assert numbers(get(client, manager, "/invoices?approval_status=rejected")) == {"XYZ-1"}
    assert numbers(get(client, manager, f"/invoices?service_request_id={sr1.id}")) == {"ABC-1"}
    assert numbers(get(client, manager, "/invoices?q=ABC")) == {"ABC-1"}
    assert numbers(get(client, manager, "/invoices?q=%25")) == set()  # % is literal, not a wildcard


def test_sort_and_pagination(client, users, make_sr, make_invoice):
    sr = make_sr("engineer1")
    for age in (10, 50, 90):
        make_invoice(sr, age=age, number=f"S-{age}")

    manager = users["manager"]
    data = get(client, manager, "/invoices?sort=age&order=desc").json()
    assert [i["invoice_number"] for i in data["items"]] == ["S-90", "S-50", "S-10"]
    data = get(client, manager, "/invoices?sort=age&order=asc&page=2&page_size=2").json()
    assert [i["invoice_number"] for i in data["items"]] == ["S-90"]
    assert data["total"] == 3 and data["page"] == 2
    assert get(client, manager, "/invoices?page=99").json()["items"] == []
