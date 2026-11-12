"""Alur penelitian: kode kelas → log belajar → sinkronisasi → dasbor guru & ekspor CSV."""

import pytest
from sqlmodel import select

from backend.app.models import Attempt, EffortRating, Student, SubtopicProgress
from tests.e2e.conftest import CLASS_CODE, TEACHER_PASSWORD, assert_clean_text, wait_until

pytestmark = pytest.mark.e2e

OUTBOX_COUNT = """
() => new Promise((resolve) => {
  const request = indexedDB.open('rataku');
  request.onsuccess = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('outbox')) return resolve(0);
    const count = db.transaction('outbox').objectStore('outbox').count();
    count.onsuccess = () => resolve(count.result);
  };
  request.onerror = () => resolve(-1);
})
"""


def join_class(page, class_code: str, student_code: str, *, expect_ok: bool = True) -> None:
    page.goto(page.base_url)
    page.get_by_label("Kode dari guru").fill(class_code)
    page.get_by_label("Kode siswa").fill(student_code)
    page.get_by_role("button", name="Mulai Belajar").click()
    if expect_ok:  # tunggu pengecekan kode kelas ke server selesai
        page.wait_for_url(page.base_url + "#/mean")


def db_rows(live_app, table, **filters):
    with live_app.app.state.db.session() as session:
        query = select(table)
        for name, value in filters.items():
            query = query.where(getattr(table, name) == value)
        return list(session.exec(query))


def student_id(live_app, code: str) -> int | None:
    rows = db_rows(live_app, Student, code=code)
    return rows[0].id if rows else None


def test_unknown_class_code_is_explained(page, expect) -> None:
    page.expected_errors.append("status of 404")  # server menjawab "kode kelas tidak dikenal"
    join_class(page, "XX-99", "S1", expect_ok=False)
    expect(page.get_by_text("Kode kelas tidak ditemukan")).to_be_visible()
    expect(page).to_have_url(page.base_url)


def test_student_code_is_required_with_class_code(page, expect) -> None:
    page.goto(page.base_url)
    page.get_by_label("Kode dari guru").fill(CLASS_CODE)
    page.get_by_role("button", name="Mulai Belajar").click()
    expect(page.get_by_text("Isi juga kode siswa")).to_be_visible()


def test_without_class_code_nothing_is_logged(page, expect) -> None:
    page.goto(page.base_url)
    page.get_by_role("button", name="Mulai Belajar").click()
    page.goto(page.base_url + "#/mean/01/5")
    form = page.locator("form.step-input").last
    form.locator("input").fill("5")
    form.get_by_role("button", name="Periksa").click()
    expect(form.locator(".feedback-success")).to_be_visible()
    assert page.evaluate(OUTBOX_COUNT) == 0
    expect(page.get_by_text("Terhubung ke kelas")).to_have_count(0)


def test_logs_reach_teacher_dashboard(page, browser, live_app, expect) -> None:
    join_class(page, CLASS_CODE.lower(), "s07")
    expect(page).to_have_url(page.base_url + "#/mean")

    # Satu soal: salah (20 : 5 = 4) lalu benar → dua percobaan tercatat.
    page.goto(page.base_url + "#/mean/01/5")
    form = page.locator("form.step-input").last
    for value in ("4", "5"):
        form.locator("input").fill(value)
        form.get_by_role("button", name="Periksa").click()
    expect(form.locator(".feedback-success")).to_be_visible()

    # Layar selesai: skala usaha mental (kelas mode penelitian).
    page.goto(page.base_url + "#/mean/01/selesai")
    expect(page.get_by_role("heading", name="Sebelum lanjut")).to_be_visible()
    page.locator(".scale-option", has_text="Sedang").click()
    page.get_by_role("button", name="Simpan").click()
    expect(page.get_by_text("Terima kasih sudah menjawab.")).to_be_visible()
    assert_clean_text(page)

    # Data sampai di server (sinkronisasi otomatis).
    wait_until(lambda: student_id(live_app, "S07") is not None)
    sid = student_id(live_app, "S07")
    wait_until(lambda: len(db_rows(live_app, EffortRating, student_id=sid)) == 1)
    attempts = sorted(db_rows(live_app, Attempt, student_id=sid), key=lambda a: a.attempt_no)
    assert [(a.answer, a.is_correct, a.error_code) for a in attempts] == [
        ("4", False, "E-DIV-N1"),
        ("5", True, None),
    ]
    assert all(a.duration_ms is not None and a.duration_ms >= 0 for a in attempts)
    assert db_rows(live_app, EffortRating, student_id=sid)[0].value == 5
    statuses = {
        p.subtopic_id: p.status for p in db_rows(live_app, SubtopicProgress, student_id=sid)
    }
    assert statuses["mean-01"] == "done"
    assert page.evaluate(OUTBOX_COUNT) == 0

    page.goto(page.base_url + "#/progres")
    expect(page.get_by_text("Terhubung ke kelas E2E-KELAS sebagai S07.")).to_be_visible()
    expect(page.get_by_text("Semua catatan belajar sudah terkirim.")).to_be_visible()

    # Dasbor guru di perangkat lain.
    teacher = browser.new_context().new_page()
    teacher.goto(page.base_url + "guru")
    teacher.get_by_label("Kode kelas").fill(CLASS_CODE)
    teacher.get_by_label("Kata sandi").fill(TEACHER_PASSWORD)
    teacher.get_by_role("button", name="Masuk").click()
    expect(teacher.get_by_role("heading", name="Kelas Uji")).to_be_visible()
    expect(teacher.get_by_role("link", name="S07")).to_be_visible()
    expect(teacher.locator("main")).to_contain_text("Membagi dengan bilangan yang salah")
    teacher.get_by_role("link", name="S07").click()
    expect(teacher.locator("main")).to_contain_text("Apa itu Rata-rata?")
    csv_text = teacher.context.request.get(page.base_url + "guru/ekspor/percobaan.csv").text()
    assert "S07" in csv_text and "E-DIV-N1" in csv_text
    teacher.context.close()


def test_questionnaire_after_quiz(page, live_app, expect) -> None:
    join_class(page, CLASS_CODE, "S08")
    page.goto(page.base_url + "#/kuesioner")
    scales = page.locator("fieldset.rating-scale")
    expect(scales).to_have_count(10)
    scales.nth(0).locator(".scale-option", has_text="3").first.click()
    page.get_by_role("button", name="Kirim jawaban").click()
    expect(page.get_by_text("nomor 2, 3, 4, 5, 6, 7, 8, 9, 10")).to_be_visible()
    for index in range(1, 10):
        scales.nth(index).locator(".scale-option").nth(5).click()
    page.get_by_role("button", name="Kirim jawaban").click()
    expect(page.get_by_text("Jawabanmu sangat membantu")).to_be_visible()

    wait_until(lambda: student_id(live_app, "S08") is not None)
    sid = student_id(live_app, "S08")
    wait_until(lambda: len(db_rows(live_app, EffortRating, student_id=sid)) == 10)
    ratings = {
        r.item_no: (r.dimension, r.value) for r in db_rows(live_app, EffortRating, student_id=sid)
    }
    assert ratings[1] == ("IL", 3) and ratings[4] == ("EL", 5) and ratings[10] == ("GL", 5)

    page.goto(page.base_url + "#/mean")  # pindah dulu: hash yang sama tidak memicu render ulang
    page.goto(page.base_url + "#/kuesioner")
    expect(page.get_by_text("Kamu sudah mengisi kuesioner ini")).to_be_visible()
