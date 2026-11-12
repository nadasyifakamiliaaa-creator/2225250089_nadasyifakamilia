"""Nama subbab dan kode kesalahan yang mudah dibaca guru.

Samakan dengan frontend/js/ui/strings.js (errorNames).
"""

import json
from functools import cache
from pathlib import Path

ERROR_NAMES = {
    "E-N": "Salah menghitung banyak data",
    "E-SUM": "Salah menjumlahkan data",
    "E-SUM-MISS": "Ada data yang terlewat saat dijumlahkan",
    "E-DIV-N1": "Membagi dengan bilangan yang salah",
    "E-DIV": "Salah saat membagi",
    "E-ROUND": "Salah membulatkan",
    "E-FREQ-N": "Banyak data pada tabel frekuensi",
    "E-FREQ-SUM": "Lupa mengalikan nilai dengan frekuensi",
    "E-SELECT": "Memilih angka yang bukan data pada soal cerita",
    "E-UNDERSTAND": "Salah memahami yang ditanyakan",
    "E-INTERP": "Salah memaknai hasil rata-rata",
    "E-MISSING": "Mencari nilai yang hilang",
    "E-CALC": "Hitung prasyarat (penjumlahan/pembagian)",
}

# Kode yang tidak menunjukkan jenis kesalahan tertentu, tidak ditampilkan di ringkasan.
UNSPECIFIC_CODES = {"E-OTHER"}


@cache
def subtopic_titles(frontend_dir: Path) -> dict[str, str]:
    topic = json.loads(
        (frontend_dir / "content" / "mean" / "topic.json").read_text(encoding="utf-8")
    )
    return {sub["id"]: sub["title"] for sub in topic["subtopics"]}
