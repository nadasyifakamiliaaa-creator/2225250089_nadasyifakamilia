"""Tes API sinkronisasi log belajar (F11)."""

import json

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from backend.app.admin import create_classroom
from backend.app.models import (
    Attempt,
    EffortRating,
    QuizResult,
    SelfExplanation,
    Student,
    SubtopicProgress,
)
from backend.app.security import hash_password, verify_password

NOW = "2026-11-20T08:15:00+07:00"


def attempt(client_id: str, **extra) -> dict:
    return {
        "type": "attempt",
        "clientId": client_id,
        "createdAt": NOW,
        "context": "lesson",
        "subtopicId": "mean-02",
        "itemId": "p-mean-02-001",
        "step": "sum",
        "answer": "40",
        "isCorrect": False,
        "errorCode": "E-SUM",
        "attemptNo": 1,
        "revealed": False,
        "durationMs": 15400,
        **extra,
    }


def payload(events: list[dict], student: str = "s01", class_code: str = "8B-2026") -> dict:
    return {"classCode": class_code, "studentCode": student, "events": events}


def test_classroom_check(client: TestClient, classroom) -> None:
    response = client.post("/api/classroom/check", json={"classCode": "8b-2026"})
    assert response.status_code == 200
    assert response.json() == {"code": "8B-2026", "name": "Kelas 8B", "research": True}
    assert client.post("/api/classroom/check", json={"classCode": "XX-1"}).status_code == 404


def test_sync_stores_every_event_type(client: TestClient, app, classroom) -> None:
    events = [
        attempt("a1b2c3d4-0001"),
        attempt("a1b2c3d4-0002", answer="400", isCorrect=True, errorCode=None, attemptNo=2),
        {"type": "effort", "clientId": "a1b2c3d4-0003", "createdAt": NOW, "scale": "paas",
         "subtopicId": "mean-02", "itemNo": 1, "value": 4},
        {"type": "explain", "clientId": "a1b2c3d4-0004", "createdAt": NOW,
         "subtopicId": "mean-02", "itemId": "p-mean-02-se1", "text": "Karena ada 5 nilai."},
        {"type": "quiz", "clientId": "a1b2c3d4-0005", "createdAt": NOW, "points": 10, "max": 12,
         "percent": 83, "itemIds": ["q-mean-001", "q-mean-002"]},
        {"type": "progress", "clientId": "a1b2c3d4-0006", "createdAt": NOW,
         "subtopicId": "mean-02", "status": "done"},
    ]  # fmt: skip
    response = client.post("/api/sync", json=payload(events))
    assert response.status_code == 200
    assert response.json() == {"accepted": 6, "duplicates": 0}

    with app.state.db.session() as session:
        student = session.exec(select(Student)).one()
        assert student.code == "S01"  # dinormalkan ke huruf besar
        attempts = session.exec(select(Attempt).order_by(Attempt.attempt_no)).all()
        assert [a.error_code for a in attempts] == ["E-SUM", None]
        assert attempts[0].created_at.hour == 1  # 08:15 WIB → 01:15 UTC
        assert session.exec(select(EffortRating)).one().value == 4
        assert session.exec(select(SelfExplanation)).one().text == "Karena ada 5 nilai."
        assert session.exec(select(QuizResult)).one().item_ids == "q-mean-001,q-mean-002"
        assert session.exec(select(SubtopicProgress)).one().status == "done"


def test_sync_is_idempotent(client: TestClient, app, classroom) -> None:
    events = [attempt("a1b2c3d4-0001"), attempt("a1b2c3d4-0002")]
    assert client.post("/api/sync", json=payload(events)).json() == {"accepted": 2, "duplicates": 0}
    # Kirim ulang (mis. koneksi putus sebelum perangkat menerima jawaban) + satu event baru.
    events.append(attempt("a1b2c3d4-0003"))
    assert client.post("/api/sync", json=payload(events)).json() == {"accepted": 1, "duplicates": 2}
    with app.state.db.session() as session:
        assert len(session.exec(select(Attempt)).all()) == 3


def test_progress_done_never_goes_back(client: TestClient, app, classroom) -> None:
    done = {"type": "progress", "clientId": "p0000001", "createdAt": NOW,
            "subtopicId": "mean-01", "status": "done"}  # fmt: skip
    started = {**done, "clientId": "p0000002", "status": "started"}
    client.post("/api/sync", json=payload([done]))
    client.post("/api/sync", json=payload([started]))
    with app.state.db.session() as session:
        assert session.exec(select(SubtopicProgress)).one().status == "done"


def test_students_are_separated_per_classroom(client: TestClient, app, classroom) -> None:
    with app.state.db.session() as session:
        create_classroom(session, "8C-2026", "Kelas 8C", "kata-sandi-8c")
    client.post("/api/sync", json=payload([attempt("c1000001")]))
    client.post("/api/sync", json=payload([attempt("c1000002")], class_code="8C-2026"))
    with app.state.db.session() as session:
        assert len(session.exec(select(Student)).all()) == 2


def test_unknown_class_is_rejected(client: TestClient, classroom) -> None:
    response = client.post("/api/sync", json=payload([attempt("a1b2c3d4")], class_code="9Z-0000"))
    assert response.status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        payload([attempt("a1b2c3d4")], student="S 01"),  # spasi tidak boleh
        payload([attempt("pendek")]),  # clientId terlalu pendek
        payload([attempt("a1b2c3d4", attemptNo=0)]),
        payload([{**attempt("a1b2c3d4"), "nama": "Budi"}]),  # kolom tak dikenal (data pribadi)
        payload(
            [
                {
                    "type": "effort",
                    "clientId": "a1b2c3d4",
                    "createdAt": NOW,
                    "scale": "paas",
                    "itemNo": 1,
                    "value": 11,
                }
            ]
        ),  # nilai di luar skala
    ],  # fmt: skip
)
def test_invalid_payload_is_rejected(client: TestClient, classroom, body) -> None:
    assert client.post("/api/sync", json=body).status_code == 422


def test_oversized_payload_is_rejected(client: TestClient, classroom) -> None:
    text = "x" * 1000
    events = [
        {"type": "explain", "clientId": f"e{i:07d}", "createdAt": NOW, "itemId": "a", "text": text}
        for i in range(300)
    ]
    response = client.post(
        "/api/sync",
        content=json.dumps(payload(events)),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_password_hashing() -> None:
    stored = hash_password("rahasia-123")
    assert stored.startswith("scrypt$")
    assert verify_password("rahasia-123", stored)
    assert not verify_password("salah", stored)
    assert not verify_password("rahasia-123", "bukan-format")
    assert hash_password("rahasia-123") != stored  # garam berbeda


def test_create_classroom_validation(app) -> None:
    with app.state.db.session() as session:
        with pytest.raises(ValueError, match="minimal"):
            create_classroom(session, "8D-2026", "Kelas 8D", "pendek")
        with pytest.raises(ValueError, match="Kode kelas"):
            create_classroom(session, "8 D", "Kelas 8D", "kata-sandi-panjang")
        create_classroom(session, "8D-2026", "Kelas 8D", "kata-sandi-panjang")
        with pytest.raises(ValueError, match="sudah ada"):
            create_classroom(session, "8d-2026", "Lagi", "kata-sandi-panjang")
