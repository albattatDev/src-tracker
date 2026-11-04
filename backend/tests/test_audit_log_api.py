from contextlib import contextmanager
from datetime import datetime

import pytest
from sqlalchemy import event

from app.models import AuditLog, DocType
from app.services.audit import redact
from tests.helpers import auth_headers


@pytest.fixture
def make_entry(db_session):
    def _make(created_at, user=None, action="update", entity_type="service_request",
              entity_id=1, old=None, new=None):
        entry = AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old,
            new_values=new,
            created_at=created_at,
        )
        db_session.add(entry)
        db_session.flush()
        return entry

    return _make


def get(client, user, **params):
    return client.get("/audit-log", params=params, headers=auth_headers(user))


def ids(response):
    return [item["id"] for item in response.json()["items"]]


# ---- access ----

@pytest.mark.parametrize("path", ["/audit-log", "/audit-log/users"])
def test_no_token_is_401(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", ["/audit-log", "/audit-log/users"])
@pytest.mark.parametrize("role", ["engineer1", "operations"])
def test_engineer_and_operations_get_403(client, users, path, role):
    assert client.get(path, headers=auth_headers(users[role])).status_code == 403


@pytest.mark.parametrize("path", ["/audit-log", "/audit-log/users"])
@pytest.mark.parametrize("role", ["manager", "admin"])
def test_manager_and_admin_get_200(client, users, path, role):
    assert client.get(path, headers=auth_headers(users[role])).status_code == 200


# ---- ordering, pagination ----

def test_newest_first_with_id_tie_break(client, users, make_entry):
    old = make_entry(datetime(2026, 11, 1, 10))
    tie_a = make_entry(datetime(2026, 11, 2, 10))
    tie_b = make_entry(datetime(2026, 11, 2, 10))
    new = make_entry(datetime(2026, 11, 3, 10))
    assert ids(get(client, users["manager"])) == [new.id, tie_b.id, tie_a.id, old.id]


def test_pagination(client, users, make_entry):
    entries = [make_entry(datetime(2026, 11, 1, h)) for h in range(5)]
    newest_first = [e.id for e in reversed(entries)]
    r = get(client, users["manager"], page=2, page_size=2)
    body = r.json()
    assert (body["total"], body["page"], body["page_size"]) == (5, 2, 2)
    assert ids(r) == newest_first[2:4]
    assert ids(get(client, users["manager"], page=3, page_size=2)) == newest_first[4:]
    assert get(client, users["manager"], page=9, page_size=2).json()["items"] == []
    assert get(client, users["manager"], page_size=101).status_code == 422


# ---- filters ----

def test_entity_type_filter(client, users, make_entry):
    make_entry(datetime(2026, 11, 1), entity_type="invoice")
    sr = make_entry(datetime(2026, 11, 1), entity_type="service_request")
    assert ids(get(client, users["manager"], entity_type="service_request")) == [sr.id]
    assert get(client, users["manager"], entity_type="nope").status_code == 422


def test_action_filter(client, users, make_entry):
    make_entry(datetime(2026, 11, 1), action="create")
    assign = make_entry(datetime(2026, 11, 1), action="assign")
    assert ids(get(client, users["manager"], action="assign")) == [assign.id]
    assert get(client, users["manager"], action="nope").status_code == 422


def test_user_filter(client, users, make_entry):
    make_entry(datetime(2026, 11, 1), user=users["admin"])
    mine = make_entry(datetime(2026, 11, 1), user=users["manager"])
    assert ids(get(client, users["manager"], user_id=users["manager"].id)) == [mine.id]


def test_date_to_includes_last_riyadh_day_and_excludes_next(client, users, make_entry):
    # Riyadh is UTC+3: 23:30 on Nov 3 = 20:30Z, 00:30 on Nov 4 = 21:30Z.
    inside = make_entry(datetime(2026, 11, 3, 20, 30))
    make_entry(datetime(2026, 11, 3, 21, 30))
    assert ids(get(client, users["manager"], date_to="2026-11-03")) == [inside.id]


def test_date_from_starts_at_riyadh_midnight(client, users, make_entry):
    make_entry(datetime(2026, 11, 2, 20, 59))  # 23:59 Riyadh on Nov 2: excluded
    inside = make_entry(datetime(2026, 11, 2, 21, 0))  # 00:00 Riyadh on Nov 3: included
    assert ids(get(client, users["manager"], date_from="2026-11-03")) == [inside.id]


def test_bad_date_range_is_400(client, users):
    r = get(client, users["manager"], date_from="2026-11-05", date_to="2026-11-01")
    assert r.status_code == 400
    assert get(client, users["manager"], date_from="not-a-date").status_code == 422


# ---- response shape and safety ----

def test_password_data_never_returned(client, users, make_entry):
    make_entry(
        datetime(2026, 11, 1),
        old={"password_hash": "$2b$secret", "title": "a", "nested": {"password": "pw"}},
        new={"password": "pw2", "items": [{"password_hash": "x", "ok": 1}]},
    )
    r = get(client, users["admin"])
    assert "password" not in r.text.lower()
    assert "secret" not in r.text
    item = r.json()["items"][0]
    assert item["old_values"] == {"title": "a", "nested": {}}
    assert item["new_values"] == {"items": [{"ok": 1}]}


def test_redact_unit():
    assert redact(None) is None
    assert redact({"password": 1, "a": [{"password_hash": 2, "b": 3}]}) == {"a": [{"b": 3}]}


def test_inactive_user_name_still_shown(client, users, make_user, make_entry):
    gone = make_user(email="gone@srct.local", is_active=False)
    make_entry(datetime(2026, 11, 1), user=gone)
    user = get(client, users["manager"]).json()["items"][0]["user"]
    assert user == {"id": gone.id, "full_name": "Test User"}


def test_null_user_does_not_break_list(client, users, make_entry):
    make_entry(datetime(2026, 11, 1), user=None)
    r = get(client, users["manager"])
    assert r.status_code == 200
    assert r.json()["items"][0]["user"] is None


def test_unknown_action_and_entity_type_do_not_cause_500(client, users, make_entry):
    make_entry(datetime(2026, 11, 1), action="archive", entity_type="widget")
    r = get(client, users["manager"])
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert (item["action"], item["entity_type"]) == ("archive", "widget")


def test_created_at_is_utc_z(client, users, make_entry):
    make_entry(datetime(2026, 11, 3, 20, 30))
    assert get(client, users["manager"]).json()["items"][0]["created_at"] == "2026-11-03T20:30:00Z"


def test_audit_users_lists_distinct_actors(client, users, make_entry):
    make_entry(datetime(2026, 11, 1), user=users["manager"])
    make_entry(datetime(2026, 11, 2), user=users["manager"])
    make_entry(datetime(2026, 11, 2), user=None)
    r = client.get("/audit-log/users", headers=auth_headers(users["admin"]))
    assert [u["id"] for u in r.json()] == [users["manager"].id]


# ---- single entry ----

def get_one(client, user, entry_id):
    return client.get(f"/audit-log/{entry_id}", headers=auth_headers(user))


def test_entry_no_token_is_401(client):
    assert client.get("/audit-log/1").status_code == 401


@pytest.mark.parametrize("role", ["engineer1", "operations"])
def test_entry_engineer_and_operations_get_403(client, users, make_entry, role):
    entry = make_entry(datetime(2026, 11, 1, 10))
    assert get_one(client, users[role], entry.id).status_code == 403


@pytest.mark.parametrize("role", ["manager", "admin"])
def test_entry_manager_and_admin_get_200(client, users, make_entry, role):
    entry = make_entry(datetime(2026, 11, 1, 10), user=users["manager"], new={"title": "x"})
    response = get_one(client, users[role], entry.id)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == entry.id
    assert body["user"]["full_name"] == users["manager"].full_name
    assert body["new_values"] == {"title": "x"}
    assert body["created_at"].endswith("Z")


def test_entry_matches_list_item(client, users, make_entry):
    entry = make_entry(datetime(2026, 11, 1, 10), user=users["manager"], old={"a": 1}, new={"a": 2})
    listed = get(client, users["manager"]).json()["items"][0]
    assert get_one(client, users["manager"], entry.id).json() == listed


def test_entry_unknown_id_is_404(client, users):
    assert get_one(client, users["manager"], 999999).status_code == 404


def test_entry_system_row_has_null_user(client, users, make_entry):
    entry = make_entry(datetime(2026, 11, 1, 10), user=None)
    assert get_one(client, users["manager"], entry.id).json()["user"] is None


def test_entry_never_returns_password_data(client, users, make_entry):
    entry = make_entry(datetime(2026, 11, 1, 10), new={"email": "a@b.c", "password_hash": "secret"})
    body = get_one(client, users["manager"], entry.id).json()
    assert "password_hash" not in body["new_values"]
    assert "secret" not in str(body)


# ---- labels: names instead of ids ----

def label_of(client, user, entry):
    response = get_one(client, user, entry.id)
    assert response.status_code == 200
    return response.json()["entity_label"]


def test_entity_labels_for_each_entity_type(client, users, make_entry, make_contractor, make_sr, make_invoice, make_document):
    contractor = make_contractor(name="Eastline Maintenance")
    sr = make_sr()
    invoice = make_invoice(sr, number="INV-DEMO-045")
    document = make_document(contractor, doc_type=DocType.CCSP)
    when = datetime(2026, 11, 1, 10)
    viewer = users["manager"]

    assert label_of(client, viewer, make_entry(when, entity_type="contractor", entity_id=contractor.id)) == "Eastline Maintenance"
    assert label_of(client, viewer, make_entry(when, entity_type="invoice", entity_id=invoice.id)) == "INV-DEMO-045"
    assert label_of(client, viewer, make_entry(when, entity_type="service_request", entity_id=sr.id)) == "Broken AC"
    assert label_of(client, viewer, make_entry(when, entity_type="user", entity_id=users["engineer1"].id)) == users["engineer1"].full_name
    assert label_of(client, viewer, make_entry(when, entity_type="contractor_document", entity_id=document.id)) == "CCSP · Eastline Maintenance"


def test_deleted_entity_falls_back_to_the_snapshot(client, users, make_entry):
    when = datetime(2026, 11, 1, 10)
    viewer = users["manager"]
    contractor = make_entry(when, action="delete", entity_type="contractor", entity_id=9001, old={"name": "Gone Co"})
    invoice = make_entry(when, action="delete", entity_type="invoice", entity_id=9002, old={"invoice_number": "INV-GONE"})
    request = make_entry(when, action="delete", entity_type="service_request", entity_id=9003, old={"title": "Old leak"})
    user = make_entry(when, action="delete", entity_type="user", entity_id=9004, old={"first_name": "Ann", "last_name": "Lee"})
    assert label_of(client, viewer, contractor) == "Gone Co"
    assert label_of(client, viewer, invoice) == "INV-GONE"
    assert label_of(client, viewer, request) == "Old leak"
    assert label_of(client, viewer, user) == "Ann Lee"


def test_deleted_document_uses_the_snapshot_and_its_contractor(client, users, make_entry, make_contractor):
    contractor = make_contractor(name="Eastline Maintenance")
    entry = make_entry(
        datetime(2026, 11, 1, 10),
        action="delete",
        entity_type="contractor_document",
        entity_id=9005,
        old={"doc_type": "JSA", "contractor_id": contractor.id},
    )
    assert label_of(client, users["manager"], entry) == "JSA · Eastline Maintenance"


def test_label_is_null_when_nothing_names_the_entity(client, users, make_entry):
    when = datetime(2026, 11, 1, 10)
    assert label_of(client, users["manager"], make_entry(when, entity_type="contractor", entity_id=9006)) is None
    assert label_of(client, users["manager"], make_entry(when, entity_type="mystery", entity_id=1)) is None


def test_diff_with_ids_on_both_sides_is_labelled_on_both_sides(client, users, make_entry, make_contractor, make_sr):
    contractor = make_contractor(name="Eastline Maintenance")
    sr = make_sr()
    entry = make_entry(
        datetime(2026, 11, 1, 10),
        entity_type="contractor",
        entity_id=contractor.id,
        old={"internal_manager_id": users["admin"].id, "contractor_id": contractor.id, "service_request_id": sr.id},
        new={"internal_manager_id": users["manager"].id},
    )
    labels = get_one(client, users["manager"], entry.id).json()["value_labels"]
    assert labels["internal_manager_id"] == {
        str(users["admin"].id): users["admin"].full_name,
        str(users["manager"].id): users["manager"].full_name,
    }
    assert labels["contractor_id"] == {str(contractor.id): "Eastline Maintenance"}
    assert labels["service_request_id"] == {str(sr.id): "Broken AC"}


def test_unknown_ids_and_non_ids_get_no_label(client, users, make_entry):
    entry = make_entry(
        datetime(2026, 11, 1, 10),
        new={"uploaded_by": 999999, "created_by": True, "approved_by": "7", "title": "x"},
    )
    assert get_one(client, users["manager"], entry.id).json()["value_labels"] == {}


def test_list_and_detail_return_the_same_labels(client, users, make_entry, make_contractor):
    contractor = make_contractor(name="Eastline Maintenance")
    entry = make_entry(
        datetime(2026, 11, 1, 10),
        user=users["manager"],
        entity_type="contractor",
        entity_id=contractor.id,
        new={"internal_manager_id": users["manager"].id},
    )
    listed = get(client, users["manager"]).json()["items"][0]
    detail = get_one(client, users["manager"], entry.id).json()
    assert listed == detail
    assert detail["entity_label"] == "Eastline Maintenance"
    assert detail["value_labels"]["internal_manager_id"] == {str(users["manager"].id): users["manager"].full_name}


@contextmanager
def count_queries(db_session):
    statements: list[str] = []

    def before(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    bind = db_session.get_bind()
    event.listen(bind, "before_cursor_execute", before)
    try:
        yield statements
    finally:
        event.remove(bind, "before_cursor_execute", before)


def test_query_count_does_not_grow_with_page_size(client, users, db_session, make_entry, make_contractor, make_sr, make_invoice, make_document):
    # 20 entries in groups of five types, newest first, so a page of 5 and a page of 20 both
    # touch every entity type; the 20 resolve four times as many ids.
    for i in range(20):
        when = datetime(2026, 11, 1, 10, i)
        contractor = make_contractor(name=f"Contractor {i}", email=f"c{i}@example.com")
        sr = make_sr()
        invoice = make_invoice(sr)
        document = make_document(contractor)
        kind = i % 5
        if kind == 0:
            make_entry(when, user=users["manager"], entity_type="contractor", entity_id=contractor.id, new={"internal_manager_id": users["manager"].id})
        elif kind == 1:
            make_entry(when, entity_type="service_request", entity_id=sr.id, new={"assigned_engineer_id": users["engineer1"].id})
        elif kind == 2:
            make_entry(when, entity_type="invoice", entity_id=invoice.id, new={"service_request_id": sr.id})
        elif kind == 3:
            make_entry(when, entity_type="contractor_document", entity_id=document.id, new={"uploaded_by": users["manager"].id})
        else:
            make_entry(when, entity_type="user", entity_id=users["engineer1"].id)
    db_session.commit()

    # The first request after the commit also opens the test session's savepoint; do one
    # unmeasured request so both measured ones start from the same state.
    get(client, users["manager"], page_size=5)

    with count_queries(db_session) as small:
        assert len(get(client, users["manager"], page_size=5).json()["items"]) == 5
    with count_queries(db_session) as large:
        assert len(get(client, users["manager"], page_size=20).json()["items"]) == 20
    assert len(small) == len(large)
    # The most one request may run: the caller's own user lookup, the count, the page, and one
    # label lookup per entity type (users, contractors, requests, invoices, documents).
    caller, count, page, label_lookups = 1, 1, 1, 5
    selects = [q for q in small if q.lstrip().upper().startswith("SELECT")]
    assert len(selects) <= caller + count + page + label_lookups


def test_labels_do_not_change_access_or_redaction(client, users, make_entry):
    entry = make_entry(datetime(2026, 11, 1, 10), new={"email": "a@b.c", "password_hash": "secret"})
    assert get_one(client, users["engineer1"], entry.id).status_code == 403
    body = get_one(client, users["admin"], entry.id).json()
    assert "password_hash" not in body["new_values"]
    assert "entity_label" in body and "value_labels" in body
