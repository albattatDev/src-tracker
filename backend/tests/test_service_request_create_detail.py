import httpx
import pytest
from fastapi.testclient import TestClient

from app.models import AuditLog, Priority, ServiceRequest, SRStatus, User, UserRole
from tests.helpers import auth_headers

VALID_BODY = {"title": "Broken AC", "description": "Room 4 is hot", "priority": "high"}


def post_as(client: TestClient, user: User, body: dict) -> httpx.Response:
    return client.post("/service-requests", json=body, headers=auth_headers(user))


def get_one_as(client: TestClient, user: User, request_id: int) -> httpx.Response:
    return client.get(f"/service-requests/{request_id}", headers=auth_headers(user))


# --- POST /service-requests ---


@pytest.mark.parametrize("name", ["operations", "manager"])
def test_operations_and_manager_can_create(client, users, name):
    user = users[name]

    response = post_as(client, user, VALID_BODY)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Broken AC"
    assert body["description"] == "Room 4 is hot"
    assert body["priority"] == "high"
    assert body["status"] == "open"
    assert body["requester_name"] == user.full_name
    assert body["assigned_engineer_name"] is None


def test_requester_is_saved_from_the_token(client, db_session, users):
    response = post_as(client, users["operations"], VALID_BODY)

    saved = db_session.get(ServiceRequest, response.json()["id"])
    assert saved.requester_id == users["operations"].id
    assert saved.status == SRStatus.OPEN


@pytest.mark.parametrize("name", ["engineer1", "admin"])
def test_engineer_and_admin_cannot_create(client, db_session, users, name):
    response = post_as(client, users[name], VALID_BODY)

    assert response.status_code == 403
    assert db_session.query(ServiceRequest).count() == 0


@pytest.mark.parametrize(
    "extra", [{"requester_id": 1}, {"status": "closed"}, {"assigned_engineer_id": 2}]
)
def test_extra_fields_are_rejected(client, users, extra):
    response = post_as(client, users["operations"], {**VALID_BODY, **extra})

    assert response.status_code == 422


@pytest.mark.parametrize("title", ["", "   ", "x" * 201])
def test_bad_title_is_rejected(client, users, title):
    response = post_as(client, users["operations"], {**VALID_BODY, "title": title})

    assert response.status_code == 422


def test_title_of_200_characters_is_accepted(client, users):
    response = post_as(client, users["operations"], {**VALID_BODY, "title": "x" * 200})

    assert response.status_code == 201


@pytest.mark.parametrize("description", ["", "   "])
def test_empty_description_is_rejected(client, users, description):
    response = post_as(client, users["operations"], {**VALID_BODY, "description": description})

    assert response.status_code == 422


def test_bad_priority_is_rejected(client, users):
    response = post_as(client, users["operations"], {**VALID_BODY, "priority": "urgent"})

    assert response.status_code == 422


def test_title_and_description_are_trimmed(client, users):
    body = {**VALID_BODY, "title": "  Leak  ", "description": "\n Pipe \t"}

    response = post_as(client, users["operations"], body)

    assert response.json()["title"] == "Leak"
    assert response.json()["description"] == "Pipe"


def test_create_writes_an_audit_row(client, db_session, users):
    response = post_as(client, users["manager"], VALID_BODY)
    created_id = response.json()["id"]

    row = db_session.query(AuditLog).filter(AuditLog.entity_id == created_id).one()
    assert row.user_id == users["manager"].id
    assert row.action == "create"
    assert row.entity_type == "service_request"
    assert row.old_values is None
    assert row.new_values == {
        "title": "Broken AC",
        "description": "Room 4 is hot",
        "priority": "high",
        "status": "open",
        "requester_id": users["manager"].id,
        "assigned_engineer_id": None,
    }


def test_nothing_is_saved_if_the_audit_write_fails(client, db_session, users, monkeypatch):
    def broken_log_action(*args, **kwargs):
        raise RuntimeError("audit table is down")

    monkeypatch.setattr("app.services.service_requests.log_action", broken_log_action)
    # The default TestClient re-raises server errors; this one returns the 500 instead.
    failing_client = TestClient(client.app, raise_server_exceptions=False)

    response = post_as(failing_client, users["operations"], VALID_BODY)

    assert response.status_code == 500
    assert "audit table" not in response.text
    assert db_session.query(ServiceRequest).count() == 0
    assert db_session.query(AuditLog).count() == 0


def test_create_does_not_leak_past_the_test_transaction(engine, client, users):
    """A real commit would be visible to a second, independent connection."""
    post_as(client, users["operations"], VALID_BODY)

    with engine.connect() as other_connection:
        requests = other_connection.exec_driver_sql("SELECT COUNT(*) FROM service_requests").scalar()
        audits = other_connection.exec_driver_sql("SELECT COUNT(*) FROM audit_log").scalar()
    assert (requests, audits) == (0, 0)


# --- GET /service-requests/{id} ---


@pytest.fixture
def assigned_request(db_session, users) -> ServiceRequest:
    """Made by operations, assigned to engineer1."""
    request = ServiceRequest(
        title="Assigned one",
        description="Fix it",
        priority=Priority.MEDIUM,
        status=SRStatus.ASSIGNED,
        requester_id=users["operations"].id,
        assigned_engineer_id=users["engineer1"].id,
    )
    db_session.add(request)
    db_session.flush()
    return request


@pytest.mark.parametrize("name", ["operations", "manager", "admin", "engineer1"])
def test_visible_users_can_open_a_request(client, users, assigned_request, name):
    response = get_one_as(client, users[name], assigned_request.id)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == assigned_request.id
    assert body["requester_name"] == users["operations"].full_name
    assert body["assigned_engineer_name"] == users["engineer1"].full_name


def test_another_operations_user_gets_404(client, make_user, users, assigned_request):
    other = make_user(email="other-ops@srct.local", role=UserRole.OPERATIONS)

    response = get_one_as(client, other, assigned_request.id)

    assert response.status_code == 404


def test_non_assigned_engineer_gets_404(client, users, assigned_request):
    response = get_one_as(client, users["engineer2"], assigned_request.id)

    assert response.status_code == 404


def test_unknown_id_gets_404(client, users):
    response = get_one_as(client, users["manager"], 999999)

    assert response.status_code == 404


def test_missing_and_hidden_requests_give_the_same_answer(client, users, assigned_request):
    hidden = get_one_as(client, users["engineer2"], assigned_request.id)
    missing = get_one_as(client, users["engineer2"], 999999)

    assert hidden.json() == missing.json() == {"detail": "Service request not found"}


def test_get_by_id_requires_a_token(client, assigned_request):
    assert client.get(f"/service-requests/{assigned_request.id}").status_code == 401
