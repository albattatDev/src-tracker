import logging

from sqlalchemy.exc import OperationalError

from app.core.database import get_db
from app.main import app


class BrokenSession:
    def execute(self, *args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))


def test_health_connected(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_health_database_down_returns_503_and_logs(client, caplog):
    # `client` removes its own get_db override on teardown, so this one is cleaned up too.
    app.dependency_overrides[get_db] = lambda: BrokenSession()

    with caplog.at_level(logging.ERROR):
        response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "not connected"}
    assert "connection refused" not in response.text  # no internals leak to the client
    assert "database is not reachable" in caplog.text
