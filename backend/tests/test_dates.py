from datetime import date, datetime

import pytest

from app.services.dates import riyadh_day_start_utc


def test_riyadh_day_starts_at_21_utc_the_day_before():
    assert riyadh_day_start_utc(date(2026, 3, 10)) == datetime(2026, 3, 9, 21, 0)


def test_start_crosses_a_year_end():
    assert riyadh_day_start_utc(date(2026, 1, 1)) == datetime(2025, 12, 31, 21, 0)


def test_start_handles_a_leap_day():
    assert riyadh_day_start_utc(date(2028, 2, 29)) == datetime(2028, 2, 28, 21, 0)


def test_start_is_naive_like_the_stored_timestamps():
    assert riyadh_day_start_utc(date(2026, 3, 10)).tzinfo is None


def test_latest_date_converts():
    assert riyadh_day_start_utc(date.max) == datetime(9999, 12, 30, 21, 0)


def test_earliest_date_raises_overflow():
    # 00:00 Riyadh on 0001-01-01 is before year 1 in UTC.
    with pytest.raises(OverflowError):
        riyadh_day_start_utc(date.min)


def test_riyadh_today_is_the_riyadh_date_not_the_utc_date(monkeypatch):
    from datetime import timezone

    from app.services import dates

    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            # 22:30 UTC on 1 Nov is already 2 Nov (01:30) in Riyadh.
            return datetime(2026, 11, 1, 22, 30, tzinfo=timezone.utc).astimezone(tz)

    monkeypatch.setattr(dates, "datetime", FrozenDatetime)
    assert dates.riyadh_today() == date(2026, 11, 2)
