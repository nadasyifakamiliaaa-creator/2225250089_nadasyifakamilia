"""Tes kesiapan PWA: manifest, ikon, daftar precache Service Worker, dan konsistensi versi."""

import json
import re
import struct
from pathlib import Path

from backend.app.config import APP_VERSION

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"

# File yang sengaja tidak di-precache.
NOT_PRECACHED = {"sw.js"}
NOT_PRECACHED_DIRS = {"tests"}


def _sw_source() -> str:
    return (FRONTEND / "sw.js").read_text(encoding="utf-8")


def _precache_urls() -> list[str]:
    match = re.search(r"PRECACHE_URLS\s*=\s*\[(.*?)\];", _sw_source(), re.S)
    assert match, "PRECACHE_URLS tidak ditemukan di sw.js"
    return re.findall(r"'([^']+)'", match.group(1))


def _png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name} bukan PNG"
    return struct.unpack(">II", data[16:24])


def test_manifest_has_required_fields() -> None:
    manifest = json.loads((FRONTEND / "manifest.webmanifest").read_text(encoding="utf-8"))
    for key in ("name", "short_name", "start_url", "scope", "display", "icons"):
        assert key in manifest, f"manifest tidak punya '{key}'"
    assert manifest["display"] == "standalone"
    assert manifest["lang"] == "id"
    # Relatif agar tetap bekerja bila di-hosting di subfolder (GitHub Pages).
    assert manifest["start_url"].startswith("./")
    assert manifest["scope"] == "./"


def test_manifest_icons_exist_with_correct_sizes() -> None:
    manifest = json.loads((FRONTEND / "manifest.webmanifest").read_text(encoding="utf-8"))
    purposes = set()
    for icon in manifest["icons"]:
        path = FRONTEND / icon["src"]
        assert path.exists(), f"ikon {icon['src']} tidak ada"
        width, height = (int(v) for v in icon["sizes"].split("x"))
        assert _png_size(path) == (width, height)
        purposes.add(icon.get("purpose", "any"))
    sizes = {icon["sizes"] for icon in manifest["icons"]}
    assert {"192x192", "512x512"} <= sizes
    assert "maskable" in purposes


def test_every_frontend_file_is_precached() -> None:
    listed = {url.removeprefix("./") for url in _precache_urls()}
    missing = []
    for path in FRONTEND.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(FRONTEND).as_posix()
        if rel in NOT_PRECACHED or rel.split("/")[0] in NOT_PRECACHED_DIRS:
            continue
        if rel not in listed:
            missing.append(rel)
    assert not missing, f"Daftarkan di PRECACHE_URLS (sw.js): {missing}"


def test_every_precached_url_exists() -> None:
    for url in _precache_urls():
        rel = url.removeprefix("./")
        if rel == "":
            continue
        assert (FRONTEND / rel).is_file(), f"PRECACHE_URLS memuat file yang tidak ada: {url}"


def test_versions_are_consistent() -> None:
    sw_version = re.search(r"CACHE_VERSION\s*=\s*'([^']+)'", _sw_source()).group(1)
    config_js = (FRONTEND / "js" / "config.js").read_text(encoding="utf-8")
    js_version = re.search(r"version:\s*'([^']+)'", config_js).group(1)
    assert sw_version == js_version == APP_VERSION
