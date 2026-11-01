import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models import User, UserRole


def test_password_is_hashed_not_plaintext():
    plain = "correct-password"
    hashed = hash_password(plain)

    assert hashed != plain
    assert hashed.startswith("$2b$")


def test_verify_password():
    plain = "correct-password"
    hashed = hash_password(plain)

    assert verify_password(plain, hashed) is True
    assert verify_password("wrong-password", hashed) is False


@pytest.mark.parametrize(
    "password",
    ["a\x00b", "a" * 5000],
    ids=["nul-byte", "far-too-long"],
)
def test_verify_password_returns_false_for_input_bcrypt_cannot_hash(password):
    assert verify_password(password, hash_password("correct-password")) is False


def test_token_payload_holds_only_sub_role_exp():
    user = User(id=7, email="user@srct.local", role=UserRole.MANAGER)

    payload = decode_access_token(create_access_token(user))

    assert set(payload) == {"sub", "role", "exp"}
    assert payload["sub"] == "7"
    assert payload["role"] == "manager"
