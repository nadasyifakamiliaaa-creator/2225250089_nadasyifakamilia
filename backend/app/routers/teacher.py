"""Dasbor guru (F12): masuk, ringkasan kelas, detail siswa, ekspor CSV.

Halaman dibuat di server (Jinja2) tanpa JavaScript, agar sederhana dan aman.
"""

import csv
import io
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from statistics import mean
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from backend.app.admin import normalize_code
from backend.app.config import PROJECT_ROOT
from backend.app.db import get_session
from backend.app.labels import ERROR_NAMES, UNSPECIFIC_CODES, subtopic_titles
from backend.app.models import (
    Attempt,
    Classroom,
    EffortRating,
    QuizResult,
    SelfExplanation,
    Student,
    SubtopicProgress,
    TeacherSession,
    utcnow,
)
from backend.app.security import new_token, verify_password

router = APIRouter(prefix="/guru")
templates = Jinja2Templates(directory=PROJECT_ROOT / "backend" / "app" / "templates")

COOKIE = "rataku_guru"
WIB = timedelta(hours=7)


def _local(value: datetime | None) -> str:
    return (value + WIB).strftime("%d-%m-%Y %H:%M WIB") if value else "-"


templates.env.filters["waktu"] = _local


# ---------------------------------------------------------------- sesi


def _current_classroom(request: Request, session: Session) -> Classroom | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    row = session.get(TeacherSession, token)
    if row is None or row.expires_at < utcnow():
        return None
    return session.get(Classroom, row.classroom_id)


def _secure_cookie(request: Request) -> bool:
    setting = request.app.state.settings.cookie_secure
    if setting in ("true", "false"):
        return setting == "true"
    return request.url.scheme == "https"


def _to_login() -> RedirectResponse:
    return RedirectResponse("/guru", status_code=303)


@router.get("", response_class=HTMLResponse)
def login_page(request: Request, session: Session = Depends(get_session)):
    if _current_classroom(request, session):
        return RedirectResponse("/guru/kelas", status_code=303)
    return templates.TemplateResponse(request, "login.html", {"error": None, "code": ""})


@router.post("/masuk", response_class=HTMLResponse)
async def login(request: Request, session: Session = Depends(get_session)):
    form = parse_qs((await request.body()).decode("utf-8", errors="replace"))
    code = normalize_code(form.get("kode", [""])[0])
    password = form.get("kata_sandi", [""])[0]
    client = request.client.host if request.client else "?"

    if not request.app.state.login_limiter.allow(client):
        error = "Terlalu banyak percobaan. Tunggu satu menit, lalu coba lagi."
        return templates.TemplateResponse(
            request, "login.html", {"error": error, "code": code}, status_code=429
        )

    classroom = session.exec(select(Classroom).where(Classroom.code == code)).first()
    if classroom is None or not verify_password(password, classroom.password_hash):
        return templates.TemplateResponse(
            request,
            "login.html",
            {"error": "Kode kelas atau kata sandi salah.", "code": code},
            status_code=401,
        )

    hours = request.app.state.settings.teacher_session_hours
    token = new_token()
    session.add(
        TeacherSession(
            token=token, classroom_id=classroom.id, expires_at=utcnow() + timedelta(hours=hours)
        )
    )
    session.commit()
    response = RedirectResponse("/guru/kelas", status_code=303)
    response.set_cookie(
        COOKIE,
        token,
        max_age=hours * 3600,
        httponly=True,
        samesite="lax",
        secure=_secure_cookie(request),
        path="/guru",
    )
    return response


@router.post("/keluar")
def logout(request: Request, session: Session = Depends(get_session)):
    token = request.cookies.get(COOKIE)
    if token and (row := session.get(TeacherSession, token)):
        session.delete(row)
        session.commit()
    response = _to_login()
    response.delete_cookie(COOKIE, path="/guru")
    return response


# ---------------------------------------------------------------- ringkasan data


