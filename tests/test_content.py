"""Tes validator konten: konten asli harus valid, dan kesalahan umum harus tertangkap."""

import copy
import json
from pathlib import Path

import pytest

from tools.validate_content import CONTENT_DIR, validate

# ---------------------------------------------------------------- konten asli


def test_real_content_is_valid() -> None:
    report = validate(CONTENT_DIR)
    assert report.errors == []
    assert "mean-01" in report.lessons and "mean-02" in report.lessons


def test_real_keys_match_worked_examples_and_docs() -> None:
    report = validate(CONTENT_DIR)
    assert report.items["p-mean-02-001"].key() == {"n": 4, "sum": 40, "divide": 10}
    assert report.items["p-mean-02-005"].key()["divide"] == 4.5
    assert report.items["r-mean-004"].key() == {"answer": 80}


def test_every_item_has_a_twin_in_written_subtopics() -> None:
    report = validate(CONTENT_DIR)
    assert not [w for w in report.warnings if "soal kembar" in w]


# ---------------------------------------------------------------- konten buatan untuk uji galat

TOPIC = {
    "id": "mean",
    "title": "Rata-rata",
    "objectives": [{"id": "TP1", "level": "L1", "text": "Makna rata-rata"}],
    "subtopics": [
        {
            "id": "mean-01",
            "title": "Makna",
            "file": "01.json",
            "objectives": ["TP1"],
            "blueprint": {"L1": 1},
        }
    ],
    "items": {"practice": "items/practice.json"},
}

ITEM = {
    "id": "p-1",
    "subtopic": "mean-01",
    "objective": "TP1",
    "level": "L1",
    "type": "stepwise_mean",
    "prompt": "Data 2, 4, 6. Berapa rata-ratanya?",
    "data": [2, 4, 6],
    "steps": ["n", "sum", "divide"],
}
TWIN = {**ITEM, "id": "p-1-k", "twinOf": "p-1", "data": [3, 5, 7]}

STORY = {
    "id": "p-2",
    "subtopic": "mean-01",
    "objective": "TP1",
    "level": "L2",
    "type": "story_mean",
    "prompt": "Pada [[t]] terjual [[a]] dan [[b]] roti. Berapa rata-ratanya?",
    "selectables": {
        "t": {"display": "tanggal 5", "value": 5, "relevant": False, "meaning": "tanggal"},
        "a": {"display": "10", "value": 10, "relevant": True},
        "b": {"display": "20", "value": 20, "relevant": True},
    },
    "steps": ["understand", "select", "n", "sum", "divide", "interpret"],
    "understand": {
        "question": "Apa yang ditanyakan?",
        "options": [
            {"text": "Rata-rata roti terjual", "correct": True, "feedback": "Tepat."},
            {"text": "Tanggal", "correct": False, "feedback": "Belum tepat."},
        ],
    },
    "interpret": {
        "question": "Artinya?",
        "options": [
            {"text": "Sama rata 15", "correct": True, "feedback": "Tepat."},
            {"text": "Selalu 15", "correct": False, "feedback": "Belum tepat."},
        ],
    },
}
STORY_TWIN = {**copy.deepcopy(STORY), "id": "p-2-k", "twinOf": "p-2"}

LESSON = {
    "id": "mean-01",
    "title": "Makna",
    "objectives": ["TP1"],
    "screens": [
        {
            "type": "worked_example",
            "data": [2, 4, 6],
            "steps": [
                {"key": "n", "text": "Ada 3 data.", "value": 3},
                {"key": "sum", "text": "2 + 4 + 6 = 12.", "value": 12},
                {"key": "divide", "text": "12 : 3 = 4.", "value": 4},
            ],
        },
        {"type": "faded_example", "itemRef": "p-1", "givenSteps": ["list", "n"]},
        {"type": "practice", "itemRefs": ["p-2"]},
    ],
}


