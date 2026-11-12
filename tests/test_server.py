"""Tes server: API kesehatan, penyajian file statis, dan header keamanan."""

from fastapi.testclient import TestClient

from backend.app.config import APP_VERSION


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "RataKu", "version": APP_VERSION}


def test_index_is_served_with_manifest_link(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert 'rel="manifest"' in response.text
    assert response.headers["cache-control"] == "no-cache"


def test_javascript_served_as_javascript(client: TestClient) -> None:
    # Browser menolak ES module yang dikirim sebagai text/plain.
    response = client.get("/js/app.js")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/javascript")


def test_service_worker_is_not_cached(client: TestClient) -> None:
    response = client.get("/sw.js")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-cache"


def test_manifest_content_type(client: TestClient) -> None:
    response = client.get("/manifest.webmanifest")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/manifest+json")


def test_security_headers_present(client: TestClient) -> None:
    response = client.get("/")
    csp = response.headers["content-security-policy"]
    assert "default-src 'self'" in csp
    assert response.headers["x-content-type-options"] == "nosniff"


def test_api_docs_not_blocked_by_csp(client: TestClient) -> None:
    response = client.get("/docs")
    assert response.status_code == 200
    assert "content-security-policy" not in response.headers


def test_unknown_file_returns_404(client: TestClient) -> None:
    assert client.get("/tidak-ada.js").status_code == 404
