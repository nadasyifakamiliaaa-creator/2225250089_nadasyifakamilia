"""Skema konten materi & soal (docs/04 bagian 4) dalam Pydantic.

Kunci jawaban dihitung di sini dengan logika yang sama seperti frontend/js/core/answer-key.js,
sehingga tidak ada kunci yang ditulis manual.
"""

from __future__ import annotations

import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

PLACEHOLDER = re.compile(r"\[\[([\w-]+)\]\]")

Level = Literal["L1", "L2", "L3"]
Context = Literal["personal", "pekerjaan", "sosial", "ilmiah"]
Step = Literal["understand", "select", "n", "sum", "divide", "interpret"]
STORY_STEP_ORDER = ["understand", "select", "n", "sum", "divide", "interpret"]


class Model(BaseModel):
    """Dasar: nama kolom JSON camelCase, kolom tak dikenal ditolak (mencegah salah ketik)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


# --------------------------------------------------------------------------- pilihan jawaban


class Choice(Model):
    text: str = Field(min_length=1)
    correct: bool
    feedback: str = Field(min_length=1)


def _exactly_one_correct(options: list[Choice], where: str) -> None:
    correct = sum(option.correct for option in options)
    if correct != 1:
        raise ValueError(f"{where}: harus tepat 1 opsi benar, ditemukan {correct}")


class Interpret(Model):
    question: str = Field(min_length=1)
    options: list[Choice] = Field(min_length=2)

    @model_validator(mode="after")
    def _one_correct(self) -> Interpret:
        _exactly_one_correct(self.options, "interpret")
        return self


# --------------------------------------------------------------------------- butir soal


class ItemBase(Model):
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    twin_of: str | None = None
    subtopic: str
    objective: str
    level: Level
    context: Context | None = None
    prompt: str = Field(min_length=1)
    unit: str | None = None
    tolerance: float = Field(default=0.01, ge=0)
    decimals: int | None = Field(default=None, ge=0, le=3)

    def key(self) -> dict[str, float]:
        return {}

    def prompt_text(self) -> str:
        """Teks soal seperti yang dibaca siswa (placeholder diganti teks tampilannya)."""
        return self.prompt


class Expression(Model):
    op: Literal["sum", "product", "divide"]
    operands: list[float] = Field(min_length=2)

    def evaluate(self) -> float:
        if self.op == "sum":
            return _clean(sum(self.operands))
        if self.op == "product":
            result = 1.0
            for value in self.operands:
                result *= value
            return _clean(result)
        if len(self.operands) != 2 or self.operands[1] == 0:
            raise ValueError("divide butuh tepat 2 operand dan pembagi bukan 0")
        return _clean(self.operands[0] / self.operands[1])


class NumberItem(ItemBase):
    type: Literal["number"]
    expression: Expression

    def key(self) -> dict[str, float]:
        return {"answer": self.expression.evaluate()}


class _MeanSteps(ItemBase):
    steps: list[Step] = Field(min_length=1)
    interpret: Interpret | None = None

    @model_validator(mode="after")
    def _steps_consistent(self) -> _MeanSteps:
        if len(set(self.steps)) != len(self.steps):
            raise ValueError(f"{self.id}: langkah ganda di 'steps'")
        if ("interpret" in self.steps) != (self.interpret is not None):
            raise ValueError(
                f"{self.id}: langkah 'interpret' dan kolom 'interpret' harus ada bersama"
            )
        return self

    def mean_data(self) -> list[float]:
        """Data yang dirata-ratakan."""
        raise NotImplementedError

    def key(self) -> dict[str, float]:
        data = self.mean_data()
        return {"n": len(data), "sum": _clean(sum(data)), "divide": _clean(sum(data) / len(data))}


class StepwiseMeanItem(_MeanSteps):
    type: Literal["stepwise_mean"]
    data: list[float] = Field(min_length=2)

    def mean_data(self) -> list[float]:
        return self.data


class FrequencyRow(Model):
    x: float
    f: int = Field(ge=1)


class FrequencyMeanItem(_MeanSteps):
    type: Literal["frequency_mean"]
    table: list[FrequencyRow] = Field(min_length=2)
    value_label: str | None = None  # judul kolom nilai, mis. "Ukuran sepatu" (bawaan "Nilai")
    frequency_label: str | None = None  # judul kolom frekuensi, mis. "Banyak siswa"

    def mean_data(self) -> list[float]:
        return [row.x for row in self.table for _ in range(row.f)]


class Selectable(Model):
    display: str = Field(min_length=1)
    value: float
    relevant: bool
    meaning: str | None = None

    @model_validator(mode="after")
    def _meaning_for_distractor(self) -> Selectable:
        if not self.relevant and not self.meaning:
            raise ValueError(f"angka pengecoh '{self.display}' wajib punya 'meaning'")
        return self


class StoryMeanItem(_MeanSteps):
    type: Literal["story_mean"]
    selectables: dict[str, Selectable] = Field(min_length=2)
    # Tahap "Pahami": apa yang ditanyakan soal? (literasi: merumuskan)
    understand: Interpret

    @model_validator(mode="after")
    def _placeholders_match(self) -> StoryMeanItem:
        in_prompt = PLACEHOLDER.findall(self.prompt)
        if len(in_prompt) != len(set(in_prompt)):
            raise ValueError(f"{self.id}: placeholder [[...]] ganda di prompt")
        missing = set(in_prompt) - set(self.selectables)
        unused = set(self.selectables) - set(in_prompt)
        if missing:
            raise ValueError(
                f"{self.id}: [[{', '.join(sorted(missing))}]] tidak ada di selectables"
            )
        if unused:
            raise ValueError(f"{self.id}: selectables tidak dipakai di prompt: {sorted(unused)}")
        if sum(s.relevant for s in self.selectables.values()) < 2:
            raise ValueError(f"{self.id}: minimal 2 angka relevan")
        if "select" not in self.steps:
            raise ValueError(f"{self.id}: soal cerita wajib punya langkah 'select'")
        if "understand" not in self.steps:
            raise ValueError(f"{self.id}: soal cerita wajib punya langkah 'understand'")
        expected_order = [s for s in STORY_STEP_ORDER if s in self.steps]
        if self.steps != expected_order:
            raise ValueError(f"{self.id}: urutan langkah harus {expected_order}")
        return self

    def mean_data(self) -> list[float]:
        order = PLACEHOLDER.findall(self.prompt)
        return [self.selectables[k].value for k in order if self.selectables[k].relevant]

    def prompt_text(self) -> str:
        return PLACEHOLDER.sub(lambda m: self.selectables[m.group(1)].display, self.prompt)


class MissingValueItem(ItemBase):
    type: Literal["missing_value"]
    known_data: list[float] = Field(min_length=1)
    target_mean: float
    total_count: int

    @model_validator(mode="after")
    def _count(self) -> MissingValueItem:
        if self.total_count != len(self.known_data) + 1:
            raise ValueError(f"{self.id}: totalCount harus = banyak knownData + 1")
        return self

    def key(self) -> dict[str, float]:
        return {"answer": _clean(self.target_mean * self.total_count - sum(self.known_data))}


class MultipleChoiceItem(ItemBase):
    type: Literal["multiple_choice"]
    options: list[Choice] = Field(min_length=2)

    @model_validator(mode="after")
    def _one_correct(self) -> MultipleChoiceItem:
        _exactly_one_correct(self.options, self.id)
        return self


class SelfExplainItem(ItemBase):
    type: Literal["self_explain"]
    options: list[Choice] | None = None
    free_text: bool = False

    @model_validator(mode="after")
    def _shape(self) -> SelfExplainItem:
        if self.options is None and not self.free_text:
            raise ValueError(f"{self.id}: isi 'options' atau set 'freeText': true")
        if self.options is not None:
            _exactly_one_correct(self.options, self.id)
        return self


Item = Annotated[
    NumberItem
    | StepwiseMeanItem
    | FrequencyMeanItem
    | StoryMeanItem
    | MissingValueItem
    | MultipleChoiceItem
    | SelfExplainItem,
    Field(discriminator="type"),
]

MEAN_TYPES = (StepwiseMeanItem, FrequencyMeanItem, StoryMeanItem)


# --------------------------------------------------------------------------- layar materi


class ContextScreen(Model):
    type: Literal["context"]
    text: str = Field(min_length=1)
    image: str | None = None


class Formula(Model):
    numerator: str
    denominator: str


class ConceptScreen(Model):
    type: Literal["concept"]
    text: str = Field(min_length=1)
    formula: Formula | None = None


class EqualShareScreen(Model):
    """Visual "bagi sama rata": tumpukan benda disamaratakan (subbab 1)."""

    type: Literal["equal_share"]
    text: str = Field(min_length=1)
    data: list[int] = Field(min_length=2)
    names: list[str]
    unit: str

    @model_validator(mode="after")
    def _shape(self) -> EqualShareScreen:
        if len(self.names) != len(self.data):
            raise ValueError("equal_share: banyak 'names' harus sama dengan banyak 'data'")
        if sum(self.data) % len(self.data) != 0:
            raise ValueError("equal_share: hasil bagi sama rata harus bilangan bulat")
        return self


class WorkedStep(Model):
    # "note" = langkah penjelasan bebas tanpa nilai yang diperiksa
    key: Literal["understand", "select", "list", "n", "sum", "divide", "note", "interpret"]
    text: str = Field(min_length=1)
    value: float | None = None


class WorkedExampleScreen(Model):
    type: Literal["worked_example"]
    text: str | None = None  # teks soal/konteks yang ditampilkan di atas tabel
    data: list[float] | None = None
    table: list[FrequencyRow] | None = None
    unit: str | None = None
    value_label: str | None = None
    frequency_label: str | None = None
    steps: list[WorkedStep] = Field(min_length=2)

    @model_validator(mode="after")
    def _values_correct(self) -> WorkedExampleScreen:
        if (self.data is None) == (self.table is None):
            raise ValueError("worked_example: isi salah satu dari 'data' atau 'table'")
        values = self.data or [row.x for row in self.table or [] for _ in range(row.f)]
        expected = {
            "n": len(values),
            "sum": _clean(sum(values)),
            "divide": _clean(sum(values) / len(values)),
        }
        for step in self.steps:
            if step.value is None or step.key not in expected:
                continue
            if abs(step.value - expected[step.key]) > 1e-6:
                raise ValueError(
                    f"worked_example: langkah '{step.key}' bernilai {step.value}, "
                    f"seharusnya {expected[step.key]}"
                )
        return self


class FadedExampleScreen(Model):
    type: Literal["faded_example"]
    item_ref: str
    given_steps: list[Literal["list", "understand", "select", "n", "sum", "divide"]]


class PracticeScreen(Model):
    type: Literal["practice"]
    item_refs: list[str] = Field(min_length=1)


Screen = Annotated[
    ContextScreen
    | ConceptScreen
    | EqualShareScreen
    | WorkedExampleScreen
    | FadedExampleScreen
    | PracticeScreen,
    Field(discriminator="type"),
]


class Lesson(Model):
    id: str
    title: str
    objectives: list[str] = Field(min_length=1)
    screens: list[Screen] = Field(min_length=1)


# --------------------------------------------------------------------------- topik


class Objective(Model):
    id: str
    text: str
    level: str


class Subtopic(Model):
    id: str
    title: str
    file: str | None = None  # None = belum ditulis
    objectives: list[str]
    blueprint: dict[Level, int] = Field(default_factory=dict)


class ItemFiles(Model):
    readiness: str | None = None
    practice: str | None = None
    quiz: str | None = None


class Topic(Model):
    id: str
    title: str
    objectives: list[Objective]
    subtopics: list[Subtopic]
    items: ItemFiles
    # Banyak soal kuis per level yang diambil acak dari bank soal kuis
    quiz_blueprint: dict[Level, int] = Field(default_factory=dict)


class TopicRef(Model):
    id: str
    title: str
    path: str


class ContentIndex(Model):
    topics: list[TopicRef] = Field(min_length=1)


def _clean(value: float) -> float:
    """Sama dengan clean() di mean.js: hilangkan galat biner."""
    return round(value * 1e10) / 1e10