def write_content(root: Path, items: list, lesson: dict | None = None) -> Path:
    topic_dir = root / "mean"
    (topic_dir / "items").mkdir(parents=True)
    (root / "index.json").write_text(
        json.dumps({"topics": [{"id": "mean", "title": "R", "path": "mean/topic.json"}]}),
        encoding="utf-8",
    )
    (topic_dir / "topic.json").write_text(json.dumps(TOPIC), encoding="utf-8")
    (topic_dir / "items" / "practice.json").write_text(json.dumps(items), encoding="utf-8")
    (topic_dir / "01.json").write_text(json.dumps(lesson or LESSON), encoding="utf-8")
    return root


def errors_for(tmp_path: Path, items: list, lesson: dict | None = None) -> list[str]:
    return validate(write_content(tmp_path, items, lesson)).errors


def test_minimal_valid_content(tmp_path: Path) -> None:
    report = validate(write_content(tmp_path, [ITEM, TWIN, STORY, STORY_TWIN]))
    assert report.errors == []
    assert report.warnings == []
    assert report.items["p-2"].key() == {"n": 2, "sum": 30, "divide": 15}


def test_duplicate_id(tmp_path: Path) -> None:
    errors = errors_for(tmp_path, [ITEM, ITEM, STORY])
    assert any("id soal ganda" in e for e in errors)


def test_twin_must_point_to_existing_item(tmp_path: Path) -> None:
    errors = errors_for(tmp_path, [ITEM, {**TWIN, "twinOf": "tidak-ada"}, STORY])
    assert any("twinOf 'tidak-ada' tidak ada" in e for e in errors)


def test_unknown_field_is_rejected(tmp_path: Path) -> None:
    errors = errors_for(tmp_path, [{**ITEM, "jawaban": 4}, STORY])
    assert any("jawaban" in e for e in errors)


def test_placeholder_without_selectable(tmp_path: Path) -> None:
    bad = copy.deepcopy(STORY)
    bad["prompt"] += " Harga [[h]]."
    errors = errors_for(tmp_path, [ITEM, bad])
    assert any("[[h]] tidak ada di selectables" in e for e in errors)


def test_distractor_needs_meaning(tmp_path: Path) -> None:
    bad = copy.deepcopy(STORY)
    del bad["selectables"]["t"]["meaning"]
    errors = errors_for(tmp_path, [ITEM, bad])
    assert any("wajib punya 'meaning'" in e for e in errors)


def test_interpret_needs_exactly_one_correct(tmp_path: Path) -> None:
    bad = copy.deepcopy(STORY)
    bad["interpret"]["options"][1]["correct"] = True
    errors = errors_for(tmp_path, [ITEM, bad])
    assert any("tepat 1 opsi benar" in e for e in errors)


def test_story_needs_understand_step(tmp_path: Path) -> None:
    bad = copy.deepcopy(STORY)
    bad["steps"] = ["select", "n", "sum", "divide", "interpret"]
    errors = errors_for(tmp_path, [ITEM, bad])
    assert any("wajib punya langkah 'understand'" in e for e in errors)


def test_story_steps_must_be_in_order(tmp_path: Path) -> None:
    bad = copy.deepcopy(STORY)
    bad["steps"] = ["select", "understand", "n", "sum", "divide", "interpret"]
    errors = errors_for(tmp_path, [ITEM, bad])
    assert any("urutan langkah" in e for e in errors)


def test_self_explain_needs_no_twin_and_is_outside_blueprint(tmp_path: Path) -> None:
    explain = {
        "id": "p-se",
        "subtopic": "mean-01",
        "objective": "TP1",
        "level": "L1",
        "type": "self_explain",
        "prompt": "Mengapa dibagi 3?",
        "freeText": True,
    }
    report = validate(write_content(tmp_path, [ITEM, TWIN, STORY, STORY_TWIN, explain]))
    assert report.errors == []
    assert report.warnings == []


def test_self_explain_needs_options_or_free_text(tmp_path: Path) -> None:
    bad = {
        "id": "p-se",
        "subtopic": "mean-01",
        "objective": "TP1",
        "level": "L1",
        "type": "self_explain",
        "prompt": "Mengapa?",
    }
    errors = errors_for(tmp_path, [ITEM, STORY, bad])
    assert any("freeText" in e for e in errors)


