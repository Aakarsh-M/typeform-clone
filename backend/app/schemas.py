"""Request and response bodies for the API (Pydantic v2)."""

from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

from app.models import FormStatus, QuestionType, ResponseStatus


def _as_utc(value: datetime) -> str:
    # SQLite stores datetimes without a timezone; they are always UTC here.
    # Sending the offset stops browsers from reading them as local time.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


UTCDateTime = Annotated[datetime, PlainSerializer(_as_utc, return_type=str)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Questions ----------


class ChoiceIn(BaseModel):
    id: int | None = None  # present when editing an existing choice
    label: str = Field(max_length=500)


class ChoiceOut(ORMModel):
    id: int
    label: str
    position: int


class QuestionCreate(BaseModel):
    type: QuestionType
    title: str = ""
    description: str | None = None
    required: bool = False
    properties: dict[str, Any] = Field(default_factory=dict)
    choices: list[ChoiceIn] | None = None  # None -> type defaults
    position: int | None = None  # None -> append at the end


class QuestionUpdate(BaseModel):
    type: QuestionType | None = None
    title: str | None = None
    description: str | None = None
    required: bool | None = None
    properties: dict[str, Any] | None = None
    choices: list[ChoiceIn] | None = None  # full ordered list when provided


class QuestionOut(ORMModel):
    id: int
    position: int
    type: QuestionType
    title: str
    description: str | None
    required: bool
    properties: dict[str, Any]
    choices: list[ChoiceOut]


class ReorderIn(BaseModel):
    question_ids: list[int]


# ---------- Forms ----------


class FormCreate(BaseModel):
    title: str = Field(default="My new form", min_length=1, max_length=255)


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    settings: dict[str, Any] | None = None


class FormListItem(ORMModel):
    id: int
    public_id: str
    title: str
    status: FormStatus
    question_count: int
    response_count: int
    created_at: UTCDateTime
    updated_at: UTCDateTime
    published_at: UTCDateTime | None


class FormDetail(FormListItem):
    settings: dict[str, Any]
    questions: list[QuestionOut]


# ---------- Public (respondent) ----------


class PublicForm(BaseModel):
    public_id: str
    title: str
    settings: dict[str, Any]
    questions: list[QuestionOut]


class AnswerIn(BaseModel):
    question_id: int
    # str | number | bool | choice id | list of choice ids, checked per type
    value: Any = None


class StartResponseOut(BaseModel):
    response_id: str


class SubmitIn(BaseModel):
    response_id: str | None = None  # from /start, enables completion-rate tracking
    answers: list[AnswerIn]


class SubmitOut(BaseModel):
    response_id: str
    submitted_at: UTCDateTime


# ---------- Results ----------


class AnswerOut(BaseModel):
    question_id: int
    value: Any  # raw value: text, number, bool, or list of choice ids
    display: str  # human-readable, used by the table and CSV


class ResponseOut(BaseModel):
    id: str
    status: ResponseStatus
    started_at: UTCDateTime
    submitted_at: UTCDateTime | None
    answers: list[AnswerOut]


class ResponsePage(BaseModel):
    items: list[ResponseOut]
    total: int
    page: int
    page_size: int


class ChoiceStat(BaseModel):
    id: int
    label: str
    count: int
    percentage: float


class QuestionSummary(BaseModel):
    question_id: int
    type: QuestionType
    title: str
    answered: int
    skipped: int
    choices: list[ChoiceStat] | None = None  # multiple_choice, dropdown
    average: float | None = None  # number, rating
    min: float | None = None
    max: float | None = None
    distribution: dict[str, int] | None = None  # rating values, yes/no
    latest: list[str] | None = None  # recent text answers


class FormSummary(BaseModel):
    form_id: int
    started: int
    completed: int
    completion_rate: float | None
    questions: list[QuestionSummary]
