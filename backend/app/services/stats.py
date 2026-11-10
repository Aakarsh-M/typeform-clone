"""Per-question summary stats, computed with SQL aggregates over the typed
answer columns rather than by loading every response into Python."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Answer,
    AnswerChoice,
    Form,
    Question,
    QuestionChoice,
    QuestionType,
    Response,
    ResponseStatus,
)
from app.schemas import ChoiceStat, FormSummary, QuestionSummary

LATEST_TEXT_LIMIT = 5


def _completed_answers(question_id: int):
    """Base filter: answers to this question that belong to completed responses."""
    return (
        select(Answer)
        .join(Response, Response.id == Answer.response_id)
        .where(Answer.question_id == question_id, Response.status == ResponseStatus.completed)
    )


def _choice_stats(db: Session, q: Question, answered: int) -> list[ChoiceStat]:
    # Selections that belong to completed responses only. Filtering inside the
    # subquery (not in WHERE) keeps choices nobody picked, with a count of 0.
    picks = (
        select(AnswerChoice.choice_id, AnswerChoice.answer_id)
        .join(Answer, Answer.id == AnswerChoice.answer_id)
        .join(Response, Response.id == Answer.response_id)
        .where(Answer.question_id == q.id, Response.status == ResponseStatus.completed)
        .subquery()
    )
    rows = db.execute(
        select(QuestionChoice.id, QuestionChoice.label, func.count(picks.c.answer_id))
        .outerjoin(picks, picks.c.choice_id == QuestionChoice.id)
        .where(QuestionChoice.question_id == q.id, QuestionChoice.deleted_at.is_(None))
        .group_by(QuestionChoice.id)
        .order_by(QuestionChoice.position)
    ).all()
    return [
        ChoiceStat(
            id=cid,
            label=label,
            count=count,
            percentage=round(100 * count / answered, 1) if answered else 0.0,
        )
        for cid, label, count in rows
    ]


def _question_summary(db: Session, q: Question, completed: int) -> QuestionSummary:
    base = _completed_answers(q.id).subquery()
    answered = db.scalar(select(func.count()).select_from(base))
    summary = QuestionSummary(
        question_id=q.id,
        type=q.type,
        title=q.title,
        answered=answered,
        skipped=max(completed - answered, 0),
    )

    if q.type in (QuestionType.multiple_choice, QuestionType.dropdown):
        summary.choices = _choice_stats(db, q, answered)

    elif q.type in (QuestionType.number, QuestionType.rating):
        avg, low, high = db.execute(
            select(func.avg(base.c.value_number), func.min(base.c.value_number), func.max(base.c.value_number))
        ).one()
        summary.average = round(avg, 2) if avg is not None else None
        summary.min, summary.max = low, high
        if q.type == QuestionType.rating:
            counts = dict(
                db.execute(
                    select(base.c.value_number, func.count()).group_by(base.c.value_number)
                ).all()
            )
            steps = q.properties.get("steps", 5)
            summary.distribution = {str(i): counts.get(float(i), 0) for i in range(1, steps + 1)}

    elif q.type == QuestionType.yes_no:
        counts = dict(
            db.execute(select(base.c.value_bool, func.count()).group_by(base.c.value_bool)).all()
        )
        summary.distribution = {"Yes": counts.get(True, 0), "No": counts.get(False, 0)}

    else:  # short_text, long_text, email
        summary.latest = list(
            db.scalars(
                select(Answer.value_text)
                .join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == q.id, Response.status == ResponseStatus.completed)
                .order_by(Response.submitted_at.desc())
                .limit(LATEST_TEXT_LIMIT)
            )
        )
    return summary


def form_summary(db: Session, form: Form) -> FormSummary:
    counts = dict(
        db.execute(
            select(Response.status, func.count())
            .where(Response.form_id == form.id)
            .group_by(Response.status)
        ).all()
    )
    completed = counts.get(ResponseStatus.completed, 0)
    started = completed + counts.get(ResponseStatus.in_progress, 0)
    return FormSummary(
        form_id=form.id,
        started=started,
        completed=completed,
        completion_rate=round(100 * completed / started, 1) if started else None,
        questions=[_question_summary(db, q, completed) for q in form.active_questions],
    )
