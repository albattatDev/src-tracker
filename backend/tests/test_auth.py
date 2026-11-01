import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import JWT_ALGORITHM, create_access_token
from app.main import app
from app.models import User, UserRole
from app.services import auth as auth_service

EMAIL = "user@srct.local"
PASSWORD = "correct-password"
LOGIN_ERROR = "Invalid email or password"


def login(client: TestClient, email: str, password: str):
    return client.post("/auth/login", data={"username": email, "password": password})


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def guarded_client(client):
    """A separate app holding a manager-only route, so the real app gets no test route.
    Depends on `client` for the get_db override that points at the test transaction."""
    guarded = FastAPI()

    @guarded.get("/manager-only")
    def manager_only(user: User = Depends(require_role(UserRole.MANAGER))):
        return {"id": user.id}

    guarded.dependency_overrides[get_db] = app.dependency_overrides[get_db]
    return TestClient(guarded)


def test_login_success_returns_token(client, make_user):
    user = make_user(email=EMAIL, password=PASSWORD)

    response = login(client, EMAIL, PASSWORD)

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert client.get("/auth/me", headers=bearer(body["access_token"])).json()["id"] == user.id


def test_wrong_password_returns_401(client, make_user):
    make_user(email=EMAIL, password=PASSWORD)

    response = login(client, EMAIL, "wrong-password")

    assert response.status_code == 401
    assert response.json() == {"detail": LOGIN_ERROR}


def test_unknown_email_returns_401(client):
    response = login(client, "nobody@srct.local", PASSWORD)

    assert response.status_code == 401
    assert response.json() == {"detail": LOGIN_ERROR}


@pytest.mark.parametrize(
    "password",
    ["a\x00b", "a" * 5000],
    ids=["nul-byte", "far-too-long"],
)
@pytest.mark.parametrize("email_exists", [True, False], ids=["known-email", "unknown-email"])
def test_unhashable_password_returns_401_not_500(client, make_user, password, email_exists):
    if email_exists:
        make_user(email=EMAIL, password=PASSWORD)

    response = login(client, EMAIL, password)

    assert response.status_code == 401
    assert response.json() == {"detail": LOGIN_ERROR}


def test_inactive_user_returns_401(client, make_user):
    make_user(email=EMAIL, password=PASSWORD, is_active=False)

    response = login(client, EMAIL, PASSWORD)

    assert response.status_code == 401
    assert response.json() == {"detail": LOGIN_ERROR}


@pytest.mark.parametrize(
    "email, is_active, expected_hash",
    [
        ("nobody@srct.local", True, auth_service.DUMMY_PASSWORD_HASH),
        (EMAIL, False, None),  # None: the user's own hash
    ],
)
def test_failed_logins_still_verify_a_password(
    db_session, make_user, monkeypatch, email, is_active, expected_hash
):
    user = make_user(email=EMAIL, password=PASSWORD, is_active=is_active)
    checked_hashes = []

    def spy(plain_password, password_hash):
        checked_hashes.append(password_hash)
        return True

    monkeypatch.setattr(auth_service, "verify_password", spy)

    assert auth_service.authenticate_user(db_session, email, PASSWORD) is None
    assert checked_hashes == [expected_hash or user.password_hash]


def test_dummy_hash_is_a_real_bcrypt_hash():
    assert auth_service.DUMMY_PASSWORD_HASH.startswith("$2b$")


def test_me_without_token_returns_401(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_user_without_password_hash(client, make_user):
    user = make_user(email=EMAIL, role=UserRole.OPERATIONS)

    response = client.get("/auth/me", headers=bearer(create_access_token(user)))

    assert response.status_code == 200
    assert response.json() == {
        "id": user.id,
        "first_name": "Test",
        "last_name": "User",
        "email": EMAIL,
        "role": "operations",
    }


def test_expired_token_returns_401(client, make_user, monkeypatch):
    user = make_user()
    monkeypatch.setattr(settings, "jwt_expire_minutes", -1)

    response = client.get("/auth/me", headers=bearer(create_access_token(user)))

    assert response.status_code == 401


def test_garbage_token_returns_401(client):
    assert client.get("/auth/me", headers=bearer("not-a-token")).status_code == 401


FAR_FUTURE = 9999999999


def forged_token(payload: dict, key: str | None = None, algorithm: str = JWT_ALGORITHM) -> str:
    return jwt.encode(payload, settings.jwt_secret if key is None else key, algorithm=algorithm)


@pytest.mark.parametrize(
    "build_token",
    [
        lambda user: forged_token({"sub": str(user.id)}),
        lambda user: forged_token({"exp": FAR_FUTURE}),
        lambda user: forged_token({"sub": "not-a-number", "exp": FAR_FUTURE}),
        lambda user: jwt.encode({"sub": str(user.id), "exp": FAR_FUTURE}, None, algorithm="none"),
    ],
    ids=["no-exp", "no-sub", "non-numeric-sub", "alg-none"],
)
def test_invalid_token_returns_401(client, make_user, build_token):
    user = make_user()

    response = client.get("/auth/me", headers=bearer(build_token(user)))

    assert response.status_code == 401


def test_token_of_deleted_user_returns_401(client, db_session, make_user):
    user = make_user()
    token = create_access_token(user)

    db_session.delete(user)
    db_session.flush()

    assert client.get("/auth/me", headers=bearer(token)).status_code == 401


def test_token_signed_with_another_secret_returns_401(client, make_user):
    user = make_user()
    token = jwt.encode(
        {"sub": str(user.id), "role": "admin", "exp": 9999999999},
        "another-secret-that-is-long-enough-for-hs256",
        algorithm=JWT_ALGORITHM,
    )

    assert client.get("/auth/me", headers=bearer(token)).status_code == 401


def test_token_of_deactivated_user_returns_401(client, db_session, make_user):
    user = make_user()
    token = create_access_token(user)

    user.is_active = False
    db_session.flush()

    assert client.get("/auth/me", headers=bearer(token)).status_code == 401


def test_require_role_rejects_wrong_role(guarded_client, make_user):
    user = make_user(role=UserRole.ENGINEER)

    response = guarded_client.get("/manager-only", headers=bearer(create_access_token(user)))

    assert response.status_code == 403


def test_require_role_allows_right_role(guarded_client, make_user):
    user = make_user(role=UserRole.MANAGER)

    response = guarded_client.get("/manager-only", headers=bearer(create_access_token(user)))

    assert response.status_code == 200
    assert response.json() == {"id": user.id}


def test_require_role_uses_role_from_database_not_token(guarded_client, db_session, make_user):
    user = make_user(role=UserRole.MANAGER)
    token = create_access_token(user)

    user.role = UserRole.ENGINEER
    db_session.flush()

    assert guarded_client.get("/manager-only", headers=bearer(token)).status_code == 403
