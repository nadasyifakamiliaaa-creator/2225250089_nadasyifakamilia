"""Validasi semua konten JSON di frontend/content/ (docs/04 bagian 4).

Jalankan: python tools/validate_content.py          (ringkas)
          python tools/validate_content.py --keys   (tampilkan kunci jawaban tiap soal)

Keluar dengan kode 1 bila ada GALAT. PERINGATAN tidak menggagalkan validasi.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parent))

from content_schema import (  # noqa: E402
    MEAN_TYPES,
    ConceptScreen,
    ContentIndex,
    ContextScreen,
    EqualShareScreen,
    FadedExampleScreen,
    Item,
    ItemBase,
    Lesson,
    PracticeScreen,
    SelfExplainItem,
    Topic,
    WorkedExampleScreen,
)

CONTENT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "content"

MAX_PROMPT_WORDS = 60
MAX_CONCEPT_WORDS = 40
MAX_CONTEXT_WORDS = 60
MAX_STEP_WORDS = 40

# Nilai khusus untuk soal cek kesiapan (bukan bagian dari subbab/TP materi).
READINESS_SUBTOPIC = "kesiapan"
READINESS_OBJECTIVE = "prasyarat"

ITEMS_ADAPTER = TypeAdapter(list[Item])


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    items: dict[str, ItemBase] = field(default_factory=dict)
    item_kinds: dict[str, str] = field(default_factory=dict)  # readiness/practice/quiz
    lessons: dict[str, Lesson] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not self.errors


def _words(text: str) -> int:
    return len(text.split())


def _load_json(path: Path, report: Report) -> object | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        report.errors.append(f"{path.name}: berkas tidak ditemukan ({path})")
    except json.JSONDecodeError as exc:
        report.errors.append(f"{path.name}: JSON tidak valid — baris {exc.lineno}: {exc.msg}")
    return None


def _format_validation(path: Path, exc: ValidationError) -> list[str]:
    messages = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"])
        messages.append(f"{path.name}: [{location}] {error['msg']}")
    return messages


def _parse(model, data: object, path: Path, report: Report):
    try:
        if isinstance(model, TypeAdapter):
            return model.validate_python(data)
        return model.model_validate(data)
    except ValidationError as exc:
        report.errors.extend(_format_validation(path, exc))
        return None


def validate(content_dir: Path = CONTENT_DIR) -> Report:
    report = Report()
    index_path = content_dir / "index.json"
    raw_index = _load_json(index_path, report)
    if raw_index is None:
        return report
    index = _parse(ContentIndex, raw_index, index_path, report)
    if index is None:
        return report

    for topic_ref in index.topics:
        topic_path = content_dir / topic_ref.path
        raw_topic = _load_json(topic_path, report)
        topic = _parse(Topic, raw_topic, topic_path, report) if raw_topic is not None else None
        if topic is None:
            continue
        if topic.id != topic_ref.id:
            report.errors.append(f"{topic_path.name}: id '{topic.id}' ≠ '{topic_ref.id}' di index")
        _validate_topic(topic, topic_path.parent, report)
    return report


def _validate_topic(topic: Topic, topic_dir: Path, report: Report) -> None:
    objective_ids = {objective.id for objective in topic.objectives}
    subtopic_ids = {subtopic.id for subtopic in topic.subtopics}

    for subtopic in topic.subtopics:
        unknown = set(subtopic.objectives) - objective_ids
        if unknown:
            report.errors.append(
                f"topic.json: subbab {subtopic.id} memakai TP tak dikenal {unknown}"
            )

    # ---- Butir soal
    item_files = {
        name: getattr(topic.items, name)
        for name in ("readiness", "practice", "quiz")
        if getattr(topic.items, name)
    }
    for kind, relative in item_files.items():
        path = topic_dir / relative
        raw = _load_json(path, report)
        items = _parse(ITEMS_ADAPTER, raw, path, report) if raw is not None else None
        for item in items or []:
            if item.id in report.items:
                report.errors.append(f"{path.name}: id soal ganda '{item.id}'")
                continue
            report.items[item.id] = item
            report.item_kinds[item.id] = kind
            _validate_item(item, kind, path.name, subtopic_ids, objective_ids, report)

    for item in report.items.values():
        if item.twin_of is None:
            continue
        original = report.items.get(item.twin_of)
        if original is None:
            report.errors.append(f"{item.id}: twinOf '{item.twin_of}' tidak ada")
        elif original.twin_of is not None:
            report.errors.append(f"{item.id}: twinOf harus merujuk soal asli, bukan soal kembar")
        elif type(original) is not type(item):
            report.errors.append(f"{item.id}: tipe soal kembar harus sama dengan '{original.id}'")

    # ---- Layar materi
    for subtopic in topic.subtopics:
        if subtopic.file is None:
            report.warnings.append(f"subbab {subtopic.id} ({subtopic.title}) belum ditulis")
            continue
        path = topic_dir / subtopic.file
        raw = _load_json(path, report)
        lesson = _parse(Lesson, raw, path, report) if raw is not None else None
        if lesson is None:
            continue
        report.lessons[lesson.id] = lesson
        if lesson.id != subtopic.id:
            report.errors.append(f"{path.name}: id '{lesson.id}' ≠ subbab '{subtopic.id}'")
        unknown = set(lesson.objectives) - objective_ids
        if unknown:
            report.errors.append(f"{path.name}: TP tak dikenal {unknown}")
        _validate_screens(lesson, path.name, report)

    _check_blueprint(topic, report)
    _check_quiz_bank(topic, report)


def _validate_item(
    item: ItemBase,
    kind: str,
    filename: str,
    subtopic_ids: set[str],
    objective_ids: set[str],
    report: Report,
) -> None:
    where = f"{filename}: {item.id}"
    if kind == "readiness":
        if item.subtopic != READINESS_SUBTOPIC or item.objective != READINESS_OBJECTIVE:
            report.errors.append(
                f"{where}: soal kesiapan memakai subtopic '{READINESS_SUBTOPIC}' "
                f"dan objective '{READINESS_OBJECTIVE}'"
            )
    else:
        if item.subtopic not in subtopic_ids:
            report.errors.append(f"{where}: subtopic '{item.subtopic}' tidak ada di topic.json")
        if item.objective not in objective_ids:
            report.errors.append(f"{where}: objective '{item.objective}' tidak ada di topic.json")

    words = _words(item.prompt_text())
    if words > MAX_PROMPT_WORDS:
        report.errors.append(f"{where}: soal {words} kata (maks {MAX_PROMPT_WORDS})")

    if isinstance(item, MEAN_TYPES) and item.level in ("L2", "L3") and item.interpret is None:
        report.errors.append(f"{where}: soal {item.level} wajib punya langkah Maknai (interpret)")

    try:
        key = item.key()
    except (ZeroDivisionError, ValueError) as exc:
        report.errors.append(f"{where}: kunci tidak dapat dihitung — {exc}")
        return

    for name, value in key.items():
        if name in ("divide", "answer") and item.decimals is None and round(value, 3) != value:
            report.errors.append(
                f"{where}: hasil {value} punya banyak angka desimal; isi 'decimals' (mis. 1)"
            )


def _validate_screens(lesson: Lesson, filename: str, report: Report) -> None:
    for number, screen in enumerate(lesson.screens, start=1):
        where = f"{filename} layar {number}"
        if isinstance(screen, ConceptScreen | EqualShareScreen):
            if _words(screen.text) > MAX_CONCEPT_WORDS:
                report.errors.append(f"{where}: teks konsep lebih dari {MAX_CONCEPT_WORDS} kata")
        elif isinstance(screen, ContextScreen):
            if _words(screen.text) > MAX_CONTEXT_WORDS:
                report.errors.append(f"{where}: teks konteks lebih dari {MAX_CONTEXT_WORDS} kata")
        elif isinstance(screen, WorkedExampleScreen):
            if screen.text and _words(screen.text) > MAX_CONTEXT_WORDS:
                report.errors.append(f"{where}: teks contoh lebih dari {MAX_CONTEXT_WORDS} kata")
            for step in screen.steps:
                if _words(step.text) > MAX_STEP_WORDS:
                    report.errors.append(f"{where}: langkah '{step.key}' terlalu panjang")
        elif isinstance(screen, FadedExampleScreen):
            item = report.items.get(screen.item_ref)
            if item is None:
                report.errors.append(f"{where}: itemRef '{screen.item_ref}' tidak ada")
                continue
            steps = set(getattr(item, "steps", []))
            extra = set(screen.given_steps) - steps - {"list"}
            if extra:
                report.errors.append(f"{where}: givenSteps {extra} bukan langkah soal {item.id}")
            if steps and steps <= set(screen.given_steps):
                report.errors.append(f"{where}: semua langkah sudah diberikan; sisakan untuk siswa")
        elif isinstance(screen, PracticeScreen):
            for ref in screen.item_refs:
                if ref not in report.items:
                    report.errors.append(f"{where}: itemRef '{ref}' tidak ada")


def _check_quiz_bank(topic: Topic, report: Report) -> None:
    """Bank soal kuis harus cukup untuk diambil acak sesuai kisi-kisi kuis."""
    quiz = [i for i in report.items.values() if report.item_kinds[i.id] == "quiz"]
    counts = Counter(item.level for item in quiz)
    for level, needed in topic.quiz_blueprint.items():
        if counts[level] < needed:
            report.errors.append(
                f"kuis: soal {level} di bank hanya {counts[level]}, kisi-kisi butuh {needed}"
            )
        elif counts[level] == needed:
            report.warnings.append(
                f"kuis: soal {level} di bank pas {needed}; kuis ulang akan selalu sama"
            )
    unsupported = [i.id for i in quiz if isinstance(i, SelfExplainItem)]
    if unsupported:
        report.errors.append(f"kuis: pertanyaan alasan tidak bisa dipakai di kuis: {unsupported}")


def _check_blueprint(topic: Topic, report: Report) -> None:
    # Pertanyaan alasan (self_explain) tidak dihitung dalam kisi-kisi dan tidak butuh soal kembar.
    originals = [
        item
        for item in report.items.values()
        if item.twin_of is None
        and not isinstance(item, SelfExplainItem)
        and report.item_kinds[item.id] == "practice"
    ]
    twinned = {item.twin_of for item in report.items.values() if item.twin_of}
    for subtopic in topic.subtopics:
        if subtopic.file is None:
            continue  # sudah diberi peringatan "belum ditulis"
        counts = Counter(item.level for item in originals if item.subtopic == subtopic.id)
        for level, target in subtopic.blueprint.items():
            if counts[level] < target:
                report.warnings.append(
                    f"subbab {subtopic.id}: soal {level} baru {counts[level]} dari {target}"
                )
        no_twin = [
            item.id for item in originals if item.subtopic == subtopic.id and item.id not in twinned
        ]
        if no_twin:
            report.warnings.append(f"subbab {subtopic.id}: belum punya soal kembar: {no_twin}")


def _print_keys(report: Report) -> None:
    print("\nKunci jawaban (dihitung otomatis):")
    for item in report.items.values():
        key = ", ".join(f"{name}={value:g}" for name, value in item.key().items()) or "-"
        print(f"  {item.id:<18} {item.type:<16} {item.level}  {key}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--keys", action="store_true", help="tampilkan kunci jawaban")
    parser.add_argument("--dir", type=Path, default=CONTENT_DIR, help="folder konten")
    args = parser.parse_args()
    # Konsol Windows bawaan tidak selalu UTF-8; tanda seperti "—" dan "≠" bisa rusak.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    report = validate(args.dir)
    for warning in report.warnings:
        print(f"PERINGATAN  {warning}")
    for error in report.errors:
        print(f"GALAT       {error}")
    if args.keys and report.ok:
        _print_keys(report)

    print(
        f"\n{len(report.lessons)} subbab, {len(report.items)} soal — "
        f"{len(report.errors)} galat, {len(report.warnings)} peringatan"
    )
    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main())
