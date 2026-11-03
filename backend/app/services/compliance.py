"""Document expiry status as pure functions: no database, no clock. The caller passes
`today` (see dates.riyadh_today), so the API, the daily job and the tests share one rule.
"""

import enum
from datetime import date

# A document with this many days left (or fewer) is "expiring soon". The notification job
# uses the same number as its alert threshold.
EXPIRY_WARNING_DAYS = 30


class DocumentStatus(str, enum.Enum):
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"


def days_left(expiry_date: date, today: date) -> int:
    """Whole calendar days until the expiry date. 0 on the expiry day, negative after it."""
    return (expiry_date - today).days


def document_status(expiry_date: date, today: date) -> DocumentStatus:
    """expired: the expiry date is before today. expiring_soon: 0 to 30 days left (the
    expiry day itself still counts as usable). valid: more than 30 days left."""
    remaining = days_left(expiry_date, today)
    if remaining < 0:
        return DocumentStatus.EXPIRED
    if remaining <= EXPIRY_WARNING_DAYS:
        return DocumentStatus.EXPIRING_SOON
    return DocumentStatus.VALID
