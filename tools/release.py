"""Siapkan rilis: susun ulang daftar cache offline di sw.js dan samakan nomor versi.

Jalankan: python tools/release.py            (hanya perbarui PRECACHE_URLS)
          python tools/release.py 0.3.0      (sekaligus ganti versi di semua tempat)

Versi disimpan di: frontend/sw.js, frontend/js/config.js, backend/app/config.py, pyproject.toml.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
SW = FRONTEND / "sw.js"

EXCLUDED_FILES = {"sw.js"}
EXCLUDED_DIRS = {"tests"}
FIRST = ["./", "./index.html", "./manifest.webmanifest"]

VERSION_LOCATIONS = [
    (SW, r"(const CACHE_VERSION = ')([^']+)(';)"),
    (FRONTEND / "js" / "config.js", r"(version: ')([^']+)(')"),
    (ROOT / "backend" / "app" / "config.py", r'(APP_VERSION = ")([^"]+)(")'),
    (ROOT / "pyproject.toml", r'(^version = ")([^"]+)(")'),
]


def frontend_files() -> list[str]:
    urls = []
    for path in sorted(FRONTEND.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(FRONTEND).as_posix()
        if rel in EXCLUDED_FILES or rel.split("/")[0] in EXCLUDED_DIRS:
            continue
        url = f"./{rel}"
        if url not in FIRST:
            urls.append(url)
    return FIRST + urls


def update_precache() -> int:
    source = SW.read_text(encoding="utf-8")
    urls = frontend_files()
    block = "const PRECACHE_URLS = [\n" + "".join(f"  '{url}',\n" for url in urls) + "];"
    updated, count = re.subn(r"const PRECACHE_URLS = \[.*?\];", block, source, flags=re.S)
    if count != 1:
        raise SystemExit("PRECACHE_URLS tidak ditemukan di sw.js")
    SW.write_text(updated, encoding="utf-8")
    return len(urls)


def set_version(version: str) -> None:
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise SystemExit(f"Format versi harus X.Y.Z, bukan '{version}'")
    for path, pattern in VERSION_LOCATIONS:
        text = path.read_text(encoding="utf-8")
        updated, count = re.subn(pattern, rf"\g<1>{version}\g<3>", text, count=1, flags=re.M)
        if count != 1:
            raise SystemExit(f"Versi tidak ditemukan di {path}")
        path.write_text(updated, encoding="utf-8")
        print(f"versi {version}: {path.relative_to(ROOT).as_posix()}")


def main() -> None:
    if len(sys.argv) > 1:
        set_version(sys.argv[1])
    print(f"PRECACHE_URLS diperbarui: {update_precache()} berkas")


if __name__ == "__main__":
    main()
