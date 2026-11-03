from datetime import date, timedelta

import pytest

from app.services.compliance import (
    EXPIRY_WARNING_DAYS,
    DocumentStatus,
    days_left,
    document_status,
)

TODAY = date(2026, 11, 3)


@pytest.mark.parametrize(
    ("offset", "expected_days", "expected_status"),
    [
        (-1, -1, DocumentStatus.EXPIRED),  # yesterday
        (0, 0, DocumentStatus.EXPIRING_SOON),  # today still counts as usable
        (1, 1, DocumentStatus.EXPIRING_SOON),
        (30, 30, DocumentStatus.EXPIRING_SOON),  # the last "soon" day
        (31, 31, DocumentStatus.VALID),
        (365, 365, DocumentStatus.VALID),
        (-400, -400, DocumentStatus.EXPIRED),
    ],
)
def test_status_boundaries(offset, expected_days, expected_status):
    expiry = TODAY + timedelta(days=offset)

    assert days_left(expiry, TODAY) == expected_days
    assert document_status(expiry, TODAY) == expected_status


def test_warning_window_is_30_days():
    assert EXPIRY_WARNING_DAYS == 30


def test_status_values_are_the_api_strings():
    assert [s.value for s in DocumentStatus] == ["valid", "expiring_soon", "expired"]
