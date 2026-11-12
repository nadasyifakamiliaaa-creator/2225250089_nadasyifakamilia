"""Bentuk data yang dikirim aplikasi siswa ke POST /api/sync (docs/06 bagian 4.2).

Setiap event punya clientId (UUID dari perangkat) sehingga pengiriman ulang tidak menggandakan data.
"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

CLASS_CODE = r"^[A-Za-z0-9-]{2,20}$"
STUDENT_CODE = r"^[A-Za-z0-9-]{1,20}$"
CLIENT_ID = r"^[A-Za-z0-9-]{8,64}$"


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class EventBase(Model):
    client_id: str = Field(pattern=CLIENT_ID)
    created_at: datetime


class AttemptEvent(EventBase):
    type: Literal["attempt"]
    context: Literal["lesson", "quiz", "readiness"]
    subtopic_id: str | None = Field(default=None, max_length=40)
    item_id: str = Field(max_length=40)
    step: str = Field(max_length=20)
    answer: str = Field(max_length=200)
    is_correct: bool
    error_code: str | None = Field(default=None, max_length=20)
    attempt_no: int = Field(ge=1, le=50)
    revealed: bool = False
    duration_ms: int | None = Field(default=None, ge=0, le=24 * 3600 * 1000)


class EffortEvent(EventBase):
    type: Literal["effort"]
    scale: Literal["paas", "leppink"]
    subtopic_id: str | None = Field(default=None, max_length=40)
    item_no: int = Field(ge=1, le=20)
    dimension: Literal["IL", "EL", "GL"] | None = None
    value: int = Field(ge=0, le=10)


class ExplainEvent(EventBase):
    type: Literal["explain"]
    subtopic_id: str | None = Field(default=None, max_length=40)
    item_id: str = Field(max_length=40)
    text: str = Field(min_length=1, max_length=1000)


class QuizEvent(EventBase):
    type: Literal["quiz"]
    points: int = Field(ge=0)
    max: int = Field(ge=1)
    percent: int = Field(ge=0, le=100)
    item_ids: list[str] = Field(max_length=30)


class ProgressEvent(EventBase):
    type: Literal["progress"]
    subtopic_id: str = Field(max_length=40)
    status: Literal["started", "done"]


Event = Annotated[
    AttemptEvent | EffortEvent | ExplainEvent | QuizEvent | ProgressEvent,
    Field(discriminator="type"),
]


class SyncRequest(Model):
    class_code: str = Field(pattern=CLASS_CODE)
    student_code: str = Field(pattern=STUDENT_CODE)
    events: list[Event] = Field(max_length=500)


class SyncResponse(Model):
    accepted: int
    duplicates: int


class ClassroomCheck(Model):
    class_code: str = Field(pattern=CLASS_CODE)


class ClassroomInfo(Model):
    code: str
    name: str
    research: bool
