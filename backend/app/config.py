"""Pengaturan aplikasi.

Nilai dapat diubah lewat variabel lingkungan saat deploy (lihat .env.example).
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

APP_VERSION = "0.7.0"


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "RataKu"
    version: str = APP_VERSION
    frontend_dir: Path = field(
        default_factory=lambda: Path(os.getenv("FRONTEND_DIR", PROJECT_ROOT / "frontend"))
    )
    # Berkas SQLite. Saat deploy, arahkan ke penyimpanan permanen (volume/disk), docs/09.
    database_path: Path = field(
        default_factory=lambda: Path(
            os.getenv("DATABASE_PATH", PROJECT_ROOT / "data" / "rataku.db")
        )
    )
    # Domain lain yang boleh memanggil API (frontend di-hosting terpisah, docs/09 opsi C)
    allowed_origins: list[str] = field(
        default_factory=lambda: _split_csv(os.getenv("ALLOWED_ORIGINS", ""))
    )
    # "auto" = cookie Secure bila diakses lewat HTTPS; "true"/"false" untuk memaksa.
    cookie_secure: str = field(default_factory=lambda: os.getenv("COOKIE_SECURE", "auto"))
    teacher_session_hours: int = 8
    max_sync_bytes: int = 256 * 1024
    max_sync_events: int = 500


settings = Settings()