@dataclass
class StudentSummary:
    student: Student
    done: int = 0
    attempts: int = 0
    first_try_correct: int = 0
    first_try_total: int = 0
    best_quiz: int | None = None
    last_quiz: int | None = None
    errors: Counter = field(default_factory=Counter)

    @property
    def first_try_percent(self) -> int | None:
        if not self.first_try_total:
            return None
        return round(self.first_try_correct / self.first_try_total * 100)

    @property
    def top_error(self) -> str | None:
        return self.errors.most_common(1)[0][0] if self.errors else None


def _students(session: Session, classroom: Classroom) -> list[Student]:
    return list(
        session.exec(
            select(Student).where(Student.classroom_id == classroom.id).order_by(Student.code)
        )
    )


def _rows(session: Session, table, student_ids: list[int]):
    if not student_ids:
        return []
    return list(session.exec(select(table).where(table.student_id.in_(student_ids))))


def _summaries(session: Session, students: list[Student]) -> list[StudentSummary]:
    by_id = {s.id: StudentSummary(student=s) for s in students}
    ids = list(by_id)
    for row in _rows(session, SubtopicProgress, ids):
        if row.status == "done":
            by_id[row.student_id].done += 1
    for row in _rows(session, Attempt, ids):
        summary = by_id[row.student_id]
        summary.attempts += 1
        if row.context == "lesson" and row.attempt_no == 1 and not row.revealed:
            summary.first_try_total += 1
            summary.first_try_correct += row.is_correct
        if row.error_code and row.error_code not in UNSPECIFIC_CODES:
            summary.errors[row.error_code] += 1
    quizzes = sorted(_rows(session, QuizResult, ids), key=lambda q: q.created_at)
    for row in quizzes:
        summary = by_id[row.student_id]
        summary.last_quiz = row.percent
        summary.best_quiz = max(summary.best_quiz or 0, row.percent)
    return list(by_id.values())


@router.get("/kelas", response_class=HTMLResponse)
def classroom_page(request: Request, session: Session = Depends(get_session)):
    classroom = _current_classroom(request, session)
    if classroom is None:
        return _to_login()
    summaries = _summaries(session, _students(session, classroom))
    class_errors = Counter()
    for summary in summaries:
        class_errors.update(summary.errors)
    best = [s.best_quiz for s in summaries if s.best_quiz is not None]
    return templates.TemplateResponse(
        request,
        "kelas.html",
        {
            "classroom": classroom,
            "summaries": summaries,
            "top_errors": class_errors.most_common(3),
            "error_names": ERROR_NAMES,
            "subtopic_count": len(subtopic_titles(request.app.state.settings.frontend_dir)),
            "average_best_quiz": round(mean(best)) if best else None,
            "exports": EXPORTS,
        },
    )


@router.get("/siswa/{code}", response_class=HTMLResponse)
def student_page(code: str, request: Request, session: Session = Depends(get_session)):
    classroom = _current_classroom(request, session)
    if classroom is None:
        return _to_login()
    student = session.exec(
        select(Student).where(
            Student.classroom_id == classroom.id, Student.code == normalize_code(code)
        )
    ).first()
    if student is None:
        return templates.TemplateResponse(
            request, "pesan.html", {"message": "Siswa tidak ditemukan."}, status_code=404
        )

    titles = subtopic_titles(request.app.state.settings.frontend_dir)
    progress = {row.subtopic_id: row for row in _rows(session, SubtopicProgress, [student.id])}
    summary = _summaries(session, [student])[0]
    efforts = _rows(session, EffortRating, [student.id])
    paas = {row.subtopic_id: row.value for row in efforts if row.scale == "paas"}
    leppink = defaultdict(list)
    for row in efforts:
        if row.scale == "leppink" and row.dimension:
            leppink[row.dimension].append(row.value)
    return templates.TemplateResponse(
        request,
        "siswa.html",
        {
            "classroom": classroom,
            "student": student,
            "summary": summary,
            "subtopics": [
                (sid, title, progress.get(sid), paas.get(sid)) for sid, title in titles.items()
            ],
            "error_names": ERROR_NAMES,
            "errors": summary.errors.most_common(),
            "quizzes": sorted(_rows(session, QuizResult, [student.id]), key=lambda q: q.created_at),
            "leppink": {dim: round(mean(values), 1) for dim, values in sorted(leppink.items())},
            "explanations": sorted(
                _rows(session, SelfExplanation, [student.id]), key=lambda e: e.created_at
            ),
        },
    )


