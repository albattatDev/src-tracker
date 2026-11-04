from datetime import datetime

import pytest

from app.models import AuditLog
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
