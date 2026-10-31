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
