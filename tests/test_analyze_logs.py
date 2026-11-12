"""Tes skrip ringkasan data penelitian, memakai CSV hasil ekspor dasbor guru sungguhan."""

import csv
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from tests.test_api_sync import NOW, attempt, payload
from tests.test_teacher import login
from tools import analyze_logs


def export_all(client: TestClient, folder: Path) -> None:
    for kind in ("percobaan", "beban-kognitif", "kuis"):
        (folder / f"rataku-8B-2026-{kind}.csv").write_text(
            client.get(f"/guru/ekspor/{kind}.csv").text, encoding="utf-8"
        )


def read(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def test_summaries_from_real_export(
    client: TestClient, classroom, tmp_path: Path, monkeypatch
) -> None:
    leppink = [
        {"type": "effort", "clientId": f"l000000{n}", "createdAt": NOW, "scale": "leppink",
         "itemNo": n, "dimension": dim, "value": value}
        for n, dim, value in [(1, "IL", 2), (2, "IL", 4), (4, "EL", 1), (7, "GL", 8), (8, "GL", 9)]
    ]  # fmt: skip
    events = [
        attempt("a0000001"),  # salah percobaan 1, E-SUM
        attempt("a0000002", isCorrect=True, errorCode=None, attemptNo=2),
        attempt("a0000003", step="n", isCorrect=True, errorCode=None),  # benar percobaan 1
        {"type": "effort", "clientId": "p0000001", "createdAt": NOW, "scale": "paas",
         "subtopicId": "mean-02", "itemNo": 1, "value": 6},
        {"type": "quiz", "clientId": "q0000001", "createdAt": "2026-11-20T08:00:00+07:00",
         "points": 6, "max": 12, "percent": 50, "itemIds": ["q-mean-001"]},
        {"type": "quiz", "clientId": "q0000002", "createdAt": "2026-11-21T08:00:00+07:00",
         "points": 9, "max": 12, "percent": 75, "itemIds": ["q-mean-002"]},
        *leppink,
    ]  # fmt: skip
    client.post("/api/sync", json=payload(events))
    login(client)
    export_all(client, tmp_path)

    monkeypatch.setattr(sys, "argv", ["analyze_logs.py", str(tmp_path)])
    assert analyze_logs.main() == 0

    accuracy = {(r["subbab"], r["langkah"]): r for r in read(tmp_path / "ringkasan-ketepatan.csv")}
    assert accuracy[("mean-02", "sum")]["persen"] == "0.0"
    assert accuracy[("mean-02", "n")]["persen"] == "100.0"
    assert read(tmp_path / "ringkasan-kesalahan.csv")[0]["kode_kesalahan"] == "E-SUM"
    assert read(tmp_path / "ringkasan-paas.csv")[0]["rata_rata"] == "6.0"
    student = read(tmp_path / "ringkasan-leppink.csv")[0]
    assert (student["IL"], student["EL"], student["GL"]) == ("3.0", "1.0", "8.5")
    quiz = read(tmp_path / "ringkasan-kuis.csv")[0]
    assert (quiz["skor_pertama"], quiz["skor_terakhir"], quiz["skor_terbaik"]) == ("50", "75", "75")


def test_missing_folder(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(sys, "argv", ["analyze_logs.py", str(tmp_path / "tidak-ada")])
    assert analyze_logs.main() == 1
