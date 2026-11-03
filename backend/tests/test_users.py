import pytest

from app.models import UserRole
from tests.helpers import auth_headers


def list_engineers_as(client, user):
    return client.get("/users", params={"role": "engineer"}, headers=auth_headers(user))


@pytest.mark.parametrize("name", ["manager", "admin"])
def test_manager_and_admin_can_list_engineers(client, users, name):
    response = list_engineers_as(client, users[name])

    assert response.status_code == 200
    assert [item["email"] for item in response.json()] == [
        "engineer1@srct.local",
        "engineer2@srct.local",
    ]


def test_each_item_has_only_id_full_name_and_email(client, users):
    (first, _) = list_engineers_as(client, users["manager"]).json()

    assert first == {
        "id": users["engineer1"].id,
        "full_name": users["engineer1"].full_name,
        "email": "engineer1@srct.local",
    }


def test_only_active_engineers_are_returned(client, make_user, users):
    make_user(email="gone@srct.local", role=UserRole.ENGINEER, is_active=False)

    emails = [item["email"] for item in list_engineers_as(client, users["manager"]).json()]

    assert "gone@srct.local" not in emails
    assert "manager@srct.local" not in emails
    assert "operations@srct.local" not in emails


def test_engineers_are_sorted_by_name(client, db_session, make_user, users):
    # Seed names: Fahad Alharbi, Saad Alotaibi. "Aaron" must come first, "Zed" last.
    first = make_user(email="aaron@srct.local", role=UserRole.ENGINEER)
    first.first_name = "Aaron"
    last = make_user(email="zed@srct.local", role=UserRole.ENGINEER)
    last.first_name = "Zed"
    db_session.flush()

    names = [item["full_name"] for item in list_engineers_as(client, users["manager"]).json()]

    assert names == sorted(names)
    assert names[0].startswith("Aaron")
    assert names[-1].startswith("Zed")


@pytest.mark.parametrize("name", ["operations", "engineer1"])
def test_operations_and_engineer_get_403(client, users, name):
    assert list_engineers_as(client, users[name]).status_code == 403


@pytest.mark.parametrize("role", ["manager", "admin", "operations", "nonsense"])
def test_other_roles_are_not_listable(client, users, role):
    response = client.get("/users", params={"role": role}, headers=auth_headers(users["admin"]))

    assert response.status_code == 422


def test_role_is_required(client, users):
    assert client.get("/users", headers=auth_headers(users["manager"])).status_code == 422


def test_users_requires_a_token(client):
    assert client.get("/users", params={"role": "engineer"}).status_code == 401
