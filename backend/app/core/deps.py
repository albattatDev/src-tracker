from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.requests import HTTPConnection
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User, UserRole


class BearerToken(OAuth2PasswordBearer):
    """Reads the Authorization header from any connection. The stock class asks for a
    `Request`, which FastAPI cannot inject into a WebSocket route."""

    async def __call__(self, connection: HTTPConnection) -> str | None:
        return await super().__call__(connection)  # type: ignore[arg-type]


oauth2_scheme = BearerToken(tokenUrl="/auth/login", auto_error=False)

# The only routes that work without a token. Anything not listed here is protected.
PUBLIC_PATHS = frozenset({"/auth/login", "/health"})


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_optional_user(
    connection: HTTPConnection,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """App-wide dependency: every route needs a valid token unless its registered path
    is in PUBLIC_PATHS (then it returns None). Matching on the route's own path, not the
    raw URL, means a variant like /health/ cannot slip into or past the allowlist.
    FastAPI caches the result, so the token is checked once per request."""
    if connection.scope["route"].path in PUBLIC_PATHS:
        return None
    if token is None:
        raise _credentials_error()

    try:
        user_id = int(decode_access_token(token)["sub"])
    except (jwt.InvalidTokenError, ValueError):
        raise _credentials_error()

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _credentials_error()
    return user


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if user is None:
        raise _credentials_error()
    return user


def require_role(*roles: UserRole) -> Callable[[User], User]:
    """Checks the role loaded from the database, not the one in the token, so a role
    change applies on the next request instead of when the token expires."""

    def check_role(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to do this",
            )
        return user

    return check_role
