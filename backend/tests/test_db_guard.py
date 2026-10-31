import pytest

from tests.db_guard import assert_test_db


def test_rejects_non_test_database():
    with pytest.raises(RuntimeError):
        assert_test_db("mysql+pymysql://srct:pw@db:3306/srct?charset=utf8mb4")


def test_accepts_test_database():
    url = "mysql+pymysql://srct:pw@db:3306/srct_test?charset=utf8mb4"
    assert assert_test_db(url) == url


def test_app_settings_point_at_test_database():
    from app.core.config import settings

    assert settings.db_name == "srct_test"
