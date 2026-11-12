"""Tabel basis data (docs/06 bagian 4.1).

Tidak ada data identitas pribadi: siswa hanya berupa kode. Semua waktu disimpan dalam UTC.
"""

from datetime import UTC, datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime) -> datetime:
    """Ubah waktu dari perangkat ke UTC. Waktu tanpa zona dianggap sudah UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


class Classroom(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)  # mis. "8B-2026"
    name: str
    password_hash: str
    # True = siswa kelas ini melihat skala beban kognitif (mode penelitian, F11)
    research: bool = False
    created_at: datetime = Field(default_factory=utcnow)


class Student(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("classroom_id", "code"),)

    id: int | None = Field(default=None, primary_key=True)
    classroom_id: int = Field(foreign_key="classroom.id", index=True)
    code: str  # mis. "S01" — pemetaan kode ↔ nama disimpan peneliti di luar aplikasi
    first_seen: datetime = Field(default_factory=utcnow)
    last_seen: datetime = Field(default_factory=utcnow)


class Attempt(SQLModel, table=True):
    """Satu kali siswa menekan "Periksa" (atau membuka pembahasan) pada satu langkah soal."""

    id: int | None = Field(default=None, primary_key=True)
    client_id: str = Field(index=True, unique=True)
    student_id: int = Field(foreign_key="student.id", index=True)
    context: str  # lesson / quiz / readiness
    subtopic_id: str | None = None
    item_id: str
    step: str
    answer: str
    is_correct: bool
    error_code: str | None = None
    attempt_no: int
    revealed: bool = False
    duration_ms: int | None = None
    created_at: datetime


class EffortRating(SQLModel, table=True):
    """Skala beban kognitif: Paas (1 butir, 1–9) atau Leppink dkk. (10 butir, 0–10)."""

    id: int | None = Field(default=None, primary_key=True)
    client_id: str = Field(index=True, unique=True)
    student_id: int = Field(foreign_key="student.id", index=True)
    scale: str  # paas / leppink
    subtopic_id: str | None = None
    item_no: int
    dimension: str | None = None  # IL / EL / GL (Leppink)
    value: int
    created_at: datetime


class SelfExplanation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    client_id: str = Field(index=True, unique=True)
    student_id: int = Field(foreign_key="student.id", index=True)
    subtopic_id: str | None = None
    item_id: str
    text: str
    created_at: datetime


class QuizResult(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    client_id: str = Field(index=True, unique=True)
    student_id: int = Field(foreign_key="student.id", index=True)
    points: int
    max_points: int
    percent: int
    item_ids: str  # dipisah koma
    created_at: datetime


class SubtopicProgress(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("student_id", "subtopic_id"),)

    id: int | None = Field(default=None, primary_key=True)
    client_id: str = Field(index=True)
    student_id: int = Field(foreign_key="student.id", index=True)
    subtopic_id: str
    status: str
    updated_at: datetime


class TeacherSession(SQLModel, table=True):
    token: str = Field(primary_key=True)
    classroom_id: int = Field(foreign_key="classroom.id", index=True)
    expires_at: datetime
