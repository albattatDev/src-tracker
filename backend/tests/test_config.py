import pytest
from pydantic import ValidationError

from app.core.config import Settings


def make_settings(jwt_secret: str) -> Settings:
    # Passed explicitly so the test does not depend on the real .env or environment.
    return Settings(
        _env_file=None,
        db_password="test-db-password",
        seed_password="test-seed-password",
        jwt_secret=jwt_secret,
    )


def test_jwt_secret_of_32_characters_is_accepted():
    secret = "a" * 32

    assert make_settings(secret).jwt_secret == secret


@pytest.mark.parametrize(
    "secret",
    [
        "x",
        "a" * 31,
        "change-me-generate-with-openssl-rand-hex-32",
        "change-me" + "a" * 40,
    ],
    ids=["one-char", "31-chars", "env-example-placeholder", "long-placeholder"],
)
def test_weak_jwt_secret_is_rejected(secret):
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        make_settings(secret)
