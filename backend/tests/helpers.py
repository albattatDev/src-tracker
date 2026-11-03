"""Plain helpers shared by test files (fixtures live in conftest.py)."""

from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import User


def get_user(db_session: Session, email: str) -> User:
    return db_session.query(User).filter(User.email == email).one()


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user)}"}
