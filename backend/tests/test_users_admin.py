import pytest
from sqlalchemy import select

from app.core.security import verify_password
from app.models import AuditLog, SRStatus, User, UserRole
from app.services.audit import AuditAction, AuditEntity, log_action, row_values
from app.services.users import LastActiveAdmin, UserNotFound, update_user
from app.schemas.user import UserUpdate
from tests.helpers import auth_headers

NEW_USER = {
    "first_name": "Nora",
    "last_name": "Alsaud",
    "email": "nora@srct.local",
    "role": "engineer",
    "password": "initial-pass-1",
}


def post(client, actor, body=None):
    return client.post("/users", json=body or NEW_USER, headers=auth_headers(actor))


def patch(client, actor, user, body):
    return client.patch(f"/users/{user.id}", json=body, headers=auth_headers(actor))


def audit_rows(db_session, entity_id=None):
    query = select(AuditLog).where(AuditLog.entity_type == "user").order_by(AuditLog.id)
    if entity_id is not None:
        query = query.where(AuditLog.entity_id == entity_id)
    return list(db_session.scalars(query))


# ------------------------------------------------------------------ access


def test_requests_without_a_token_get_401(client, users):
    assert client.get("/users").status_code == 401
    assert client.post("/users", json=NEW_USER).status_code == 401
    assert client.patch(f"/users/{users['admin'].id}", json={}).status_code == 401


@pytest.mark.parametrize("name", ["operations", "engineer1", "manager"])
def test_only_admin_can_list_create_and_edit(client, users, name):
    actor = users[name]
    target = users["engineer2"]
    assert client.get("/users", headers=auth_headers(actor)).status_code == 403
    assert post(client, actor).status_code == 403
    assert patch(client, actor, target, {"first_name": "X"}).status_code == 403


def test_there_is_no_delete(client, users):
    response = client.delete(f"/users/{users['engineer1'].id}", headers=auth_headers(users["admin"]))
    assert response.status_code == 405


# ------------------------------------------------------------------ list


def test_admin_lists_all_users_including_inactive_with_manager_name(
    client, db_session, make_user, users
):
    inactive = make_user(email="gone@srct.local", is_active=False)
    inactive.manager_id = users["manager"].id
    db_session.flush()

    response = client.get("/users", headers=auth_headers(users["admin"]))

    assert response.status_code == 200
    by_email = {item["email"]: item for item in response.json()}
    assert "gone@srct.local" in by_email
    assert by_email["gone@srct.local"]["is_active"] is False
    assert by_email["gone@srct.local"]["manager_name"] == users["manager"].full_name
    assert by_email["admin@srct.local"]["manager_name"] is None
    assert all("password" not in key for item in response.json() for key in item)


def test_picker_list_still_returns_only_id_name_email_for_admin(client, users):
    response = client.get("/users", params={"role": "engineer"}, headers=auth_headers(users["admin"]))

    assert response.status_code == 200
    assert all(set(item) == {"id", "full_name", "email"} for item in response.json())


# ------------------------------------------------------------------ create


def test_create_hashes_password_and_never_returns_it(client, db_session, users):
    response = post(client, users["admin"])

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "nora@srct.local"
    assert body["role"] == "engineer"
    assert body["is_active"] is True
    assert "password" not in body and "password_hash" not in body
    assert "initial-pass-1" not in response.text

    stored = db_session.scalar(select(User).where(User.email == "nora@srct.local"))
    assert stored.password_hash != "initial-pass-1"
    assert verify_password("initial-pass-1", stored.password_hash)


def test_new_user_can_log_in(client, users):
    post(client, users["admin"])

    response = client.post(
        "/auth/login", data={"username": "nora@srct.local", "password": "initial-pass-1"}
    )

    assert response.status_code == 200


def test_duplicate_email_is_409_on_the_email_field(client, users):
    body = {**NEW_USER, "email": "Manager@SRCT.local"}  # case differs from the seeded user

    response = post(client, users["admin"], body)

    assert response.status_code == 409
    assert response.json()["detail"][0]["loc"] == ["body", "email"]


@pytest.mark.parametrize(
    "override",
    [
        {"password": "short"},
        {"password": "x" * 73},
        {"role": "superuser"},
        {"email": "not-an-email"},
        {"first_name": "  "},
        {"is_active": False},  # unknown field
    ],
)
def test_invalid_create_is_422(client, users, override):
    assert post(client, users["admin"], {**NEW_USER, **override}).status_code == 422


def test_create_with_manager(client, users):
    response = post(client, users["admin"], {**NEW_USER, "manager_id": users["manager"].id})

    assert response.status_code == 201
    assert response.json()["manager_name"] == users["manager"].full_name


