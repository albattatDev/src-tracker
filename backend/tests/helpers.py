"""Plain helpers shared by test files (fixtures live in conftest.py)."""

from datetime import date

from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import User

# The "today" the shared make_invoice / make_document fixtures count their ages and expiry days from.
TODAY = date(2026, 11, 3)


def get_user(db_session: Session, email: str) -> User:
    return db_session.query(User).filter(User.email == email).one()


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user)}"}
