import pytest
from fastapi.routing import APIRoute

from app.core.deps import PUBLIC_PATHS
from app.main import app

# FastAPI registers these itself (as plain Starlette routes, outside the dependency).
FASTAPI_DOCS_PATHS = {"/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}


def _api_routes() -> list[APIRoute]:
    """Fails on any route type the auth gate cannot be proven to cover (a mount, a
    WebSocket, a raw Starlette route), so adding one forces a decision here."""
    routes = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            routes.append(route)
        elif route.path not in FASTAPI_DOCS_PATHS:
            pytest.fail(f"{route.path}: {type(route).__name__} is not covered by the auth gate")
    return routes


def _fill_path_params(path: str) -> str:
    # "/service-requests/{sr_id}" -> "/service-requests/1"
    return "/".join("1" if part.startswith("{") else part for part in path.split("/"))


PROTECTED = [
    (method, route.path)
    for route in _api_routes()
    if route.path not in PUBLIC_PATHS
    for method in sorted(route.methods)
]


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_route_without_token_returns_401(client, method, path):
    response = client.request(method, _fill_path_params(path))
    assert response.status_code == 401


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_route_with_garbage_token_returns_401(client, method, path):
    response = client.request(
        method, _fill_path_params(path), headers={"Authorization": "Bearer nonsense"}
    )
    assert response.status_code == 401


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


def test_health_trailing_slash_redirects_to_public_health(client):
    response = client.get("/health/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"].endswith("/health")
    assert client.get("/health/").status_code == 200


def test_protected_route_trailing_slash_does_not_bypass_auth(client):
    response = client.get("/auth/me/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"].endswith("/auth/me")
    assert client.get("/auth/me/").status_code == 401
