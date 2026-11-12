"""Koneksi SQLite. Basis data baru dibuat saat pertama kali dipakai (bukan saat modul diimpor)."""

from collections.abc import Iterator
from pathlib import Path

from fastapi import Request
from sqlalchemy import Engine, event
from sqlmodel import Session, SQLModel, create_engine

from backend.app import models  # noqa: F401  (mendaftarkan tabel ke SQLModel.metadata)


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._engine: Engine | None = None

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._engine = create_engine(
                f"sqlite:///{self.path.as_posix()}", connect_args={"check_same_thread": False}
            )
            event.listen(self._engine, "connect", _enable_foreign_keys)
            SQLModel.metadata.create_all(self._engine)
        return self._engine

    def session(self) -> Session:
        return Session(self.engine)


def _enable_foreign_keys(connection, _record) -> None:
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_session(request: Request) -> Iterator[Session]:
    """Dependensi FastAPI: satu sesi basis data per permintaan."""
    with request.app.state.db.session() as session:
        yield session
