"""API untuk aplikasi siswa: cek kode kelas dan sinkronisasi log belajar (F11)."""

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from backend.app.admin import normalize_code
from backend.app.db import get_session
from backend.app.models import (
    Attempt,
    Classroom,
    EffortRating,
    QuizResult,
    SelfExplanation,
    Student,
    SubtopicProgress,
    as_utc,
    utcnow,
)
from backend.app.schemas import (
    AttemptEvent,
    ClassroomCheck,
    ClassroomInfo,
    EffortEvent,
    ExplainEvent,
    ProgressEvent,
    QuizEvent,
    SyncRequest,
    SyncResponse,
)

router = APIRouter(prefix="/api")

UNKNOWN_CLASS = "Kode kelas tidak dikenal."
TABLE_FOR_EVENT = {
    "attempt": Attempt,
    "effort": EffortRating,
    "explain": SelfExplanation,
    "quiz": QuizResult,
}


def _find_classroom(session: Session, code: str) -> Classroom:
    classroom = session.exec(
        select(Classroom).where(Classroom.code == normalize_code(code))
    ).first()
    if classroom is None:
        raise HTTPException(status_code=404, detail=UNKNOWN_CLASS)
    return classroom


@router.post("/classroom/check", response_model=ClassroomInfo)
def check_classroom(body: ClassroomCheck, session: Session = Depends(get_session)) -> ClassroomInfo:
    """Dipakai saat siswa mengetik kode kelas di Beranda."""
    classroom = _find_classroom(session, body.class_code)
    return ClassroomInfo(code=classroom.code, name=classroom.name, research=classroom.research)


def _student(session: Session, classroom: Classroom, code: str) -> Student:
    code = normalize_code(code)
    student = session.exec(
        select(Student).where(Student.classroom_id == classroom.id, Student.code == code)
    ).first()
    if student is None:
        student = Student(classroom_id=classroom.id, code=code)
    student.last_seen = utcnow()
    session.add(student)
    session.flush()
    return student


def _existing_client_ids(session: Session, body: SyncRequest) -> set[str]:
    existing: set[str] = set()
    for kind, table in TABLE_FOR_EVENT.items():
        ids = [e.client_id for e in body.events if e.type == kind]
        if ids:
            existing |= set(session.exec(select(table.client_id).where(table.client_id.in_(ids))))
    return existing


def _row(event, student_id: int):
    common = {
        "client_id": event.client_id,
        "student_id": student_id,
        "created_at": as_utc(event.created_at),
    }
    if isinstance(event, AttemptEvent):
        return Attempt(
            **common,
            context=event.context,
            subtopic_id=event.subtopic_id,
            item_id=event.item_id,
            step=event.step,
            answer=event.answer,
            is_correct=event.is_correct,
            error_code=event.error_code,
            attempt_no=event.attempt_no,
            revealed=event.revealed,
            duration_ms=event.duration_ms,
        )
    if isinstance(event, EffortEvent):
        return EffortRating(
            **common,
            scale=event.scale,
            subtopic_id=event.subtopic_id,
            item_no=event.item_no,
            dimension=event.dimension,
            value=event.value,
        )
    if isinstance(event, ExplainEvent):
        return SelfExplanation(
            **common, subtopic_id=event.subtopic_id, item_id=event.item_id, text=event.text
        )
    if isinstance(event, QuizEvent):
        return QuizResult(
            **common,
            points=event.points,
            max_points=event.max,
            percent=event.percent,
            item_ids=",".join(event.item_ids),
        )
    raise TypeError(type(event))


def _upsert_progress(session: Session, event: ProgressEvent, student_id: int) -> None:
    row = session.exec(
        select(SubtopicProgress).where(
            SubtopicProgress.student_id == student_id,
            SubtopicProgress.subtopic_id == event.subtopic_id,
        )
    ).first()
    if row is None:
        row = SubtopicProgress(
            client_id=event.client_id,
            student_id=student_id,
            subtopic_id=event.subtopic_id,
            status=event.status,
            updated_at=as_utc(event.created_at),
        )
    elif row.status != "done":  # "selesai" tidak pernah turun lagi menjadi "sedang"
        row.status = event.status
        row.updated_at = as_utc(event.created_at)
    session.add(row)


@router.post("/sync", response_model=SyncResponse)
async def sync(request: Request, session: Session = Depends(get_session)) -> SyncResponse:
    """Terima paket log dari perangkat siswa. Aman dikirim ulang (idempoten)."""
    config = request.app.state.settings
    raw = await request.body()
    if len(raw) > config.max_sync_bytes:
        raise HTTPException(status_code=413, detail="Paket terlalu besar.")
    try:
        body = SyncRequest.model_validate_json(raw)
    except ValueError as error:
        detail = json.loads(error.json(include_url=False)) if hasattr(error, "json") else str(error)
        raise HTTPException(status_code=422, detail=detail) from None
    if len(body.events) > config.max_sync_events:
        raise HTTPException(status_code=422, detail="Terlalu banyak event dalam satu paket.")

    classroom = _find_classroom(session, body.class_code)
    student = _student(session, classroom, body.student_code)
    existing = _existing_client_ids(session, body)

    accepted = duplicates = 0
    seen: set[str] = set()
    for event in body.events:
        if event.client_id in existing or event.client_id in seen:
            duplicates += 1
            continue
        seen.add(event.client_id)
        if isinstance(event, ProgressEvent):
            _upsert_progress(session, event, student.id)
        else:
            session.add(_row(event, student.id))
        accepted += 1
    session.commit()
    return SyncResponse(accepted=accepted, duplicates=duplicates)
