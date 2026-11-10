"""Respondent submissions and the creator-side views of them."""

import csv
import io
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Answer,
    AnswerChoice,
    Form,
    Question,
    QuestionType,
    Response,
    ResponseStatus,
    utcnow,
)
from app.schemas import AnswerIn, AnswerOut, ResponseOut, ResponsePage
from app.validation import AnswerError, validate_answer


class SubmissionInvalid(HTTPException):
    """422 whose detail maps question ids to respondent-facing messages."""

    def __init__(self, errors: dict[int, str]):
        super().__init__(
            422,
            {"message": "Some answers need attention", "errors": errors},
        )


# ---------- Respondent side ----------


def start_response(db: Session, form: Form, user_agent: str | None) -> Response:
    response = Response(form=form, status=ResponseStatus.in_progress, user_agent=user_agent)
    db.add(response)
    db.commit()
    return response


def submit_response(
    db: Session,
    form: Form,
    answers: list[AnswerIn],
    response_id: str | None,
    user_agent: str | None,
) -> Response:
    questions = {q.id: q for q in form.active_questions}
    by_question = {a.question_id: a.value for a in answers}

    unknown = set(by_question) - set(questions)
    if unknown:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown question ids: {sorted(unknown)}")

    # Validate everything first so a bad answer stores nothing.
    errors: dict[int, str] = {}
    cleaned = {}
    for qid, question in questions.items():
        try:
            value = validate_answer(question, by_question.get(qid))
        except AnswerError as exc:
            errors[qid] = str(exc)
            continue
        if value is not None:
            cleaned[qid] = value
    if errors:
        raise SubmissionInvalid(errors)

    response = _resolve_response(db, form, response_id, user_agent)
    for qid, value in cleaned.items():
        answer = Answer(
            question_id=qid,
            value_text=value.text,
            value_number=value.number,
            value_bool=value.boolean,
        )
        answer.choices = [AnswerChoice(choice_id=cid) for cid in value.choice_ids]
        response.answers.append(answer)

    response.status = ResponseStatus.completed
    response.submitted_at = utcnow()
    db.commit()
    return response


def _resolve_response(
    db: Session, form: Form, response_id: str | None, user_agent: str | None
) -> Response:
    """Reuse the in-progress row created by /start when the client sends its id."""
    if response_id:
        response = db.get(Response, response_id)
        if response is None or response.form_id != form.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found")
        if response.status == ResponseStatus.completed:
            raise HTTPException(status.HTTP_409_CONFLICT, "This response was already submitted")
        return response

    response = Response(form=form, user_agent=user_agent)
    db.add(response)
    return response


# ---------- Creator side ----------


def answer_value(answer: Answer) -> tuple[Any, str]:
    """(raw value, display string) for one stored answer."""
    qtype = answer.question.type
    if qtype in (QuestionType.multiple_choice, QuestionType.dropdown):
        choices = sorted((ac.choice for ac in answer.choices), key=lambda c: c.position)
        return [c.id for c in choices], ", ".join(c.label for c in choices)
    if qtype == QuestionType.yes_no:
        return answer.value_bool, "Yes" if answer.value_bool else "No"
    if qtype in (QuestionType.number, QuestionType.rating):
        n = answer.value_number
        value = int(n) if n is not None and n == int(n) else n
        return value, "" if value is None else str(value)
    return answer.value_text, answer.value_text or ""


def response_out(response: Response) -> ResponseOut:
    answers = []
    for a in response.answers:
        value, display = answer_value(a)
        answers.append(AnswerOut(question_id=a.question_id, value=value, display=display))
    return ResponseOut(
        id=response.id,
        status=response.status,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        answers=answers,
    )


def _responses_query(form: Form):
    return (
        select(Response)
        .options(
            selectinload(Response.answers).selectinload(Answer.question),
            selectinload(Response.answers)
            .selectinload(Answer.choices)
            .selectinload(AnswerChoice.choice),
        )
        .where(Response.form_id == form.id, Response.status == ResponseStatus.completed)
        .order_by(Response.submitted_at.desc())
    )


def list_responses(db: Session, form: Form, page: int, page_size: int) -> ResponsePage:
    total = db.scalar(
        select(func.count())
        .select_from(Response)
        .where(Response.form_id == form.id, Response.status == ResponseStatus.completed)
    )
    rows = db.scalars(
        _responses_query(form).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return ResponsePage(
        items=[response_out(r) for r in rows], total=total, page=page, page_size=page_size
    )


def get_response(db: Session, form: Form, response_id: str) -> Response:
    response = db.scalar(_responses_query(form).where(Response.id == response_id))
    if response is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found")
    return response


def delete_response(db: Session, form: Form, response_id: str) -> None:
    db.delete(get_response(db, form, response_id))
    db.commit()


def export_csv(db: Session, form: Form) -> str:
    """One row per completed response, one column per question (incl. deleted ones
    that still have answers, so nothing collected is lost)."""
    responses = db.scalars(_responses_query(form)).all()
    answered_ids = {a.question_id for r in responses for a in r.answers}
    columns: list[Question] = [
        q for q in form.questions if q.deleted_at is None or q.id in answered_ids
    ]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Response ID", "Submitted at", *[q.title or "Untitled" for q in columns]])
    for r in responses:
        displays = {a.question_id: answer_value(a)[1] for a in r.answers}
        writer.writerow(
            [
                r.id,
                r.submitted_at.isoformat() if r.submitted_at else "",
                *[displays.get(q.id, "") for q in columns],
            ]
        )
    return buffer.getvalue()
