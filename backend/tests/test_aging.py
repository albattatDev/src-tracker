from datetime import date, timedelta

import pytest

from app.models import ApprovalStatus
from app.services.aging import THRESHOLDS, AgingBand, ages, band_date_bounds, compute_aging

TODAY = date(2026, 11, 3)


def ago(days: int) -> date:
    return TODAY - timedelta(days=days)


def test_thresholds():
    assert THRESHOLDS == (30, 60, 180)


@pytest.mark.parametrize(
    "age, band",
    [
        (0, AgingBand.GREEN),
        (29, AgingBand.GREEN),
        (30, AgingBand.YELLOW),
        (59, AgingBand.YELLOW),
        (60, AgingBand.ORANGE),
        (180, AgingBand.ORANGE),
        (181, AgingBand.RED),
        (1000, AgingBand.RED),
    ],
)
def test_band_boundaries(age, band):
    assert compute_aging(ago(age), ago(age + 5), TODAY) == (age, band)


def test_null_due_date_falls_back_to_submission_date():
    assert compute_aging(None, ago(45), TODAY) == (45, AgingBand.YELLOW)


def test_due_date_wins_over_submission_date():
    assert compute_aging(ago(10), ago(200), TODAY) == (10, AgingBand.GREEN)


def test_negative_age_is_green():
    assert compute_aging(TODAY + timedelta(days=5), ago(3), TODAY) == (-5, AgingBand.GREEN)


@pytest.mark.parametrize("band", list(AgingBand))
def test_band_date_bounds_match_compute_aging(band):
    """Every date just inside a bound is in the band, every date just outside is not,
    checked through compute_aging itself."""
    earliest, latest = band_date_bounds(TODAY, band)

    def band_of(ref: date) -> AgingBand:
        return compute_aging(ref, ref, TODAY)[1]

    # Walk a wide window so open-ended bounds are covered too.
    for offset in range(-400, 40):
        ref = TODAY + timedelta(days=offset)
        inside = (earliest is None or ref >= earliest) and (latest is None or ref <= latest)
        assert (band_of(ref) == band) == inside, (band, ref)


@pytest.mark.parametrize(
    "status, expected",
    [
        (ApprovalStatus.PENDING, True),
        (ApprovalStatus.APPROVED, False),
        (ApprovalStatus.REJECTED, False),
    ],
)
def test_only_pending_invoices_age(status, expected):
    assert ages(status) is expected
