// Client-side answer validation for instant feedback in the respondent flow.
// Same rules and messages as backend/app/validation.py; the server re-checks
// everything on submit, so this is a UX layer, not the source of truth.

import type { AnswerValue, Question } from "./types";

export const REQUIRED_MESSAGE = "Please fill this in";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmpty(value: AnswerValue | undefined): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Returns an error message, or null when the answer is acceptable. */
export function validateAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (isEmpty(value)) return question.required ? REQUIRED_MESSAGE : null;
  const p = question.properties;

  switch (question.type) {
    case "short_text":
    case "long_text":
      if (typeof value !== "string") return "Please enter some text";
      if (p.max_length && value.trim().length > p.max_length)
        return `Please keep it under ${p.max_length} characters`;
      return null;

    case "email":
      return typeof value === "string" && EMAIL_RE.test(value.trim())
        ? null
        : "Hmm... that email doesn't look right";

    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (typeof value === "boolean" || Number.isNaN(n)) return "Numbers only please";
      if (p.min != null && n < p.min) return `Number must be greater or equal to ${p.min}`;
      if (p.max != null && n > p.max) return `Number must be lower or equal to ${p.max}`;
      return null;
    }

    case "yes_no":
      return typeof value === "boolean" ? null : "Please choose Yes or No";

    case "rating": {
      const steps = p.steps ?? 5;
      return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= steps
        ? null
        : "Please select a rating";
    }

    case "multiple_choice":
    case "dropdown": {
      const ids = Array.isArray(value) ? value : [value];
      const valid = new Set(question.choices.map((c) => c.id));
      if (!ids.every((id) => typeof id === "number" && valid.has(id))) return "Please select a valid option";
      const multi = question.type === "multiple_choice" && p.allow_multiple;
      return ids.length > 1 && !multi ? "Please select only one option" : null;
    }
  }
}
