from sqlalchemy.engine import make_url

TEST_DB_NAME = "srct_test"


def assert_test_db(url: str) -> str:
    """Raises if `url` does not point at the dedicated test database.

    Called before every operation that can create/drop/migrate a schema, so a
    misconfigured environment fails loudly instead of touching real data.
    """
    name = make_url(url).database
    if name != TEST_DB_NAME:
        raise RuntimeError(
            f"Refusing to run tests against database {name!r}; expected {TEST_DB_NAME!r}."
        )
    return url
