"""Database schema.

    users ──< forms ──< questions ──< question_choices
                │           │               │
                └──< responses ──< answers ──< answer_choices >──┘

Design notes
- Answers use typed columns (value_text / value_number / value_bool) instead of
  one JSON blob, so summary stats are plain SQL aggregates.
- Choices live in their own table and answers point at choice ids, so renaming
  a choice after responses exist does not corrupt historical counts.
- Questions and choices are soft-deleted (deleted_at) once a form is edited,
  so old answers keep a valid foreign key and still render in results.
- JSON columns are used only for config that is never queried
  (forms.settings, questions.properties).
"""

import enum
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_public_id() -> str:
    # Short, URL-safe and unguessable, used in /to/<public_id> links.
    return secrets.token_urlsafe(6)


def new_uuid() -> str:
    return str(uuid.uuid4())


class FormStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class QuestionType(str, enum.Enum):
    short_text = "short_text"
    long_text = "long_text"
    multiple_choice = "multiple_choice"
    dropdown = "dropdown"
    email = "email"
    number = "number"
    yes_no = "yes_no"
    rating = "rating"


CHOICE_TYPES = {QuestionType.multiple_choice, QuestionType.dropdown}


class ResponseStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    forms: Mapped[list["Form"]] = relationship(back_populates="owner")


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, default=new_public_id)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[FormStatus] = mapped_column(
        Enum(FormStatus, native_enum=False, length=16), default=FormStatus.draft
    )
    # theme, welcome screen, thank-you screen
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    owner: Mapped[User] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.position",
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan"
    )

    @property
    def active_questions(self) -> list["Question"]:
        return [q for q in self.questions if q.deleted_at is None]


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (Index("ix_questions_form_position", "form_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    type: Mapped[QuestionType] = mapped_column(Enum(QuestionType, native_enum=False, length=32))
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    # Type-specific config: rating steps, allow_multiple, number min/max, placeholder ...
    properties: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    form: Mapped[Form] = relationship(back_populates="questions")
    choices: Mapped[list["QuestionChoice"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionChoice.position",
    )

    @property
    def active_choices(self) -> list["QuestionChoice"]:
        return [c for c in self.choices if c.deleted_at is None]


class QuestionChoice(Base):
    __tablename__ = "question_choices"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(500))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    question: Mapped[Question] = relationship(back_populates="choices")


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (Index("ix_responses_form_status", "form_id", "status"),)

    # UUID because respondents hold this id without logging in.
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    status: Mapped[ResponseStatus] = mapped_column(
        Enum(ResponseStatus, native_enum=False, length=16), default=ResponseStatus.in_progress
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(500))

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan"
    )


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[str] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[float | None] = mapped_column(Float)
    value_bool: Mapped[bool | None] = mapped_column(Boolean)

    response: Mapped[Response] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()
    choices: Mapped[list["AnswerChoice"]] = relationship(
        back_populates="answer", cascade="all, delete-orphan"
    )


class AnswerChoice(Base):
    """Join table so one answer can hold several selected choices (multi-select)."""

    __tablename__ = "answer_choices"

    answer_id: Mapped[int] = mapped_column(
        ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True
    )
    choice_id: Mapped[int] = mapped_column(
        ForeignKey("question_choices.id", ondelete="CASCADE"), primary_key=True, index=True
    )

    answer: Mapped[Answer] = relationship(back_populates="choices")
    choice: Mapped[QuestionChoice] = relationship()
