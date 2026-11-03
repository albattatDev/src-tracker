"""Invoice aging as pure functions: no database, no clock. The caller passes `today`
(see dates.riyadh_today), so the API, the daily job and the tests all use one rule.
"""

import enum
from datetime import date, timedelta

from app.models import ApprovalStatus

# Alert thresholds in days. The band edges below are the same numbers.
THRESHOLDS = (30, 60, 180)
_YELLOW_FROM, _ORANGE_FROM, _LAST_ORANGE = THRESHOLDS


# The one approval status in which an invoice ages. Decided invoices (approved or rejected)
# have no aging and get no alerts. Anything that asks "does this invoice age?" must use
# `ages` (or this constant in a SQL filter): the aging_band filter, the daily alert job and
# the dashboard counts, so the rule cannot drift between them.
AGING_STATUS = ApprovalStatus.PENDING


def ages(approval_status: ApprovalStatus) -> bool:
    return approval_status == AGING_STATUS


class AgingBand(str, enum.Enum):
    GREEN = "green"  # < 30
    YELLOW = "yellow"  # 30-59
    ORANGE = "orange"  # 60-180
    RED = "red"  # > 180


def _band_for_age(age_days: int) -> AgingBand:
    if age_days < _YELLOW_FROM:  # includes negative ages (not due yet)
        return AgingBand.GREEN
    if age_days < _ORANGE_FROM:
        return AgingBand.YELLOW
    if age_days <= _LAST_ORANGE:
        return AgingBand.ORANGE
    return AgingBand.RED


def compute_aging(
    due_date: date | None, submission_date: date, today: date
) -> tuple[int, AgingBand]:
    """(age_days, band). The age counts from the due date, or from the submission date
    when there is no due date."""
    age_days = (today - (due_date or submission_date)).days
    return age_days, _band_for_age(age_days)


def band_date_bounds(today: date, band: AgingBand) -> tuple[date | None, date | None]:
    """(earliest, latest) reference date, both inclusive and None when open-ended, for
    invoices in `band`. Use it on COALESCE(due_date, submission_date) in SQL; it is the
    inverse of compute_aging (age = today - reference date)."""
    match band:
        case AgingBand.GREEN:
            return today - timedelta(days=_YELLOW_FROM - 1), None
        case AgingBand.YELLOW:
            return today - timedelta(days=_ORANGE_FROM - 1), today - timedelta(days=_YELLOW_FROM)
        case AgingBand.ORANGE:
            return today - timedelta(days=_LAST_ORANGE), today - timedelta(days=_ORANGE_FROM)
        case AgingBand.RED:
            return None, today - timedelta(days=_LAST_ORANGE + 1)
