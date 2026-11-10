"""Per-type defaults for question properties.

Keeping this in one registry means adding a question type is: add it to the
QuestionType enum, give it defaults here, and give it a validator in
validation.py. The frontend mirrors this in src/lib/questionTypes.ts.
"""

from typing import Any

from app.models import QuestionType

DEFAULT_PROPERTIES: dict[QuestionType, dict[str, Any]] = {
    QuestionType.short_text: {"placeholder": "Type your answer here...", "max_length": None},
    QuestionType.long_text: {"placeholder": "Type your answer here...", "max_length": None},
    QuestionType.email: {"placeholder": "name@example.com"},
    QuestionType.number: {"placeholder": "Type your answer here...", "min": None, "max": None},
    QuestionType.multiple_choice: {"allow_multiple": False, "randomize": False},
    QuestionType.dropdown: {"placeholder": "Type or select an option", "randomize": False},
    QuestionType.yes_no: {},
    QuestionType.rating: {"steps": 5, "shape": "star"},
}

DEFAULT_CHOICES: dict[QuestionType, list[str]] = {
    QuestionType.multiple_choice: ["Choice A", "Choice B"],
    QuestionType.dropdown: ["Option 1", "Option 2"],
}

ALLOWED_RATING_STEPS = range(3, 11)


def normalize_properties(qtype: QuestionType, props: dict[str, Any] | None) -> dict[str, Any]:
    """Merge user-supplied properties over defaults and drop unknown keys."""
    defaults = DEFAULT_PROPERTIES[qtype]
    merged = {**defaults, **{k: v for k, v in (props or {}).items() if k in defaults}}

    if qtype == QuestionType.rating:
        steps = merged.get("steps")
        if not isinstance(steps, int) or steps not in ALLOWED_RATING_STEPS:
            merged["steps"] = defaults["steps"]
    return merged