@pytest.mark.parametrize("manager_id", [999999, "inactive"])
def test_create_rejects_missing_or_inactive_manager(client, make_user, users, manager_id):
    if manager_id == "inactive":
        manager_id = make_user(email="off@srct.local", role=UserRole.MANAGER, is_active=False).id

    response = post(client, users["admin"], {**NEW_USER, "manager_id": manager_id})

    assert response.status_code == 400
    assert response.json()["detail"][0]["loc"] == ["body", "manager_id"]


# ------------------------------------------------------------------ audit


def test_create_writes_an_audit_row_without_password_data(client, db_session, users):
    created = post(client, users["admin"]).json()

    (row,) = audit_rows(db_session, created["id"])

    assert row.action == "create"
    assert row.user_id == users["admin"].id
    assert row.new_values["email"] == "nora@srct.local"
    dumped = str(row.new_values) + str(row.old_values)
    assert "password" not in dumped
    assert "initial-pass-1" not in dumped
    assert "$2b$" not in dumped


def test_update_writes_old_and_new_values_without_password_data(client, db_session, users):
    target = users["engineer1"]

    response = patch(client, users["admin"], target, {"first_name": "Renamed", "manager_id": users["manager"].id})

    assert response.status_code == 200
    (row,) = audit_rows(db_session, target.id)
    assert row.action == "update"
    assert row.old_values["first_name"] != "Renamed"
    assert row.new_values["first_name"] == "Renamed"
    assert row.new_values["manager_id"] == users["manager"].id
    assert "password" not in str(row.old_values) + str(row.new_values)


def test_update_with_no_change_writes_no_audit_row(client, db_session, users):
    target = users["engineer1"]

    response = patch(client, users["admin"], target, {"first_name": target.first_name})

    assert response.status_code == 200
    assert audit_rows(db_session, target.id) == []


def test_row_values_excludes_the_password_hash_for_any_caller(db_session, users):
    # Not through the Users endpoints: any code that audits a User gets the same protection.
    values = row_values(users["admin"])
    entry = log_action(
        db_session, None, AuditAction.UPDATE, AuditEntity.USER, users["admin"].id, new_values=values
    )

    assert "password_hash" not in values
    assert users["admin"].password_hash not in str(entry.new_values)
    assert values["email"] == "admin@srct.local"


# ------------------------------------------------------------------ role is fixed


@pytest.mark.parametrize("body", [{"role": "admin"}, {"email": "x@y.zz"}, {"password": "new-password-1"}])
def test_patch_cannot_change_role_email_or_password(client, db_session, users, body):
    target = users["engineer1"]
    before = (target.role, target.email, target.password_hash)

    response = patch(client, users["admin"], target, body)

    assert response.status_code == 422
    db_session.refresh(target)
    assert (target.role, target.email, target.password_hash) == before


@pytest.mark.parametrize("body", [{"first_name": None}, {"is_active": None}])
def test_patch_rejects_explicit_nulls(client, users, body):
    assert patch(client, users["admin"], users["engineer1"], body).status_code == 422


# ------------------------------------------------------------------ safety rules


def test_admin_cannot_deactivate_themselves(client, db_session, users):
    response = patch(client, users["admin"], users["admin"], {"is_active": False})

    assert response.status_code == 409
    assert response.json()["detail"][0]["loc"] == ["body", "is_active"]
    db_session.refresh(users["admin"])
    assert users["admin"].is_active is True


def test_another_admin_can_be_deactivated_while_one_remains(client, make_user, db_session, users):
    second = make_user(email="admin2@srct.local", role=UserRole.ADMIN)

    response = patch(client, users["admin"], second, {"is_active": False})

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_last_active_admin_cannot_be_deactivated(db_session, make_user, users):
    # Over HTTP an admin can only target someone else, so another admin always remains. The
    # rule guards the race of two admins deactivating each other, so it is tested on the
    # service with an actor who is not an admin of record.
    outsider = users["manager"]

    with pytest.raises(LastActiveAdmin):
        update_user(db_session, outsider, users["admin"].id, UserUpdate(is_active=False))

    db_session.refresh(users["admin"])
    assert users["admin"].is_active is True


def test_inactive_admins_do_not_count_as_remaining(db_session, make_user, users):
    make_user(email="old-admin@srct.local", role=UserRole.ADMIN, is_active=False)

    with pytest.raises(LastActiveAdmin):
        update_user(db_session, users["manager"], users["admin"].id, UserUpdate(is_active=False))


@pytest.mark.parametrize("manager_id", [999999, "inactive", "self"])
def test_update_validates_manager_id(client, make_user, users, manager_id):
    target = users["engineer1"]
    if manager_id == "inactive":
        manager_id = make_user(email="off@srct.local", role=UserRole.MANAGER, is_active=False).id
    elif manager_id == "self":
        manager_id = target.id

    response = patch(client, users["admin"], target, {"manager_id": manager_id})

    assert response.status_code == 400
    assert response.json()["detail"][0]["loc"] == ["body", "manager_id"]


