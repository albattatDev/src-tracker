from datetime import date

from sqlalchemy.orm import Session

from app.models import AuditLog, Priority, ServiceRequest, SRStatus
from app.services.audit import AuditAction, AuditEntity, log_action, row_values


def test_log_action_adds_row_with_given_fields(db_session: Session, make_user):
    user = make_user()

    log_action(
        db_session, user.id, AuditAction.UPDATE, AuditEntity.SERVICE_REQUEST, 7, {"a": 1}, {"a": 2}
    )
    db_session.flush()

    row = db_session.query(AuditLog).filter(AuditLog.entity_id == 7).one()
    assert (row.user_id, row.action, row.entity_type) == (user.id, "update", "service_request")
    assert row.old_values == {"a": 1}
    assert row.new_values == {"a": 2}
    assert row.created_at is not None


def test_log_action_makes_enums_and_dates_json_safe(db_session: Session):
    log_action(
        db_session,
        None,
        AuditAction.CREATE,
        AuditEntity.SERVICE_REQUEST,
        8,
        new_values={"priority": Priority.HIGH, "day": date(2026, 11, 2)},
    )
    db_session.flush()
    db_session.expire_all()

    row = db_session.query(AuditLog).filter(AuditLog.entity_id == 8).one()
    assert row.user_id is None
    assert row.old_values is None
    assert row.new_values == {"priority": "high", "day": "2026-11-02"}


def test_log_action_does_not_commit(engine, db_session: Session):
    log_action(db_session, None, AuditAction.CREATE, AuditEntity.SERVICE_REQUEST, 9)
    db_session.flush()

    with engine.connect() as other_connection:
        count = other_connection.exec_driver_sql(
            "SELECT COUNT(*) FROM audit_log WHERE entity_id = 9"
        ).scalar()
    assert count == 0


def test_row_values_lists_columns_without_bookkeeping_ones():
    request = ServiceRequest(
        id=5,
        title="T",
        description="D",
        priority=Priority.LOW,
        status=SRStatus.OPEN,
        requester_id=3,
    )

    assert row_values(request) == {
        "title": "T",
        "description": "D",
        "priority": Priority.LOW,
        "status": SRStatus.OPEN,
        "requester_id": 3,
        "assigned_engineer_id": None,
    }


def test_row_values_before_and_after_a_change_can_be_logged(db_session: Session, make_user):
    user = make_user()
    request = ServiceRequest(
        title="T", description="D", priority=Priority.LOW, requester_id=user.id
    )
    db_session.add(request)
    db_session.flush()

    old = row_values(request)
    request.priority = Priority.HIGH
    request.assigned_engineer_id = user.id
    log_action(
        db_session,
        user.id,
        AuditAction.UPDATE,
        AuditEntity.SERVICE_REQUEST,
        request.id,
        old_values=old,
        new_values=row_values(request),
    )
    db_session.flush()
    db_session.expire_all()

    row = db_session.query(AuditLog).filter(AuditLog.entity_id == request.id).one()
    assert row.old_values["priority"] == "low"
    assert row.new_values["priority"] == "high"
    assert row.old_values["assigned_engineer_id"] is None
    assert row.new_values["assigned_engineer_id"] == user.id
