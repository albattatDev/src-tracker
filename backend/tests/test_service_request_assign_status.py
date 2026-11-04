import httpx
import pytest
from fastapi.testclient import TestClient

from app.models import AuditLog, Priority, ServiceRequest, SRStatus, User, UserRole
from tests.helpers import auth_headers


def patch_as(client: TestClient, user: User, path: str, body: dict) -> httpx.Response:
    return client.patch(path, json=body, headers=auth_headers(user))


def assign_as(client, user, request_id, engineer_id) -> httpx.Response:
    return patch_as(
        client,
        user,
        f"/service-requests/{request_id}/assign",
        {"assigned_engineer_id": engineer_id},
    )


def status_as(client, user, request_id, new_status) -> httpx.Response:
    return patch_as(client, user, f"/service-requests/{request_id}/status", {"status": new_status})


@pytest.fixture
def make_request(db_session, users):
    """Builds a request made by operations, in the given status, for the given engineer."""

    def _make(status: SRStatus = SRStatus.OPEN, engineer: User | None = None) -> ServiceRequest:
        request = ServiceRequest(
            title="Broken AC",
            description="Room 4 is hot",
            priority=Priority.HIGH,
            status=status,
            requester_id=users["operations"].id,
            assigned_engineer_id=None if engineer is None else engineer.id,
        )
        db_session.add(request)
        # Commit, not just flush: when the service rolls back a refused change, a row that
        # was only flushed would be undone too. (In tests a commit is only a savepoint.)
        db_session.commit()
        return request

    return _make


def audit_rows(db_session, request_id) -> list[AuditLog]:
    return (
        db_session.query(AuditLog)
        .filter(AuditLog.entity_type == "service_request", AuditLog.entity_id == request_id)
        .order_by(AuditLog.id)
        .all()
    )


# --- PATCH /service-requests/{id}/assign ---


def test_manager_assigns_an_open_request(client, db_session, users, make_request):
    request = make_request()

    response = assign_as(client, users["manager"], request.id, users["engineer1"].id)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "assigned"
    assert body["assigned_engineer_name"] == users["engineer1"].full_name
    db_session.refresh(request)
    assert request.assigned_engineer_id == users["engineer1"].id


def test_reassigning_changes_only_the_engineer(client, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    response = assign_as(client, users["manager"], request.id, users["engineer2"].id)

    assert response.status_code == 200
    assert response.json()["status"] == "assigned"
    assert response.json()["assigned_engineer_name"] == users["engineer2"].full_name


@pytest.mark.parametrize("status", [SRStatus.IN_PROGRESS, SRStatus.RESOLVED, SRStatus.CLOSED])
def test_cannot_assign_once_work_has_started(client, db_session, users, make_request, status):
    request = make_request(status, users["engineer1"])

    response = assign_as(client, users["manager"], request.id, users["engineer2"].id)

    assert response.status_code == 400
    assert "open or assigned" in response.json()["detail"]
    db_session.refresh(request)
    assert request.assigned_engineer_id == users["engineer1"].id
    assert audit_rows(db_session, request.id) == []


@pytest.mark.parametrize("name", ["operations", "engineer1", "admin"])
def test_only_a_manager_can_assign(client, db_session, users, make_request, name):
    request = make_request()

    response = assign_as(client, users[name], request.id, users["engineer1"].id)

    assert response.status_code == 403
    db_session.refresh(request)
    assert request.status == SRStatus.OPEN


@pytest.mark.parametrize("target", ["operations", "manager", "admin"])
def test_cannot_assign_to_a_non_engineer(client, users, make_request, target):
    request = make_request()

    response = assign_as(client, users["manager"], request.id, users[target].id)

    assert response.status_code == 400
    assert response.json() == {"detail": "assigned_engineer_id must be an active engineer"}


def test_cannot_assign_to_an_inactive_engineer(client, make_user, users, make_request):
    inactive = make_user(email="gone@srct.local", role=UserRole.ENGINEER, is_active=False)
    request = make_request()

    response = assign_as(client, users["manager"], request.id, inactive.id)

    assert response.status_code == 400


def test_cannot_assign_to_a_missing_user(client, users, make_request):
    request = make_request()

    response = assign_as(client, users["manager"], request.id, 999999)

    assert response.status_code == 400


def test_assign_unknown_request_is_404(client, users):
    response = assign_as(client, users["manager"], 999999, users["engineer1"].id)

    assert response.status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {"assigned_engineer_id": 1, "status": "closed"},
        {},
        {"assigned_engineer_id": "abc"},
    ],
)
def test_assign_body_is_validated(client, users, make_request, body):
    request = make_request()

    response = patch_as(client, users["manager"], f"/service-requests/{request.id}/assign", body)

    assert response.status_code == 422


