from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def _to_utc_z(value: datetime) -> str:
    """Formats a datetime as UTC with a trailing Z, e.g. 2026-11-01T22:57:00Z.

    The database stores naive UTC (see app.models.base.utcnow), so a naive value is
    taken as already being UTC. An aware value is converted to UTC first.
    """
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


# Use this for every timestamp a schema sends to the client, so the browser never
# has to guess the time zone. It only changes the JSON output, not validation.
UtcDatetime = Annotated[datetime, PlainSerializer(_to_utc_z, return_type=str, when_used="json")]
