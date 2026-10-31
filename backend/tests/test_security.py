from app.core.security import hash_password, verify_password


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
