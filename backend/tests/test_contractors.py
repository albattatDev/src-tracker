from datetime import datetime

import pytest

from app.models import AuditLog, Contractor, DocType, UserRole
from tests.helpers import TODAY, auth_headers


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    # The list reads "today" in one module, document statuses in the other.
    monkeypatch.setattr("app.services.contractors.riyadh_today", lambda: TODAY)
    monkeypatch.setattr("app.services.contractor_documents.riyadh_today", lambda: TODAY)


def new_contractor_body(users, **overrides):
    return {
        "name": "Delta Works",
        "contact_email": "ops@delta.example",
        "internal_manager_id": users["manager"].id,
        **overrides,
    }


# ------------------------------------------------------------------------- create


def test_manager_creates_a_contractor(client, db_session, users):
    response = client.post(
        "/contractors", json=new_contractor_body(users), headers=auth_headers(users["manager"])
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Delta Works"
    assert body["is_active"] is True
    assert body["internal_manager_name"] == users["manager"].full_name
    assert db_session.get(Contractor, body["id"]) is not None


def test_create_writes_an_audit_row_with_new_values(client, db_session, users):
    response = client.post(
        "/contractors", json=new_contractor_body(users), headers=auth_headers(users["manager"])
    )

    entry = db_session.query(AuditLog).filter_by(
        entity_type="contractor", entity_id=response.json()["id"]
    ).one()
    assert entry.action == "create"
    assert entry.user_id == users["manager"].id
    assert entry.old_values is None
    assert entry.new_values["name"] == "Delta Works"
    assert entry.new_values["internal_manager_id"] == users["manager"].id


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 201},
        {"contact_email": "not-an-email"},
        {"contact_email": "a@b"},
        {"contact_email": ""},
        {"internal_manager_id": "abc"},
        {"is_active": False},  # unknown field
    ],
)
def test_create_validates_input(client, users, overrides):
    response = client.post(
        "/contractors",
        json=new_contractor_body(users, **overrides),
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 422


# ------------------------------------------------------------- internal manager rule


@pytest.mark.parametrize("who", ["engineer1", "operations", "admin"])
def test_internal_manager_must_have_the_manager_role(client, users, who):
    response = client.post(
        "/contractors",
        json=new_contractor_body(users, internal_manager_id=users[who].id),
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 400
    assert "manager" in response.json()["detail"].lower()


def test_internal_manager_must_exist(client, users):
    response = client.post(
        "/contractors",
        json=new_contractor_body(users, internal_manager_id=999_999),
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 400


def test_internal_manager_must_be_active(client, make_user, users):
    inactive = make_user(email="gone@srct.local", role=UserRole.MANAGER, is_active=False)

    response = client.post(
        "/contractors",
        json=new_contractor_body(users, internal_manager_id=inactive.id),
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 400


def test_patch_also_checks_the_internal_manager(client, make_contractor, users):
    contractor = make_contractor()

    response = client.patch(
        f"/contractors/{contractor.id}",
        json={"internal_manager_id": users["engineer1"].id},
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 400


def test_patch_can_switch_to_another_active_manager(client, make_user, make_contractor, users):
    other = make_user(email="boss2@srct.local", role=UserRole.MANAGER)
    contractor = make_contractor()

    response = client.patch(
        f"/contractors/{contractor.id}",
        json={"internal_manager_id": other.id},
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 200
    assert response.json()["internal_manager_id"] == other.id


# --------------------------------------------------------------------------- patch


def test_patch_updates_only_the_sent_fields_and_audits_old_and_new(
    client, db_session, make_contractor, users
):
    contractor = make_contractor(name="Old Name", email="old@example.com")

    response = client.patch(
        f"/contractors/{contractor.id}",
        json={"name": "New Name"},
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["contact_email"] == "old@example.com"
    entry = db_session.query(AuditLog).filter_by(
        entity_type="contractor", entity_id=contractor.id, action="update"
    ).one()
    assert entry.old_values["name"] == "Old Name"
    assert entry.new_values["name"] == "New Name"


def test_patch_deactivates_and_reactivates(client, db_session, make_contractor, users):
    contractor = make_contractor()
    headers = auth_headers(users["manager"])

    off = client.patch(f"/contractors/{contractor.id}", json={"is_active": False}, headers=headers)
    on = client.patch(f"/contractors/{contractor.id}", json={"is_active": True}, headers=headers)

    assert off.json()["is_active"] is False
    assert on.json()["is_active"] is True
    assert db_session.query(AuditLog).filter_by(entity_type="contractor", action="update").count() == 2


def test_patch_with_no_change_writes_no_audit_row(client, db_session, make_contractor, users):
    contractor = make_contractor(name="Same")

    response = client.patch(
        f"/contractors/{contractor.id}", json={"name": "Same"}, headers=auth_headers(users["manager"])
    )

    assert response.status_code == 200
    assert db_session.query(AuditLog).filter_by(entity_type="contractor").count() == 0


@pytest.mark.parametrize("body", [{"name": None}, {"is_active": None}, {"unknown": 1}, {"name": ""}])
def test_patch_rejects_nulls_unknown_fields_and_blank_names(client, make_contractor, users, body):
    contractor = make_contractor()

    response = client.patch(
        f"/contractors/{contractor.id}", json=body, headers=auth_headers(users["manager"])
    )

    assert response.status_code == 422


def test_patch_unknown_contractor_is_404(client, users):
    response = client.patch(
        "/contractors/999999", json={"name": "x"}, headers=auth_headers(users["manager"])
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Contractor not found"}


def test_there_are_no_delete_endpoints(client, make_contractor, users):
    contractor = make_contractor()

    response = client.delete(f"/contractors/{contractor.id}", headers=auth_headers(users["manager"]))

    assert response.status_code == 405


# ---------------------------------------------------------------------------- list


def list_as(client, user, **params):
    return client.get("/contractors", params=params, headers=auth_headers(user))


def test_list_returns_name_sorted_page_with_manager_name(client, make_contractor, users):
    make_contractor(name="Zeta")
    make_contractor(name="Alpha")

    body = list_as(client, users["manager"]).json()

    assert [item["name"] for item in body["items"]] == ["Alpha", "Zeta"]
    assert body["total"] == 2
    assert body["items"][0]["internal_manager_name"] == users["manager"].full_name


def test_list_filters_by_name_and_active_flag(client, make_contractor, users):
    make_contractor(name="Alpha Safety")
    make_contractor(name="Beta Safety", is_active=False)
    make_contractor(name="Gamma Electric")

    def names(**params):
        return [i["name"] for i in list_as(client, users["manager"], **params).json()["items"]]

    assert names(q="safety") == ["Alpha Safety", "Beta Safety"]
    assert names(q="safety", is_active="true") == ["Alpha Safety"]
    assert names(is_active="false") == ["Beta Safety"]
    assert names() == ["Alpha Safety", "Beta Safety", "Gamma Electric"]


def test_list_search_treats_percent_literally(client, make_contractor, users):
    make_contractor(name="100% Safe")
    make_contractor(name="Other")

    items = list_as(client, users["manager"], q="%").json()["items"]

    assert [i["name"] for i in items] == ["100% Safe"]


def test_list_paginates(client, make_contractor, users):
    for number in range(5):
        make_contractor(name=f"C{number}")

    page2 = list_as(client, users["manager"], page=2, page_size=2).json()
    past_end = list_as(client, users["manager"], page=9, page_size=2).json()

    assert [i["name"] for i in page2["items"]] == ["C2", "C3"]
    assert page2["total"] == 5
    assert past_end["items"] == [] and past_end["total"] == 5


def test_list_doc_counts_cover_current_documents_only(
    client, make_contractor, make_document, users
):
    contractor = make_contractor()
    make_document(contractor, DocType.HIP, days=90)  # valid
    make_document(contractor, DocType.JSA, days=12)  # expiring soon
    make_document(contractor, DocType.CCSP, days=-5)  # expired
    # An old expired HIP was replaced by the valid one above, so it must not count.
    make_document(contractor, DocType.HIP, days=-100, uploaded_at=datetime(2026, 1, 1))

    (item,) = list_as(client, users["manager"]).json()["items"]

    assert item["doc_counts"] == {"valid": 1, "expiring_soon": 1, "expired": 1}
    assert item["types_uploaded"] == 3


def test_list_contractor_without_documents_has_zero_counts(client, make_contractor, users):
    make_contractor()

    (item,) = list_as(client, users["manager"]).json()["items"]

    assert item["doc_counts"] == {"valid": 0, "expiring_soon": 0, "expired": 0}
    assert item["types_uploaded"] == 0


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"is_active": "maybe"}])
def test_list_rejects_bad_params(client, users, params):
    assert list_as(client, users["manager"], **params).status_code == 422


# -------------------------------------------------------- current vs history / detail


def test_detail_shows_only_the_current_document_per_type_with_status(
    client, make_contractor, make_document, users
):
    contractor = make_contractor()
    make_document(contractor, DocType.HIP, days=-100, uploaded_at=datetime(2026, 1, 1), filename="old.pdf")
    make_document(contractor, DocType.HIP, days=12, uploaded_at=datetime(2026, 6, 1), filename="new.pdf")
    make_document(contractor, DocType.JSA, days=-5)

    body = client.get(f"/contractors/{contractor.id}", headers=auth_headers(users["manager"])).json()

    by_type = {d["doc_type"]: d for d in body["current_documents"]}
    assert set(by_type) == {"HIP", "JSA"}
    assert by_type["HIP"]["original_filename"] == "new.pdf"
    assert by_type["HIP"]["status"] == "expiring_soon"
    assert by_type["HIP"]["days_left"] == 12
    assert by_type["HIP"]["upload_count"] == 2
    assert by_type["HIP"]["is_current"] is True
    assert by_type["JSA"]["status"] == "expired"
    assert by_type["JSA"]["days_left"] == -5
    assert by_type["JSA"]["upload_count"] == 1
    assert by_type["HIP"]["uploaded_by_name"] == users["manager"].full_name


def test_detail_tie_on_uploaded_at_picks_the_highest_id(
    client, make_contractor, make_document, users
):
    contractor = make_contractor()
    same_time = datetime(2026, 10, 1, 8, 0, 0)
    make_document(contractor, DocType.HIP, days=10, uploaded_at=same_time, filename="first.pdf")
    second = make_document(contractor, DocType.HIP, days=200, uploaded_at=same_time, filename="second.pdf")

    body = client.get(f"/contractors/{contractor.id}", headers=auth_headers(users["manager"])).json()

    (current,) = body["current_documents"]
    assert current["id"] == second.id


def test_history_lists_every_upload_newest_first_and_marks_the_current_one(
    client, make_contractor, make_document, users
):
    contractor = make_contractor()
    old = make_document(contractor, DocType.HIP, uploaded_at=datetime(2026, 1, 1), filename="old.pdf")
    new = make_document(contractor, DocType.HIP, uploaded_at=datetime(2026, 6, 1), filename="new.pdf")
    other = make_document(contractor, DocType.JSA, filename="jsa.pdf")

    headers = auth_headers(users["manager"])
    all_docs = client.get(f"/contractors/{contractor.id}/documents", headers=headers).json()
    hip_docs = client.get(
        f"/contractors/{contractor.id}/documents", params={"doc_type": "HIP"}, headers=headers
    ).json()

    assert [d["id"] for d in hip_docs] == [new.id, old.id]
    assert [d["is_current"] for d in hip_docs] == [True, False]
    assert {d["id"] for d in all_docs} == {old.id, new.id, other.id}
    assert next(d for d in all_docs if d["id"] == other.id)["is_current"] is True


def test_history_rejects_an_unknown_doc_type(client, make_contractor, users):
    contractor = make_contractor()

    response = client.get(
        f"/contractors/{contractor.id}/documents",
        params={"doc_type": "NOPE"},
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 422


def test_detail_and_history_of_unknown_contractor_are_404(client, users):
    headers = auth_headers(users["manager"])

    assert client.get("/contractors/999999", headers=headers).status_code == 404
    assert client.get("/contractors/999999/documents", headers=headers).status_code == 404


# ------------------------------------------------------------------------------ RBAC


@pytest.mark.parametrize("who", ["manager", "admin"])
def test_manager_and_admin_can_read(client, make_contractor, users, who):
    contractor = make_contractor()
    headers = auth_headers(users[who])

    assert client.get("/contractors", headers=headers).status_code == 200
    assert client.get(f"/contractors/{contractor.id}", headers=headers).status_code == 200
    assert client.get(f"/contractors/{contractor.id}/documents", headers=headers).status_code == 200


def test_admin_cannot_write(client, db_session, make_contractor, users):
    contractor = make_contractor()
    headers = auth_headers(users["admin"])

    create = client.post("/contractors", json=new_contractor_body(users), headers=headers)
    patch = client.patch(f"/contractors/{contractor.id}", json={"name": "Hacked"}, headers=headers)

    assert create.status_code == 403
    assert patch.status_code == 403
    assert db_session.get(Contractor, contractor.id).name == "Acme Safety"
    assert db_session.query(AuditLog).filter_by(entity_type="contractor").count() == 0


@pytest.mark.parametrize("who", ["engineer1", "operations"])
def test_engineer_and_operations_get_403_everywhere(client, make_contractor, users, who):
    contractor = make_contractor()
    headers = auth_headers(users[who])
    cid = contractor.id

    responses = [
        client.get("/contractors", headers=headers),
        client.post("/contractors", json=new_contractor_body(users), headers=headers),
        client.get(f"/contractors/{cid}", headers=headers),
        client.patch(f"/contractors/{cid}", json={"name": "x"}, headers=headers),
        client.get(f"/contractors/{cid}/documents", headers=headers),
        client.get("/documents/1/download", headers=headers),
    ]

    assert [r.status_code for r in responses] == [403] * 6


def test_unauthenticated_gets_401(client, make_contractor):
    contractor = make_contractor()

    assert client.get("/contractors").status_code == 401
    assert client.get(f"/contractors/{contractor.id}").status_code == 401