def test_real_quiz_bank_covers_blueprint() -> None:
    report = validate(CONTENT_DIR)
    quiz = [i for i in report.items.values() if report.item_kinds[i.id] == "quiz"]
    levels = {level: sum(i.level == level for i in quiz) for level in ("L1", "L2", "L3")}
    assert levels["L1"] > 3 and levels["L2"] > 4 and levels["L3"] > 3


def test_quiz_bank_too_small_is_an_error(tmp_path: Path) -> None:
    write_content(tmp_path, [ITEM, TWIN, STORY, STORY_TWIN])
    topic_path = tmp_path / "mean" / "topic.json"
    topic = json.loads(topic_path.read_text(encoding="utf-8"))
    topic["items"]["quiz"] = "items/quiz.json"
    topic["quizBlueprint"] = {"L1": 3}
    topic_path.write_text(json.dumps(topic), encoding="utf-8")
    quiz_item = {**ITEM, "id": "q-1"}
    (tmp_path / "mean" / "items" / "quiz.json").write_text(
        json.dumps([quiz_item]), encoding="utf-8"
    )
    report = validate(tmp_path)
    assert any("kisi-kisi butuh 3" in e for e in report.errors)
    # Soal kuis tidak dihitung dalam kisi-kisi subbab maupun aturan soal kembar.
    assert not any("q-1" in w for w in report.warnings)


def test_level2_mean_item_needs_interpret(tmp_path: Path) -> None:
    bad = {**ITEM, "level": "L2"}
    errors = errors_for(tmp_path, [bad, STORY])
    assert any("wajib punya langkah Maknai" in e for e in errors)


def test_repeating_decimal_needs_decimals(tmp_path: Path) -> None:
    bad = {**ITEM, "data": [1, 1, 2]}  # 4/3 = 1,333…
    errors = errors_for(tmp_path, [bad, STORY])
    assert any("isi 'decimals'" in e for e in errors)
    assert errors_for(tmp_path / "ok", [{**bad, "decimals": 1}, STORY]) == []


def test_prompt_too_long(tmp_path: Path) -> None:
    bad = {**ITEM, "prompt": "kata " * 61}
    errors = errors_for(tmp_path, [bad, STORY])
    assert any("maks 60" in e for e in errors)


def test_worked_example_wrong_value(tmp_path: Path) -> None:
    lesson = copy.deepcopy(LESSON)
    lesson["screens"][0]["steps"][1]["value"] = 13
    errors = errors_for(tmp_path, [ITEM, STORY], lesson)
    assert any("seharusnya 12" in e for e in errors)


def test_faded_example_must_leave_steps_for_student(tmp_path: Path) -> None:
    lesson = copy.deepcopy(LESSON)
    lesson["screens"][1]["givenSteps"] = ["list", "n", "sum", "divide"]
    errors = errors_for(tmp_path, [ITEM, STORY], lesson)
    assert any("sisakan untuk siswa" in e for e in errors)


def test_practice_ref_must_exist(tmp_path: Path) -> None:
    lesson = copy.deepcopy(LESSON)
    lesson["screens"][2]["itemRefs"] = ["p-999"]
    errors = errors_for(tmp_path, [ITEM, STORY], lesson)
    assert any("'p-999' tidak ada" in e for e in errors)


def test_invalid_json_reports_line(tmp_path: Path) -> None:
    write_content(tmp_path, [ITEM])
    (tmp_path / "mean" / "items" / "practice.json").write_text("[{,}]", encoding="utf-8")
    errors = validate(tmp_path).errors
    assert any("JSON tidak valid" in e for e in errors)


@pytest.mark.parametrize("missing", ["practice", "lesson"])
def test_missing_files_are_reported(tmp_path: Path, missing: str) -> None:
    write_content(tmp_path, [ITEM, STORY])
    target = "items/practice.json" if missing == "practice" else "01.json"
    (tmp_path / "mean" / target).unlink()
    assert any("tidak ditemukan" in e for e in validate(tmp_path).errors)
