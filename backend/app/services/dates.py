from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings


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
