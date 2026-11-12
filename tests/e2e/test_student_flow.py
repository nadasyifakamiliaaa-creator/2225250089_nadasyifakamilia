"""Alur siswa utama di browser: materi, umpan balik, soal cerita, kuis, offline."""

import re

import pytest

from tests.e2e.conftest import assert_clean_text

pytestmark = pytest.mark.e2e


def answer(page, label: str, value: str):
    form = page.locator("form.step-input").filter(has=page.get_by_text(label, exact=True))
    form.locator("input").fill(value)
    form.get_by_role("button", name="Periksa").click()
    return form


def test_every_main_page_renders_cleanly(page, expect) -> None:
    for route in (
        "#/",
        "#/mean",
        "#/mean/kesiapan",
        "#/mean/kuis",
        "#/progres",
        "#/pengaturan",
        *(f"#/mean/0{n}/1" for n in range(1, 7)),
    ):
        page.goto(page.base_url + route)
        expect(page.locator("main h1").first).to_be_visible()
        assert_clean_text(page)


def test_faded_example_feedback_unlocks_next(page, expect) -> None:
    page.goto(page.base_url + "#/mean/02/6")  # contoh-sebagian: n & jumlah diberikan
    next_button = page.get_by_role("button", name="Lanjut", exact=True)
    expect(next_button).to_be_disabled()
    form = answer(page, "Rata-rata", "8")  # 40 : 5 → membagi dengan bilangan yang salah
    expect(form.locator(".feedback-hint")).to_contain_text("bilangan yang salah")
    answer(page, "Rata-rata", "10")
    expect(form.locator(".feedback-success")).to_contain_text("40 dibagi 4 data = 10")
    expect(next_button).to_be_enabled()
    assert_clean_text(page)


def test_story_select_stage(page, expect) -> None:
    page.goto(page.base_url + "#/mean/05/5")
    expect(page.locator(".stage.is-current")).to_contain_text("Pilah")
    for value in ("12", "14", "9", "11", "18"):
        page.locator(".story-text .token", has_text=re.compile(rf"^{value}$")).click()
    select = page.locator("form.select-step")
    select.get_by_role("button", name="Periksa").click()
    expect(select.locator(".feedback-hint")).to_contain_text("nomor absen")
    page.locator(".story-text .token", has_text=re.compile(r"^12$")).click()
    select.get_by_role("button", name="Periksa").click()
    expect(select.locator(".feedback-success")).to_contain_text("14, 9, 11, 18")
    expect(page.locator(".data-table tbody tr")).to_have_count(4)


def test_quiz_submit_with_empty_answers(page, expect) -> None:
    page.goto(page.base_url + "#/mean/kuis")
    page.get_by_role("button", name="Mulai kuis").click()
    for _ in range(9):
        page.get_by_role("button", name="Berikutnya").click()
    page.get_by_role("button", name="Periksa jawaban").click()
    page.get_by_role("button", name="Kumpulkan jawaban").click()
    page.get_by_role("button", name="Ya, kumpulkan").click()
    expect(page.locator(".quiz-score")).to_contain_text("Skormu 0 dari")
    expect(page.locator(".quiz-result")).to_have_count(10)
    assert_clean_text(page)


def test_works_offline_after_first_visit(page, expect) -> None:
    page.goto(page.base_url)
    page.evaluate("navigator.serviceWorker.ready")
    page.reload()
    page.wait_for_function("navigator.serviceWorker.controller !== null")
    page.context.set_offline(True)
    page.goto(page.base_url + "#/mean/04/4")
    expect(page.locator(".frequency-table")).to_be_visible()
    page.goto(page.base_url + "#/mean/kuis")
    expect(page.get_by_role("button", name="Mulai kuis")).to_be_visible()
    page.context.set_offline(False)
