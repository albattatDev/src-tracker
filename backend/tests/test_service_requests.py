from datetime import datetime
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Priority, ServiceRequest, SRStatus, User
from app.schemas.service_request import SRListParams
from app.seed import seed_users
from app.services.service_requests import list_requests
from tests.helpers import auth_headers, get_user


def get_as(client: TestClient, user: User, **params) -> httpx.Response:
    return client.get(
        "/service-requests",
        params=params,
        headers=auth_headers(user),
    )


def page_as(client: TestClient, user: User, **params) -> dict:
    response = get_as(client, user, **params)
    assert response.status_code == 200
    return response.json()


def list_as(client: TestClient, user: User, **params) -> list[dict]:
    return page_as(client, user, **params)["items"]


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
        list_requests(db_session, stranger, SRListParams())


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
        "assigned_engineer_id": sample_requests["B"].assigned_engineer_id,
        # Naive UTC from the database, sent as UTC with a trailing Z, to the second.
        "created_at": sample_requests["B"].created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updated_at": sample_requests["B"].updated_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def test_unassigned_request_has_null_engineer_name(client, db_session, sample_requests):
    items = list_as(client, get_user(db_session, "manager@srct.local"))
    item = next(item for item in items if item["id"] == sample_requests["A"].id)

    assert item["assigned_engineer_name"] is None
    assert item["assigned_engineer_id"] is None


def test_list_without_token_returns_401(client):
    assert client.get("/service-requests").status_code == 401


def test_status_filter(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, status="open")

    assert ids(items) == {sample_requests["A"].id}


def test_priority_filter(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, priority="high")

    assert ids(items) == {sample_requests["B"].id}


def test_assigned_engineer_filter(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")
    engineer2 = get_user(db_session, "engineer2@srct.local")

    items = list_as(client, manager, assigned_engineer_id=engineer2.id)

    assert ids(items) == {sample_requests["C"].id}


def test_created_from_filter(client, db_session, sample_requests):
    sample_requests["A"].created_at = datetime(2026, 3, 1, 12, 0)
    sample_requests["B"].created_at = datetime(2026, 3, 10, 12, 0)
    sample_requests["C"].created_at = datetime(2026, 3, 20, 12, 0)
    db_session.flush()
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, created_from="2026-03-10")

    assert ids(items) == {sample_requests["B"].id, sample_requests["C"].id}


def test_created_to_filter(client, db_session, sample_requests):
    sample_requests["A"].created_at = datetime(2026, 3, 1, 12, 0)
    sample_requests["B"].created_at = datetime(2026, 3, 10, 12, 0)
    sample_requests["C"].created_at = datetime(2026, 3, 20, 12, 0)
    db_session.flush()
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, created_to="2026-03-10")

    assert ids(items) == {sample_requests["A"].id, sample_requests["B"].id}


def test_operations_filtering_cannot_see_others_requests(client, db_session, sample_requests):
    operations = get_user(db_session, "operations@srct.local")
    engineer2 = get_user(db_session, "engineer2@srct.local")

    # Request C is assigned to engineer2, but operations did not create it.
    page = page_as(client, operations, assigned_engineer_id=engineer2.id)

    assert page["items"] == []
    assert page["total"] == 0


def test_engineer_assigned_engineer_id_is_ignored(client, db_session, sample_requests):
    engineer1 = get_user(db_session, "engineer1@srct.local")
    engineer2 = get_user(db_session, "engineer2@srct.local")

    items = list_as(client, engineer1, assigned_engineer_id=engineer2.id)

    assert ids(items) == {sample_requests["B"].id}


def test_sort_by_priority_desc_gives_high_first(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, sort="priority", order="desc")

    assert [item["priority"] for item in items] == ["high", "medium", "low"]


def test_sort_by_priority_asc_gives_low_first(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, sort="priority", order="asc")

    assert [item["priority"] for item in items] == ["low", "medium", "high"]


def test_equal_sort_values_are_ordered_by_id(client, db_session, sample_requests):
    for request in sample_requests.values():
        request.priority = Priority.MEDIUM
    db_session.flush()
    manager = get_user(db_session, "manager@srct.local")
    expected = sorted(request.id for request in sample_requests.values())

    ascending = list_as(client, manager, sort="priority", order="asc")
    descending = list_as(client, manager, sort="priority", order="desc")

    assert [item["id"] for item in ascending] == expected
    assert [item["id"] for item in descending] == expected[::-1]