def test_assign_writes_an_audit_row(client, db_session, users, make_request):
    request = make_request()

    assign_as(client, users["manager"], request.id, users["engineer1"].id)

    (row,) = audit_rows(db_session, request.id)
    assert row.user_id == users["manager"].id
    assert row.action == "assign"
    assert row.old_values == {
        "title": "Broken AC",
        "description": "Room 4 is hot",
        "priority": "high",
        "status": "open",
        "requester_id": users["operations"].id,
        "assigned_engineer_id": None,
    }
    assert row.new_values == {
        **row.old_values,
        "status": "assigned",
        "assigned_engineer_id": users["engineer1"].id,
    }


def test_reassign_audit_row_shows_both_engineers(client, db_session, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    assign_as(client, users["manager"], request.id, users["engineer2"].id)

    (row,) = audit_rows(db_session, request.id)
    assert row.old_values["assigned_engineer_id"] == users["engineer1"].id
    assert row.new_values["assigned_engineer_id"] == users["engineer2"].id
    assert row.old_values["status"] == row.new_values["status"] == "assigned"


def test_nothing_is_saved_if_the_assign_audit_write_fails(
    client, db_session, users, make_request, monkeypatch
):
    request = make_request()

    def broken_log_action(*args, **kwargs):
        raise RuntimeError("audit table is down")

    monkeypatch.setattr("app.services.service_requests.log_action", broken_log_action)
    failing_client = TestClient(client.app, raise_server_exceptions=False)

    response = assign_as(failing_client, users["manager"], request.id, users["engineer1"].id)

    assert response.status_code == 500
    db_session.refresh(request)
    assert request.status == SRStatus.OPEN
    assert request.assigned_engineer_id is None


# --- PATCH /service-requests/{id}/status ---


def test_full_lifecycle(client, users, make_request):
    request = make_request()
    manager, engineer = users["manager"], users["engineer1"]

    assert assign_as(client, manager, request.id, engineer.id).json()["status"] == "assigned"
    assert status_as(client, engineer, request.id, "in_progress").json()["status"] == "in_progress"
    assert status_as(client, engineer, request.id, "resolved").json()["status"] == "resolved"
    assert status_as(client, manager, request.id, "closed").json()["status"] == "closed"


@pytest.mark.parametrize(
    "start, new",
    [(SRStatus.ASSIGNED, "in_progress"), (SRStatus.IN_PROGRESS, "resolved")],
)
def test_engineer_moves_their_own_request(client, users, make_request, start, new):
    request = make_request(start, users["engineer1"])

    response = status_as(client, users["engineer1"], request.id, new)

    assert response.status_code == 200
    assert response.json()["status"] == new


@pytest.mark.parametrize(
    "start, new",
    [
        (SRStatus.ASSIGNED, "in_progress"),
        (SRStatus.IN_PROGRESS, "resolved"),
        (SRStatus.RESOLVED, "closed"),
    ],
)
def test_manager_can_make_every_valid_move(client, users, make_request, start, new):
    request = make_request(start, users["engineer1"])

    response = status_as(client, users["manager"], request.id, new)

    assert response.status_code == 200
    assert response.json()["status"] == new


@pytest.mark.parametrize(
    "start, new",
    [
        (SRStatus.OPEN, "closed"),
        (SRStatus.OPEN, "in_progress"),
        (SRStatus.CLOSED, "open"),
        (SRStatus.ASSIGNED, "resolved"),
        (SRStatus.RESOLVED, "in_progress"),
        (SRStatus.CLOSED, "closed"),
    ],
)
def test_invalid_transitions_give_400(client, db_session, users, make_request, start, new):
    request = make_request(start, users["engineer1"])

    response = status_as(client, users["manager"], request.id, new)

    assert response.status_code == 400
    assert f"'{start.value}' to '{new}'" in response.json()["detail"]
    db_session.refresh(request)
    assert request.status == start
    assert audit_rows(db_session, request.id) == []


def test_status_endpoint_cannot_assign(client, db_session, users, make_request):
    request = make_request()

    response = status_as(client, users["manager"], request.id, "assigned")

    assert response.status_code == 400
    assert "assign" in response.json()["detail"]
    db_session.refresh(request)
    assert request.status == SRStatus.OPEN


def test_engineer_cannot_close(client, db_session, users, make_request):
    request = make_request(SRStatus.RESOLVED, users["engineer1"])

    response = status_as(client, users["engineer1"], request.id, "closed")

    assert response.status_code == 403
    db_session.refresh(request)
    assert request.status == SRStatus.RESOLVED


def test_engineer_on_someone_elses_request_gets_404(client, db_session, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    response = status_as(client, users["engineer2"], request.id, "in_progress")

    assert response.status_code == 404
    assert response.json() == {"detail": "Service request not found"}
    db_session.refresh(request)
    assert request.status == SRStatus.ASSIGNED


def test_engineer_hidden_request_and_missing_request_look_the_same(client, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    hidden = status_as(client, users["engineer2"], request.id, "in_progress")
    missing = status_as(client, users["engineer2"], 999999, "in_progress")

    assert hidden.status_code == missing.status_code == 404
    assert hidden.json() == missing.json()


@pytest.mark.parametrize("name", ["operations", "admin"])
def test_operations_and_admin_cannot_change_status(client, db_session, users, make_request, name):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    response = status_as(client, users[name], request.id, "in_progress")

    assert response.status_code == 403
    db_session.refresh(request)
    assert request.status == SRStatus.ASSIGNED


def test_unknown_status_value_is_422(client, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    response = status_as(client, users["manager"], request.id, "finished")

    assert response.status_code == 422


def test_status_body_rejects_extra_fields(client, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    response = patch_as(
        client,
        users["manager"],
        f"/service-requests/{request.id}/status",
        {"status": "in_progress", "assigned_engineer_id": users["engineer2"].id},
    )

    assert response.status_code == 422


def test_status_change_writes_an_audit_row(client, db_session, users, make_request):
    request = make_request(SRStatus.ASSIGNED, users["engineer1"])

    status_as(client, users["engineer1"], request.id, "in_progress")

    (row,) = audit_rows(db_session, request.id)
    assert row.user_id == users["engineer1"].id
    assert row.action == "update"
    assert row.old_values == {
        "title": "Broken AC",
        "description": "Room 4 is hot",
        "priority": "high",
        "status": "assigned",
        "requester_id": users["operations"].id,
        "assigned_engineer_id": users["engineer1"].id,
    }
    assert row.new_values == {**row.old_values, "status": "in_progress"}


def test_lifecycle_writes_one_audit_row_per_step(client, db_session, users, make_request):
    request = make_request()
    manager, engineer = users["manager"], users["engineer1"]

    assign_as(client, manager, request.id, engineer.id)
    status_as(client, engineer, request.id, "in_progress")
    status_as(client, engineer, request.id, "resolved")
    status_as(client, manager, request.id, "closed")

    rows = audit_rows(db_session, request.id)
    assert [row.action for row in rows] == ["assign", "update", "update", "update"]
    assert [row.new_values["status"] for row in rows] == [
        "assigned",
        "in_progress",
        "resolved",
        "closed",
    ]


def test_status_requires_a_token(client, users, make_request):
    request = make_request()

    assert client.patch(f"/service-requests/{request.id}/status", json={"status": "x"}).status_code == 401
    assert client.patch(f"/service-requests/{request.id}/assign", json={}).status_code == 401


# --- assigned_engineer_id in every SRRead response ---


def test_assign_response_carries_the_engineer_id(client, users, make_request):
    request = make_request()

    body = assign_as(client, users["manager"], request.id, users["engineer1"].id).json()

    assert body["assigned_engineer_id"] == users["engineer1"].id


def test_detail_and_list_carry_the_engineer_id_or_null(client, users, make_request):
    assigned = make_request(SRStatus.ASSIGNED, users["engineer2"])
    unassigned = make_request()
    headers = auth_headers(users["manager"])

    detail = client.get(f"/service-requests/{assigned.id}", headers=headers).json()
    detail_open = client.get(f"/service-requests/{unassigned.id}", headers=headers).json()
    listing = client.get("/service-requests", headers=headers).json()["items"]
    by_id = {item["id"]: item for item in listing}

    assert detail["assigned_engineer_id"] == users["engineer2"].id
    assert detail["assigned_engineer_name"] == users["engineer2"].full_name
    assert detail_open["assigned_engineer_id"] is None
    assert by_id[assigned.id]["assigned_engineer_id"] == users["engineer2"].id
    assert by_id[unassigned.id]["assigned_engineer_id"] is None
