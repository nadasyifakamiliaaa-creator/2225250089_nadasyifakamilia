"""Tes dasbor guru dan ekspor CSV (F12)."""

import csv
import io

from fastapi.testclient import TestClient

from tests.conftest import TEACHER_PASSWORD
from tests.test_api_sync import NOW, attempt, payload


def login(client: TestClient, password: str = TEACHER_PASSWORD, code: str = "8b-2026"):
    return client.post(
        "/guru/masuk",
        content=f"kode={code}&kata_sandi={password}",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        follow_redirects=False,
    )


def seed(client: TestClient) -> None:
    events = [
        attempt("a0000001"),
        attempt("a0000002", answer="400", isCorrect=True, errorCode=None, attemptNo=2),
        attempt("a0000003", step="n", answer="5", isCorrect=True, errorCode=None),
        {"type": "quiz", "clientId": "q0000001", "createdAt": NOW, "points": 9, "max": 12,
         "percent": 75, "itemIds": ["q-mean-001"]},
        {"type": "progress", "clientId": "p0000001", "createdAt": NOW,
         "subtopicId": "mean-01", "status": "done"},
        {"type": "explain", "clientId": "x0000001", "createdAt": NOW, "itemId": "p-mean-02-se1",
         "text": "Karena datanya ada 5, <b>bukan</b> 4."},
        {"type": "effort", "clientId": "l0000001", "createdAt": NOW, "scale": "leppink",
         "itemNo": 1, "dimension": "IL", "value": 3},
    ]  # fmt: skip
    assert client.post("/api/sync", json=payload(events)).status_code == 200


def test_pages_require_login(client: TestClient, classroom) -> None:
    for path in ("/guru/kelas", "/guru/siswa/S01", "/guru/ekspor/percobaan.csv"):
        response = client.get(path, follow_redirects=False)
        assert response.status_code == 303
        assert response.headers["location"] == "/guru"


def test_login_page_renders(client: TestClient, classroom) -> None:
    response = client.get("/guru")
    assert response.status_code == 200
    assert "Masuk Dasbor Guru" in response.text
    assert "content-security-policy" in response.headers


def test_wrong_password_is_rejected(client: TestClient, classroom) -> None:
    response = login(client, password="salah")
    assert response.status_code == 401
    assert "Kode kelas atau kata sandi salah" in response.text
    assert "rataku_guru" not in response.cookies


def test_login_is_rate_limited(client: TestClient, classroom) -> None:
    for _ in range(5):
        login(client, password="salah")
    assert login(client).status_code == 429  # kata sandi benar pun ditahan sementara


def test_login_sets_secure_session_cookie(client: TestClient, classroom) -> None:
    response = login(client)
    assert response.status_code == 303
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/guru" in cookie


def test_dashboard_shows_class_summary(client: TestClient, classroom) -> None:
    seed(client)
    login(client)
    page = client.get("/guru/kelas")
    assert page.status_code == 200
    assert "Kelas 8B" in page.text and "S01" in page.text
    assert "Salah menjumlahkan data" in page.text  # nama kesalahan, bukan kode
    assert "1 / 6" in page.text  # bagian selesai
    assert "75%" in page.text


def test_student_page_escapes_text(client: TestClient, classroom) -> None:
    seed(client)
    login(client)
    page = client.get("/guru/siswa/s01")
    assert page.status_code == 200
    assert "&lt;b&gt;bukan&lt;/b&gt;" in page.text  # teks siswa tidak dijalankan sebagai HTML
    assert "Intrinsik (IL)" in page.text
    assert client.get("/guru/siswa/S99").status_code == 404


def test_csv_export(client: TestClient, classroom) -> None:
    seed(client)
    login(client)
    response = client.get("/guru/ekspor/percobaan.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert 'filename="rataku-8B-2026-percobaan.csv"' in response.headers["content-disposition"]
    assert response.text.startswith("﻿")  # BOM untuk Excel
    rows = list(csv.DictReader(io.StringIO(response.text.lstrip("﻿"))))
    assert len(rows) == 3
    assert rows[0]["kode_siswa"] == "S01"
    assert rows[0]["waktu_utc"] == "2026-11-20T01:15:00Z"
    assert {r["kode_kesalahan"] for r in rows} == {"E-SUM", ""}
    for kind in ("siswa", "progres", "kuis", "beban-kognitif", "penjelasan"):
        assert client.get(f"/guru/ekspor/{kind}.csv").status_code == 200
    assert client.get("/guru/ekspor/lainnya.csv").status_code == 404


def test_teacher_sees_only_own_class(client: TestClient, app, classroom) -> None:
    from backend.app.admin import create_classroom

    seed(client)
    with app.state.db.session() as session:
        create_classroom(session, "8C-2026", "Kelas 8C", "kata-sandi-8c")
    login(client, password="kata-sandi-8c", code="8C-2026")
    assert "S01" not in client.get("/guru/kelas").text
    assert client.get("/guru/siswa/S01").status_code == 404
    rows = client.get("/guru/ekspor/percobaan.csv").text.strip().splitlines()
    assert len(rows) == 1  # hanya judul kolom


def test_logout_ends_session(client: TestClient, classroom) -> None:
    login(client)
    assert client.get("/guru/kelas").status_code == 200
    client.post("/guru/keluar")
    assert client.get("/guru/kelas", follow_redirects=False).status_code == 303