def test_default_sort_is_newest_first(client, db_session, sample_requests):
    sample_requests["A"].created_at = datetime(2026, 3, 2, 12, 0)
    sample_requests["B"].created_at = datetime(2026, 3, 3, 12, 0)
    sample_requests["C"].created_at = datetime(2026, 3, 1, 12, 0)
    db_session.flush()
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager)

    assert [item["title"] for item in items] == ["Request B", "Request A", "Request C"]


def test_default_page_and_page_size(client, db_session, sample_requests):
    page = page_as(client, get_user(db_session, "manager@srct.local"))

    assert (page["total"], page["page"], page["page_size"]) == (3, 1, 20)


def test_total_counts_all_matches_not_just_this_page(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")

    first = page_as(client, manager, page=1, page_size=2, sort="priority", order="desc")
    second = page_as(client, manager, page=2, page_size=2, sort="priority", order="desc")

    assert (first["total"], first["page"], first["page_size"]) == (3, 1, 2)
    assert [item["priority"] for item in first["items"]] == ["high", "medium"]
    assert (second["total"], second["page"]) == (3, 2)
    assert [item["priority"] for item in second["items"]] == ["low"]


def test_total_respects_filters_and_visibility(client, db_session, sample_requests):
    operations = get_user(db_session, "operations@srct.local")

    page = page_as(client, operations, status="assigned")

    assert page["total"] == 1


@pytest.mark.parametrize("page_number", [2, 10**30])
def test_page_past_the_end_is_empty_not_an_error(
    client, db_session, sample_requests, page_number
):
    manager = get_user(db_session, "manager@srct.local")

    page = page_as(client, manager, page=page_number, page_size=20)

    assert page["items"] == []
    assert page["total"] == 3
    assert page["page"] == page_number


def test_created_from_after_created_to_returns_400(client, db_session, sample_requests):
    response = get_as(
        client,
        get_user(db_session, "manager@srct.local"),
        created_from="2026-03-11",
        created_to="2026-03-10",
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "created_from must not be after created_to"}


def test_same_created_from_and_created_to_is_allowed(client, db_session, sample_requests):
    manager = get_user(db_session, "manager@srct.local")

    response = get_as(client, manager, created_from="2026-03-10", created_to="2026-03-10")

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("params", "field"),
    [({"created_from": "0001-01-01"}, "created_from"), ({"created_to": "9999-12-31"}, "created_to")],
)
def test_date_at_the_limit_returns_400_naming_the_field(
    client, db_session, sample_requests, params, field
):
    response = get_as(client, get_user(db_session, "manager@srct.local"), **params)

    assert response.status_code == 400
    assert response.json() == {"detail": f"{field} is out of range"}


@pytest.mark.parametrize("params", [{"created_from": "9999-12-31"}, {"created_to": "0001-01-01"}])
def test_dates_that_still_convert_are_not_rejected(client, db_session, sample_requests, params):
    response = get_as(client, get_user(db_session, "manager@srct.local"), **params)

    assert response.status_code == 200


def test_request_after_midnight_riyadh_belongs_to_that_riyadh_date(
    client, db_session, sample_requests
):
    # 00:30 on 10 March in Riyadh is still 21:30 on 9 March in UTC.
    sample_requests["A"].created_at = datetime(2026, 3, 9, 21, 30)
    db_session.flush()
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, created_from="2026-03-10", created_to="2026-03-10")

    assert ids(items) == {sample_requests["A"].id}


def test_riyadh_date_filter_includes_its_last_second_only(
    client, db_session, sample_requests
):
    sample_requests["A"].created_at = datetime(2026, 3, 9, 20, 59, 59)  # 9 Mar 23:59:59 Riyadh
    sample_requests["B"].created_at = datetime(2026, 3, 10, 20, 59, 59)  # 10 Mar 23:59:59 Riyadh
    sample_requests["C"].created_at = datetime(2026, 3, 10, 21, 0, 0)  # 11 Mar 00:00:00 Riyadh
    db_session.flush()
    manager = get_user(db_session, "manager@srct.local")

    items = list_as(client, manager, created_from="2026-03-10", created_to="2026-03-10")

    assert ids(items) == {sample_requests["B"].id}


@pytest.mark.parametrize(
    "params",
    [
        {"status": "done"},
        {"priority": "urgent"},
        {"sort": "password_hash"},
        {"order": "sideways"},
        {"page": 0},
        {"page_size": 0},
        {"page_size": 101},
        {"created_from": "not-a-date"},
    ],
)
def test_invalid_query_param_returns_422(client, db_session, sample_requests, params):
    response = get_as(client, get_user(db_session, "manager@srct.local"), **params)

    assert response.status_code == 422
