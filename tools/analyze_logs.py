"""Ringkasan statistik deskriptif dari berkas CSV ekspor dasbor guru (docs/08 bagian B.7).

Cara pakai:
    1. Di dasbor guru (/guru), unduh semua CSV ke satu folder, mis. hasil/
       (boleh dari beberapa kelas sekaligus).
    2. python tools/analyze_logs.py hasil/
    3. Ringkasan tampil di layar dan disimpan sebagai hasil/ringkasan-*.csv (bisa dibuka di Excel).

Hanya memakai pustaka standar Python.
"""

import argparse
import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean, median, pstdev

LEPPINK_DIMENSIONS = ("IL", "EL", "GL")


def read_all(folder: Path, kind: str) -> list[dict[str, str]]:
    """Gabungkan semua berkas *-<kind>.csv di folder (BOM Excel ditangani)."""
    rows: list[dict[str, str]] = []
    for path in sorted(folder.glob(f"*-{kind}.csv")):
        with path.open(encoding="utf-8-sig", newline="") as handle:
            rows.extend(csv.DictReader(handle))
    return rows


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def describe(values: list[float]) -> list:
    if not values:
        return [0, "", "", "", "", ""]
    return [
        len(values),
        round(mean(values), 2),
        round(pstdev(values), 2),
        round(median(values), 2),
        min(values),
        max(values),
    ]


DESCRIBE_HEADER = ["n", "rata_rata", "simpangan_baku", "median", "min", "maks"]


def first_try_accuracy(attempts: list[dict[str, str]]) -> list[list]:
    """Ketepatan percobaan pertama pada latihan, per subbab & langkah."""
    totals: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    for row in attempts:
        if (
            row["konteks"] != "lesson"
            or row["percobaan_ke"] != "1"
            or row["lihat_pembahasan"] == "1"
        ):
            continue
        key = (row["subbab"], row["langkah"])
        totals[key][0] += row["benar"] == "1"
        totals[key][1] += 1
    return [
        [subtopic, step, correct, total, pct(correct, total)]
        for (subtopic, step), (correct, total) in sorted(totals.items())
    ]


def error_frequencies(attempts: list[dict[str, str]]) -> list[list]:
    counts = Counter(row["kode_kesalahan"] for row in attempts if row["kode_kesalahan"])
    total = sum(counts.values())
    return [[code, count, pct(count, total)] for code, count in counts.most_common()]


def paas_by_subtopic(efforts: list[dict[str, str]]) -> list[list]:
    values: dict[str, list[float]] = defaultdict(list)
    for row in efforts:
        if row["skala"] == "paas":
            values[row["subbab"]].append(float(row["nilai"]))
    return [[subtopic, *describe(v)] for subtopic, v in sorted(values.items())]


def leppink_by_student(efforts: list[dict[str, str]]) -> list[list]:
    scores: dict[tuple[str, str], dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in efforts:
        if row["skala"] == "leppink" and row["dimensi"]:
            scores[(row["kelas"], row["kode_siswa"])][row["dimensi"]].append(float(row["nilai"]))
    rows = []
    for (classroom, student), dims in sorted(scores.items()):
        rows.append(
            [classroom, student]
            + [round(mean(dims[d]), 2) if dims.get(d) else "" for d in LEPPINK_DIMENSIONS]
        )
    return rows


def quiz_by_student(quizzes: list[dict[str, str]]) -> list[list]:
    per_student: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in quizzes:
        per_student[(row["kelas"], row["kode_siswa"])].append(row)
    rows = []
    for (classroom, student), items in sorted(per_student.items()):
        items.sort(key=lambda r: r["waktu_utc"])
        percents = [int(r["persen"]) for r in items]
        rows.append([classroom, student, len(items), percents[0], percents[-1], max(percents)])
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Ringkas CSV ekspor RataKu.")
    parser.add_argument("folder", type=Path, help="folder berisi CSV dari dasbor guru")
    args = parser.parse_args()
    folder: Path = args.folder
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if not folder.is_dir():
        print(f"Folder tidak ditemukan: {folder}")
        return 1

    attempts = read_all(folder, "percobaan")
    efforts = read_all(folder, "beban-kognitif")
    quizzes = read_all(folder, "kuis")
    if not (attempts or efforts or quizzes):
        print("Tidak ada berkas *-percobaan.csv, *-beban-kognitif.csv, atau *-kuis.csv.")
        return 1

    outputs = {
        "ringkasan-ketepatan.csv": (
            ["subbab", "langkah", "benar_percobaan_pertama", "jumlah", "persen"],
            first_try_accuracy(attempts),
        ),
        "ringkasan-kesalahan.csv": (
            ["kode_kesalahan", "jumlah", "persen"],
            error_frequencies(attempts),
        ),
        "ringkasan-paas.csv": (["subbab", *DESCRIBE_HEADER], paas_by_subtopic(efforts)),
        "ringkasan-leppink.csv": (
            ["kelas", "kode_siswa", "IL", "EL", "GL"],
            leppink_by_student(efforts),
        ),
        "ringkasan-kuis.csv": (
            [
                "kelas",
                "kode_siswa",
                "banyak_percobaan",
                "skor_pertama",
                "skor_terakhir",
                "skor_terbaik",
            ],
            quiz_by_student(quizzes),
        ),
    }
    for name, (header, rows) in outputs.items():
        write_csv(folder / name, header, rows)
        print(f"\n== {name} ({len(rows)} baris)")
        print("  " + " | ".join(header))
        for row in rows[:15]:
            print("  " + " | ".join(str(v) for v in row))
        if len(rows) > 15:
            print(f"  … {len(rows) - 15} baris lagi di berkas")

    leppink = leppink_by_student(efforts)
    if leppink:
        print("\n== Rata-rata kelas (Leppink, 0–10)")
        for index, dim in enumerate(LEPPINK_DIMENSIONS, start=2):
            values = [row[index] for row in leppink if row[index] != ""]
            print(
                f"  {dim}: "
                + ", ".join(
                    f"{h}={v}" for h, v in zip(DESCRIBE_HEADER, describe(values), strict=True)
                )
            )
    best = [row[5] for row in quiz_by_student(quizzes)]
    if best:
        print(
            "\n== Skor kuis terbaik (%): "
            + ", ".join(f"{h}={v}" for h, v in zip(DESCRIBE_HEADER, describe(best), strict=True))
        )
    print(f"\nBerkas ringkasan disimpan di {folder}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
