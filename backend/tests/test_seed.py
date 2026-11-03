from app.models import User
from app.seed import seed_users


def test_seed_is_idempotent(db_session):
    first = seed_users(db_session)
    assert first == {"created": 5, "skipped": 0}
    assert db_session.query(User).count() == 5

    second = seed_users(db_session)
    assert second == {"created": 0, "skipped": 5}
    assert db_session.query(User).count() == 5

    emails = [u.email for u in db_session.query(User).all()]
    assert len(emails) == len(set(emails))


def test_seed_links_engineers_to_manager(db_session):
    seed_users(db_session)

    manager = db_session.query(User).filter(User.email == "manager@srct.local").one()
    engineer1 = db_session.query(User).filter(User.email == "engineer1@srct.local").one()
    engineer2 = db_session.query(User).filter(User.email == "engineer2@srct.local").one()

    assert engineer1.manager_id == manager.id
    assert engineer2.manager_id == manager.id


def test_seed_demo_invoices_is_idempotent_and_covers_every_aging_band(db_session):
    from app.models import ApprovalStatus, Invoice
    from app.seed import seed_demo_invoices
    from app.services.aging import AgingBand, compute_aging
    from app.services.dates import riyadh_today

    seed_users(db_session)
    assert seed_demo_invoices(db_session) == {"requests": 2, "invoices": 6}
    assert seed_demo_invoices(db_session) == {"requests": 0, "invoices": 0}

    pending = db_session.query(Invoice).filter(Invoice.approval_status == ApprovalStatus.PENDING)
    bands = {compute_aging(i.due_date, i.submission_date, riyadh_today())[1] for i in pending}
    assert bands == set(AgingBand)
    assert db_session.query(Invoice).filter(
        Invoice.approval_status == ApprovalStatus.APPROVED
    ).count() == 1
    assert db_session.query(Invoice).filter(
        Invoice.approval_status == ApprovalStatus.REJECTED
    ).count() == 1
