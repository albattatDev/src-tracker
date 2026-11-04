from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement

from app.core.config import settings
from app.core.errors import BadRequest


class InvalidDateRange(BadRequest):
    """A from / to date filter cannot be used. The message is safe to show the client."""


def riyadh_day_start_utc(day: date) -> datetime:
    """Returns the start (00:00) of this Riyadh day as naive UTC.

    Naive UTC is how timestamps are stored (see utcnow in models/base.py), so the value
    can be compared to a column directly. The end of a day is the start of the next one:
    `riyadh_day_start_utc(day) <= created_at < riyadh_day_start_utc(day + timedelta(days=1))`.
    Raises OverflowError for a day too close to the limits of `date` to convert.
    """
    start = datetime.combine(day, time.min, tzinfo=ZoneInfo(settings.app_timezone))
    return start.astimezone(timezone.utc).replace(tzinfo=None)


def riyadh_today() -> date:
    """Today's calendar date in Asia/Riyadh. The only place that reads the clock for
    "today"; pure code (aging) receives the date as an argument."""
    return datetime.now(ZoneInfo(settings.app_timezone)).date()


def riyadh_day_conditions(
    column: ColumnElement[datetime],
    date_from: date | None,
    date_to: date | None,
    from_name: str = "date_from",
    to_name: str = "date_to",
) -> list[ColumnElement[bool]]:
    """Conditions that keep a timestamp column within an inclusive range of Riyadh calendar
    days, as naive UTC bounds: `column >= start of date_from` and `column < start of the day
    after date_to`. Either side may be None (no bound). Raises InvalidDateRange (a 400) when
    from is after to or a date cannot be converted. The names are used in the messages.
    """
    if date_from is not None and date_to is not None and date_from > date_to:
        raise InvalidDateRange(f"{from_name} must not be after {to_name}")

    conditions: list[ColumnElement[bool]] = []
    if date_from is not None:
        try:
            conditions.append(column >= riyadh_day_start_utc(date_from))
        except OverflowError as error:
            raise InvalidDateRange(f"{from_name} is out of range") from error
    if date_to is not None:
        try:
            # date_to is inclusive, so the cut-off is the start of the day after it.
            conditions.append(column < riyadh_day_start_utc(date_to + timedelta(days=1)))
        except OverflowError as error:
            raise InvalidDateRange(f"{to_name} is out of range") from error
    return conditions
