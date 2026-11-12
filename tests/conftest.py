from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.admin import create_classroom
from backend.app.config import Settings
from backend.app.main import create_app

TEACHER_PASSWORD = "rahasia-guru-123"


@pytest.fixture
def app(tmp_path: Path):
    """Aplikasi dengan basis data sementara (tidak menyentuh data/rataku.db)."""
    return create_app(Settings(database_path=tmp_path / "test.db"))


@pytest.fixture
def client(app) -> TestClient:
    return TestClient(app)


@pytest.fixture
def classroom(app):
    """Kelas contoh 8B-2026 dengan mode penelitian aktif."""
    with app.state.db.session() as session:
        return create_classroom(session, "8b-2026", "Kelas 8B", TEACHER_PASSWORD, research=True)
