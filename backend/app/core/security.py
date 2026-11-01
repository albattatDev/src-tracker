from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext
from passlib.exc import PasswordValueError

from app.core.config import settings
from app.models import User

# Pinned bcrypt==4.0.1 in requirements.txt avoids the known passlib/bcrypt>=4.1
# incompatibility (passlib probes bcrypt.__about__, which newer bcrypt removed).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except PasswordValueError:
        # bcrypt cannot hash this input (NUL byte, or far too long): it cannot be the
        # right password, so answer "wrong password" instead of failing with a 500.
        return False


def create_access_token(user: User) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user.id),  # PyJWT rejects a non-string sub when decoding
        "role": user.role.value,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Returns the token payload. Raises jwt.InvalidTokenError (expired tokens
    included) if it cannot be trusted."""
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )
