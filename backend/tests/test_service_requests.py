from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import Priority, ServiceRequest, SRStatus, User
from app.seed import seed_users
from app.services.service_requests import list_requests


def get_user(db_session: Session, email: str) -> User:
    return db_session.query(User).filter(User.email == email).one()


def list_as(client: TestClient, user: User) -> list[dict]:
    response = client.get(
        "/service-requests",
        headers={"Authorization": f"Bearer {create_access_token(user)}"},
    )
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def sample_requests(db_session: Session) -> dict[str, ServiceRequest]:
    """A: operations, unassigned. B: operations, engineer1. C: manager, engineer2."""
    seed_users(db_session)
    operations = get_user(db_session, "operations@srct.local")
    manager = get_user(db_session, "manager@srct.local")
    engineer1 = get_user(db_session, "engineer1@srct.local")
    engineer2 = get_user(db_session, "engineer2@srct.local")

    rows = {
        "A": ServiceRequest(
            title="Request A",
            description="Unassigned",
            priority=Priority.LOW,
            requester_id=operations.id,
        ),
        "B": ServiceRequest(
            title="Request B",
            description="Assigned to engineer1",
            priority=Priority.HIGH,
            status=SRStatus.ASSIGNED,
            requester_id=operations.id,
            assigned_engineer_id=engineer1.id,
        ),
        "C": ServiceRequest(
            title="Request C",
            description="Assigned to engineer2",
            priority=Priority.MEDIUM,
            status=SRStatus.ASSIGNED,
            requester_id=manager.id,
            assigned_engineer_id=engineer2.id,
        ),
    }
    db_session.add_all(rows.values())
    db_session.flush()
    # Reload so the timestamps are what MySQL stored (it rounds to whole seconds).
    for row in rows.values():
        db_session.refresh(row)
    return rows


def ids(items: list[dict]) -> set[int]:
    return {item["id"] for item in items}


def test_operations_sees_only_own_requests(client, db_session, sample_requests):
    items = list_as(client, get_user(db_session, "operations@srct.local"))

    assert ids(items) == {sample_requests["A"].id, sample_requests["B"].id}


def test_engineer_sees_only_assigned_requests(client, db_session, sample_requests):
    items = list_as(client, get_user(db_session, "engineer1@srct.local"))

    assert ids(items) == {sample_requests["B"].id}


@pytest.mark.parametrize("email", ["manager@srct.local", "admin@srct.local"])
def test_manager_and_admin_see_all_requests(client, db_session, sample_requests, email):
    items = list_as(client, get_user(db_session, email))

    assert ids(items) == {request.id for request in sample_requests.values()}


def test_unknown_role_raises_instead_of_seeing_all(db_session, sample_requests):
    stranger = SimpleNamespace(id=1, role="auditor")

    with pytest.raises(ValueError):
        list_requests(db_session, stranger)


def test_item_has_joined_names_and_exact_fields(client, db_session, sample_requests):
    items = list_as(client, get_user(db_session, "manager@srct.local"))
    item = next(item for item in items if item["id"] == sample_requests["B"].id)

    assert item == {
        "id": sample_requests["B"].id,
        "title": "Request B",
        "description": "Assigned to engineer1",
        "priority": "high",
        "status": "assigned",
        "requester_name": "Noura Alshehri",
        "assigned_engineer_name": "Fahad Alharbi",
        "created_at": sample_requests["B"].created_at.isoformat(),
        "updated_at": sample_requests["B"].updated_at.isoformat(),
    }


def test_unassigned_request_has_null_engineer_name(client, db_session, sample_requests):
    items = list_as(client, get_user(db_session, "manager@srct.local"))
    item = next(item for item in items if item["id"] == sample_requests["A"].id)

    assert item["assigned_engineer_name"] is None


def test_list_without_token_returns_401(client):
    assert client.get("/service-requests").status_code == 401