# ---------------------------------------------------------------- ekspor CSV (data penelitian)


def _iso(value: datetime | None) -> str:
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ") if value else ""


EXPORTS = {
    "siswa": "Daftar siswa",
    "percobaan": "Log percobaan jawaban",
    "progres": "Progres subbab",
    "kuis": "Hasil kuis",
    "beban-kognitif": "Skala beban kognitif",
    "penjelasan": "Penjelasan siswa",
}


def _export_rows(kind: str, session: Session, classroom: Classroom):
    students = _students(session, classroom)
    code_of = {s.id: s.code for s in students}
    ids = list(code_of)
    if kind == "siswa":
        header = ["kelas", "kode_siswa", "pertama_aktif_utc", "terakhir_aktif_utc"]
        rows = [[classroom.code, s.code, _iso(s.first_seen), _iso(s.last_seen)] for s in students]
    elif kind == "percobaan":
        header = [
            "kelas", "kode_siswa", "waktu_utc", "konteks", "subbab", "soal", "langkah",
            "jawaban", "benar", "kode_kesalahan", "percobaan_ke", "lihat_pembahasan", "durasi_ms",
        ]  # fmt: skip
        rows = [
            [
                classroom.code,
                code_of[r.student_id],
                _iso(r.created_at),
                r.context,
                r.subtopic_id or "",
                r.item_id,
                r.step,
                r.answer,
                int(r.is_correct),
                r.error_code or "",
                r.attempt_no,
                int(r.revealed),
                "" if r.duration_ms is None else r.duration_ms,
            ]  # fmt: skip
            for r in sorted(_rows(session, Attempt, ids), key=lambda r: r.created_at)
        ]
    elif kind == "progres":
        header = ["kelas", "kode_siswa", "subbab", "status", "waktu_utc"]
        rows = [
            [classroom.code, code_of[r.student_id], r.subtopic_id, r.status, _iso(r.updated_at)]
            for r in _rows(session, SubtopicProgress, ids)
        ]
    elif kind == "kuis":
        header = ["kelas", "kode_siswa", "waktu_utc", "poin", "poin_maksimal", "persen", "soal"]
        rows = [
            [
                classroom.code,
                code_of[r.student_id],
                _iso(r.created_at),
                r.points,
                r.max_points,
                r.percent,
                r.item_ids,
            ]  # fmt: skip
            for r in sorted(_rows(session, QuizResult, ids), key=lambda r: r.created_at)
        ]
    elif kind == "beban-kognitif":
        header = [
            "kelas",
            "kode_siswa",
            "waktu_utc",
            "skala",
            "subbab",
            "butir",
            "dimensi",
            "nilai",
        ]
        rows = [
            [
                classroom.code,
                code_of[r.student_id],
                _iso(r.created_at),
                r.scale,
                r.subtopic_id or "",
                r.item_no,
                r.dimension or "",
                r.value,
            ]  # fmt: skip
            for r in sorted(_rows(session, EffortRating, ids), key=lambda r: r.created_at)
        ]
    else:  # penjelasan
        header = ["kelas", "kode_siswa", "waktu_utc", "subbab", "soal", "penjelasan"]
        rows = [
            [
                classroom.code,
                code_of[r.student_id],
                _iso(r.created_at),
                r.subtopic_id or "",
                r.item_id,
                r.text,
            ]  # fmt: skip
            for r in sorted(_rows(session, SelfExplanation, ids), key=lambda r: r.created_at)
        ]
    return header, rows


@router.get("/ekspor/{kind}.csv")
def export_csv(kind: str, request: Request, session: Session = Depends(get_session)):
    classroom = _current_classroom(request, session)
    if classroom is None:
        return _to_login()
    if kind not in EXPORTS:
        return Response("Jenis ekspor tidak dikenal.", status_code=404)
    header, rows = _export_rows(kind, session, classroom)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    filename = f"rataku-{classroom.code}-{kind}.csv"
    # BOM UTF-8 agar Microsoft Excel membaca huruf dan simbol dengan benar.
    return Response(
        "﻿" + buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
