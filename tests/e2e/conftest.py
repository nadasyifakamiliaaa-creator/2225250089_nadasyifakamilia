"""Uji end-to-end: server sungguhan (uvicorn, basis data sementara) + browser (Playwright).

Memakai Google Chrome yang terpasang; jika tidak ada, Chromium bawaan Playwright
(`playwright install chromium`). Jika keduanya tidak ada, uji ini dilewati.
Jalankan hanya uji cepat: pytest -m "not e2e"
"""

import re
import socket
import threading
import time
from collections.abc import Callable
from types import SimpleNamespace

import pytest

sync_api = pytest.importorskip("playwright.sync_api")

import uvicorn  # noqa: E402

from backend.app.admin import create_classroom  # noqa: E402
from backend.app.config import Settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402

CLASS_CODE = "E2E-KELAS"
TEACHER_PASSWORD = "sandi-uji-123"
FORBIDDEN_TEXT = re.compile(r"\b(null|undefined|NaN)\b")


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="session")
def live_app(tmp_path_factory):
    app = create_app(Settings(database_path=tmp_path_factory.mktemp("e2e") / "e2e.db"))
    with app.state.db.session() as session:
        create_classroom(session, CLASS_CODE, "Kelas Uji", TEACHER_PASSWORD, research=True)

    port = _free_port()
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 15
    while not server.started:
        if time.monotonic() > deadline:
            pytest.fail("Server uji tidak menyala.")
        time.sleep(0.05)
    yield SimpleNamespace(url=f"http://127.0.0.1:{port}/", app=app)
    server.should_exit = True
    thread.join(timeout=5)


@pytest.fixture(scope="session")
def browser():
    with sync_api.sync_playwright() as playwright:
        try:
            instance = playwright.chromium.launch(channel="chrome")
        except Exception:
            try:
                instance = playwright.chromium.launch()
            except Exception as error:  # pragma: no cover - tergantung mesin
                pytest.skip(f"Browser untuk uji e2e tidak tersedia: {error}")
        yield instance
        instance.close()


@pytest.fixture
def page(browser, live_app):
    """Halaman ukuran HP (360 × 740) yang gagal bila ada galat JavaScript/CSP."""
    context = browser.new_context(viewport={"width": 360, "height": 740})
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on(
        "console",
        lambda message: (
            errors.append(f"console: {message.text}") if message.type == "error" else None
        ),
    )
    page.base_url = live_app.url
    # Uji boleh menyatakan galat konsol yang memang diharapkan (mis. 404 untuk kode kelas salah).
    page.expected_errors = []
    yield page
    context.close()
    unexpected = [e for e in errors if not any(p in e for p in page.expected_errors)]
    assert not unexpected, unexpected


@pytest.fixture
def expect():
    return sync_api.expect


def assert_clean_text(page) -> None:
    """Tidak ada 'null', 'undefined', atau 'NaN' yang bocor ke layar."""
    found = FORBIDDEN_TEXT.findall(page.inner_text("main"))
    assert not found, f"Teks terlarang di layar {page.url}: {found}"


def wait_until(condition: Callable[[], bool], timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while not condition():
        if time.monotonic() > deadline:
            pytest.fail("Kondisi yang ditunggu tidak terpenuhi.")
        time.sleep(0.2)