def test_manager_id_null_clears_the_manager(client, db_session, users):
    target = users["engineer1"]
    patch(client, users["admin"], target, {"manager_id": users["manager"].id})

    response = patch(client, users["admin"], target, {"manager_id": None})

    assert response.status_code == 200
    assert response.json()["manager_id"] is None
    assert response.json()["manager_name"] is None


def test_unknown_user_is_404(client, users):
    response = client.patch("/users/999999", json={"first_name": "X"}, headers=auth_headers(users["admin"]))

    assert response.status_code == 404


def test_update_user_service_raises_not_found(db_session, users):
    with pytest.raises(UserNotFound):
        update_user(db_session, users["admin"], 999999, UserUpdate(first_name="X"))


# ------------------------------------------------------------------ deactivation


def test_deactivated_user_cannot_log_in_or_use_an_old_token(client, make_user, users):
    # The correct password, so the 401 can only come from the user being deactivated.
    target = make_user(email="leaving@srct.local", password="correct-password")
    credentials = {"username": target.email, "password": "correct-password"}
    old_headers = auth_headers(target)
    assert client.post("/auth/login", data=credentials).status_code == 200
    assert client.get("/auth/me", headers=old_headers).status_code == 200

    assert patch(client, users["admin"], target, {"is_active": False}).status_code == 200

    assert client.post("/auth/login", data=credentials).status_code == 401
    assert client.get("/auth/me", headers=old_headers).status_code == 401


def test_deactivated_user_keeps_their_working_data(client, db_session, make_sr, users):
    sr = make_sr("engineer1", SRStatus.ASSIGNED)

    patch(client, users["admin"], users["engineer1"], {"is_active": False})

    db_session.refresh(sr)
    assert sr.assigned_engineer_id == users["engineer1"].id
    assert db_session.get(User, users["engineer1"].id) is not None


def test_reactivated_user_can_log_in_again(client, db_session, make_user, users):
    user = make_user(email="back@srct.local", password="correct-password", is_active=False)
    assert client.post("/auth/login", data={"username": user.email, "password": "correct-password"}).status_code == 401

    patch(client, users["admin"], user, {"is_active": True})

    assert client.post("/auth/login", data={"username": user.email, "password": "correct-password"}).status_code == 200


# ------------------------------------------------------------------ engineers with open work


def test_engineer_with_requests_in_progress_cannot_be_deactivated(client, db_session, make_sr, users):
    make_sr("engineer1", SRStatus.IN_PROGRESS)
    make_sr("engineer1", SRStatus.IN_PROGRESS)
    make_sr("engineer1", SRStatus.ASSIGNED)  # does not count

    response = patch(client, users["admin"], users["engineer1"], {"is_active": False})

    assert response.status_code == 409
    (issue,) = response.json()["detail"]
    assert issue["loc"] == ["body", "is_active"]
    assert issue["msg"] == "This engineer has 2 requests in progress. They must be resolved first."
    db_session.refresh(users["engineer1"])
    assert users["engineer1"].is_active is True
    assert audit_rows(db_session, users["engineer1"].id) == []


def test_message_uses_singular_for_one_request(client, make_sr, users):
    make_sr("engineer1", SRStatus.IN_PROGRESS)

    response = patch(client, users["admin"], users["engineer1"], {"is_active": False})

    assert response.json()["detail"][0]["msg"] == (
        "This engineer has 1 request in progress. They must be resolved first."
    )


@pytest.mark.parametrize("status", [SRStatus.ASSIGNED, SRStatus.RESOLVED, SRStatus.CLOSED])
def test_engineer_with_only_non_blocking_requests_can_be_deactivated(
    client, make_sr, users, status
):
    make_sr("engineer1", status)

    response = patch(client, users["admin"], users["engineer1"], {"is_active": False})

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_engineer_with_no_requests_can_be_deactivated(client, users):
    assert patch(client, users["admin"], users["engineer2"], {"is_active": False}).status_code == 200


def test_other_engineers_requests_do_not_block(client, make_sr, users):
    make_sr("engineer1", SRStatus.IN_PROGRESS)

    assert patch(client, users["admin"], users["engineer2"], {"is_active": False}).status_code == 200


@pytest.mark.parametrize("name", ["manager", "operations"])
def test_manager_and_operations_are_not_blocked(client, make_sr, users, name):
    make_sr("engineer1", SRStatus.IN_PROGRESS)  # unrelated open work exists

    response = patch(client, users["admin"], users[name], {"is_active": False})

    assert response.status_code == 200


def test_editing_a_blocked_engineer_without_deactivating_still_works(client, make_sr, users):
    make_sr("engineer1", SRStatus.IN_PROGRESS)

    response = patch(client, users["admin"], users["engineer1"], {"first_name": "Renamed"})

    assert response.status_code == 200
