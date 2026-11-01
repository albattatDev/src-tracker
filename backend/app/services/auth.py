import secrets

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User

# Verified against when the email is unknown, so that login costs one bcrypt check on
# every path and response time does not reveal which emails exist.
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Returns the user, or None for an unknown email, wrong password or inactive user.

    The password is always verified first, before is_active is looked at.
    """
    user = db.query(User).filter(User.email == email).one_or_none()
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_ok = verify_password(password, password_hash)

    if user is None or not password_ok or not user.is_active:
        return None
    return user
