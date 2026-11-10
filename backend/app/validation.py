"""Server-side answer validation.

The client validates the same rules for instant feedback, but the server is
the source of truth: every submission is re-checked here before it is stored.

Each validator takes the question and the raw value sent by the client and
returns a CleanValue (what gets written to the typed answer columns) or raises
AnswerError with a respondent-facing message.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from email_validator import EmailNotValidError, validate_email

from app.models import Question, QuestionType

REQUIRED_MESSAGE = "Please fill this in"


class AnswerError(ValueError):
    pass


@dataclass
class CleanValue:
    text: str | None = None
    number: float | None = None
    boolean: bool | None = None
    choice_ids: list[int] = field(default_factory=list)


def is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, list) and not value:
        return True
    return False


def _text(question: Question, value: Any) -> CleanValue:
    if not isinstance(value, str):
        raise AnswerError("Please enter some text")
    value = value.strip()
    max_length = question.properties.get("max_length")
    if max_length and len(value) > max_length:
        raise AnswerError(f"Please keep it under {max_length} characters")
    return CleanValue(text=value)


def _email(question: Question, value: Any) -> CleanValue:
    if not isinstance(value, str):
        raise AnswerError("Hmm... that email doesn't look right")
    try:
        result = validate_email(value.strip(), check_deliverability=False)
    except EmailNotValidError as exc:
        raise AnswerError("Hmm... that email doesn't look right") from exc
    return CleanValue(text=result.normalized)


def _number(question: Question, value: Any) -> CleanValue:
    if isinstance(value, bool):  # bool is a subclass of int in Python
        raise AnswerError("Numbers only please")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise AnswerError("Numbers only please") from exc

    low = question.properties.get("min")
    high = question.properties.get("max")
    if low is not None and number < low:
        raise AnswerError(f"Number must be greater or equal to {low:g}")
    if high is not None and number > high:
        raise AnswerError(f"Number must be lower or equal to {high:g}")
    return CleanValue(number=number)


def _yes_no(question: Question, value: Any) -> CleanValue:
    if not isinstance(value, bool):
        raise AnswerError("Please choose Yes or No")
    return CleanValue(boolean=value)


def _rating(question: Question, value: Any) -> CleanValue:
    steps = question.properties.get("steps", 5)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value != int(value):
        raise AnswerError("Please select a rating")
    if not 1 <= int(value) <= steps:
        raise AnswerError(f"Rating must be between 1 and {steps}")
    return CleanValue(number=int(value))


def _choices(question: Question, value: Any) -> CleanValue:
    ids = value if isinstance(value, list) else [value]
    if not all(isinstance(i, int) and not isinstance(i, bool) for i in ids):
        raise AnswerError("Please select an option")

    valid_ids = {c.id for c in question.active_choices}
    if any(i not in valid_ids for i in ids):
        raise AnswerError("Please select a valid option")

    ids = list(dict.fromkeys(ids))  # de-duplicate, keep order
    allow_multiple = (
        question.type == QuestionType.multiple_choice
        and question.properties.get("allow_multiple", False)
    )
    if len(ids) > 1 and not allow_multiple:
        raise AnswerError("Please select only one option")
    return CleanValue(choice_ids=ids)


VALIDATORS: dict[QuestionType, Callable[[Question, Any], CleanValue]] = {
    QuestionType.short_text: _text,
    QuestionType.long_text: _text,
    QuestionType.email: _email,
    QuestionType.number: _number,
    QuestionType.yes_no: _yes_no,
    QuestionType.rating: _rating,
    QuestionType.multiple_choice: _choices,
    QuestionType.dropdown: _choices,
}


def validate_answer(question: Question, value: Any) -> CleanValue | None:
    """Return the cleaned value, None for a skipped optional question, or raise."""
    if is_empty(value):
        if question.required:
            raise AnswerError(REQUIRED_MESSAGE)
        return None
    return VALIDATORS[question.type](question, value)
