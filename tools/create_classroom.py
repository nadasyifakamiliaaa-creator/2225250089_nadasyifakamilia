"""Membuat kelas baru beserta kata sandi dasbor guru.

Contoh:
    python tools/create_classroom.py --code 8B-2026 --name "Kelas 8B" --research
    (kata sandi akan ditanyakan; minimal 8 karakter)

--research  menampilkan skala beban kognitif kepada siswa kelas ini (mode penelitian, F11).
Basis data yang dipakai: variabel lingkungan DATABASE_PATH, bawaan data/rataku.db.
"""

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.admin import create_classroom  # noqa: E402
from backend.app.config import Settings  # noqa: E402
from backend.app.db import Database  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Buat kelas baru untuk RataKu.")
    parser.add_argument("--code", required=True, help="kode kelas, mis. 8B-2026")
    parser.add_argument("--name", required=True, help='nama kelas, mis. "Kelas 8B"')
    parser.add_argument("--research", action="store_true", help="aktifkan mode penelitian")
    parser.add_argument("--password", help="kata sandi (jika kosong, akan ditanyakan)")
    args = parser.parse_args()

    password = args.password or getpass.getpass("Kata sandi dasbor guru: ")
    if not args.password and password != getpass.getpass("Ulangi kata sandi: "):
        print("Kata sandi tidak sama.")
        return 1

    settings = Settings()
    database = Database(settings.database_path)
    try:
        with database.session() as session:
            classroom = create_classroom(session, args.code, args.name, password, args.research)
    except ValueError as error:
        print(f"Gagal: {error}")
        return 1
    mode = " (mode penelitian)" if classroom.research else ""
    print(f"Kelas {classroom.code} — {classroom.name}{mode} dibuat di {settings.database_path}")
    print("Bagikan kode kelas ini kepada siswa. Dasbor guru: /guru")
    return 0


if __name__ == "__main__":
    sys.exit(main())
