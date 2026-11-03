import re
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel

from app.models import Priority, SRStatus
from app.schemas.service_request import SRRead
from app.schemas.types import UtcDatetime
from tests.helpers import auth_headers

Z_FORMAT = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


class _Model(BaseModel):
    at: UtcDatetime


def test_naive_datetime_is_treated_as_utc_and_gets_z():
    value = datetime(2026, 11, 1, 22, 57, 0, 123456)

    assert _Model(at=value).model_dump_json() == '{"at":"2026-11-01T22:57:00Z"}'


def test_aware_datetime_is_converted_to_utc():
    riyadh = timezone(timedelta(hours=3))
    value = datetime(2026, 11, 2, 1, 57, 0, tzinfo=riyadh)

    assert _Model(at=value).model_dump_json() == '{"at":"2026-11-01T22:57:00Z"}'


def test_sr_read_serializes_both_timestamps_with_z():
    moment = datetime(2026, 11, 1, 22, 57, 0)
    sr = SRRead(
        id=1,
        title="t",
        description="d",
        priority=Priority.LOW,
        status=SRStatus.OPEN,
        requester_name="A B",
        assigned_engineer_name=None,
        created_at=moment,
        updated_at=moment,
    )

    body = sr.model_dump(mode="json")

    assert body["created_at"] == "2026-11-01T22:57:00Z"
    assert body["updated_at"] == "2026-11-01T22:57:00Z"


def test_api_timestamps_end_with_z_on_create_detail_and_list(client, users):
    user = users["operations"]
    headers = auth_headers(user)

    created = client.post(
        "/service-requests",
        json={"title": "AC", "description": "hot", "priority": "high"},
        headers=headers,
    ).json()
    detail = client.get(f"/service-requests/{created['id']}", headers=headers).json()
    listed = client.get("/service-requests", headers=headers).json()["items"][0]

    for body in (created, detail, listed):
        assert Z_FORMAT.match(body["created_at"])
        assert Z_FORMAT.match(body["updated_at"])
