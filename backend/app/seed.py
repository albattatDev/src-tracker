"""Idempotent demo data seed.

`seed_users(db)` holds all the logic and takes a session, so tests can call it against
a session bound to a rolled-back transaction (see tests/conftest.py). `__main__` is the
only place that creates a real session, for `python -m app.seed`.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User, UserRole


@dataclass(frozen=True)
class SeedUser:
    first_name: str
    last_name: str
    email: str
    role: UserRole
    manager_email: str | None = None


# A user's manager must be listed before them: seed_users resolves manager_email
# against rows that already exist, and fails if it cannot.
SEED_USERS = [
    SeedUser("Admin", "User", "admin@srct.local", UserRole.ADMIN),
    SeedUser("Abdullah", "Alqahtani", "manager@srct.local", UserRole.MANAGER),
    SeedUser("Fahad", "Alharbi", "engineer1@srct.local", UserRole.ENGINEER, "manager@srct.local"),
    SeedUser("Saad", "Alotaibi", "engineer2@srct.local", UserRole.ENGINEER, "manager@srct.local"),
    SeedUser("Noura", "Alshehri", "operations@srct.local", UserRole.OPERATIONS),
]


def seed_users(db: Session) -> dict[str, int]:
    """Creates the 5 demo users if they do not already exist (matched by email).

    Existing rows are left untouched (their password hash is not re-rolled).
    Returns a summary like {"created": 2, "skipped": 3}.
    """
    created = 0
    skipped = 0
    password_hash = hash_password(settings.seed_password)

    for seed in SEED_USERS:
        if db.query(User).filter(User.email == seed.email).one_or_none() is not None:
            skipped += 1
            continue

        manager_id = None
        if seed.manager_email is not None:
            manager = db.query(User).filter(User.email == seed.manager_email).one_or_none()
            if manager is None:
                raise RuntimeError(
                    f"Seed user {seed.email} needs manager {seed.manager_email}, "
                    "which does not exist. List the manager before this user in SEED_USERS."
                )
            manager_id = manager.id

        db.add(
            User(
                first_name=seed.first_name,
                last_name=seed.last_name,
                email=seed.email,
                password_hash=password_hash,
                role=seed.role,
                manager_id=manager_id,
            )
        )
        db.flush()  # so later rows in this same call can resolve their manager
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped}


if __name__ == "__main__":
    with SessionLocal() as session:
        summary = seed_users(session)
        print(f"Seed complete: {summary['created']} created, {summary['skipped']} skipped.")
