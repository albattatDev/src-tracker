import pytest
from sqlalchemy.exc import IntegrityError

from app.models import NotificationEntityType, NotificationLog, NotificationStatus


def _log(entity_id: int, threshold: int) -> NotificationLog:
    return NotificationLog(
        entity_type=NotificationEntityType.INVOICE,
        entity_id=entity_id,
        threshold=threshold,
        recipients="engineer1@srct.local",
        status=NotificationStatus.PENDING,
    )


def test_same_entity_and_threshold_cannot_be_logged_twice(db_session):
    db_session.add(_log(entity_id=1, threshold=30))
    db_session.flush()

    db_session.add(_log(entity_id=1, threshold=30))
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_different_threshold_for_same_entity_is_allowed(db_session):
    db_session.add_all([_log(entity_id=1, threshold=30), _log(entity_id=1, threshold=60)])
    db_session.flush()
