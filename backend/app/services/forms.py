"""Form and question business logic, kept out of the routers so it can be tested
and reused (the seed script uses it too)."""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.config import DEFAULT_USER_EMAIL, DEFAULT_USER_NAME
from app.models import (
    CHOICE_TYPES,
    Answer,
    AnswerChoice,
    Form,
    FormStatus,
    Question,
    QuestionChoice,
    Response,
    ResponseStatus,
    User,
    utcnow,
)
from app.question_types import DEFAULT_CHOICES, normalize_properties
from app.schemas import (
    ChoiceIn,
    FormDetail,
    FormListItem,
    QuestionCreate,
    QuestionOut,
    QuestionUpdate,
)

DEFAULT_SETTINGS = {
    "theme": {"preset": "default"},
    "thank_you": {
        "title": "Thanks for completing this typeform",
        "description": "Now create your own — it's free, easy, & beautiful",
    },
}


# ---------- Users ----------


def get_or_create_default_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
    if user is None:
        user = User(name=DEFAULT_USER_NAME, email=DEFAULT_USER_EMAIL)
        db.add(user)
        db.commit()
    return user


# ---------- Serialization ----------


def question_out(question: Question) -> QuestionOut:
    return QuestionOut(
        id=question.id,
        position=question.position,
        type=question.type,
        title=question.title,
        description=question.description,
        required=question.required,
        properties=question.properties,
        choices=[
            {"id": c.id, "label": c.label, "position": c.position}
            for c in question.active_choices
        ],
    )


def _completed_count(db: Session, form_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Response)
        .where(Response.form_id == form_id, Response.status == ResponseStatus.completed)
    )


def form_list_item(form: Form, response_count: int) -> FormListItem:
    return FormListItem(
        id=form.id,
        public_id=form.public_id,
        title=form.title,
        status=form.status,
        question_count=len(form.active_questions),
        response_count=response_count,
        created_at=form.created_at,
        updated_at=form.updated_at,
        published_at=form.published_at,
    )


def form_detail(db: Session, form: Form) -> FormDetail:
    item = form_list_item(form, _completed_count(db, form.id))
    return FormDetail(
        **item.model_dump(),
        settings=form.settings,
        questions=[question_out(q) for q in form.active_questions],
    )


# ---------- Forms ----------


def _form_query():
    return select(Form).options(selectinload(Form.questions).selectinload(Question.choices))


def list_forms(db: Session, user: User) -> list[FormListItem]:
    counts = (
        select(Response.form_id, func.count().label("n"))
        .where(Response.status == ResponseStatus.completed)
        .group_by(Response.form_id)
        .subquery()
    )
    rows = db.execute(
        _form_query()
        .add_columns(func.coalesce(counts.c.n, 0))
        .outerjoin(counts, counts.c.form_id == Form.id)
        .where(Form.owner_id == user.id)
        .order_by(Form.updated_at.desc())
    ).all()
    return [form_list_item(form, count) for form, count in rows]


def get_form(db: Session, user: User, form_id: int) -> Form:
    form = db.scalar(_form_query().where(Form.id == form_id, Form.owner_id == user.id))
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    return form


def get_published_form(db: Session, public_id: str) -> Form:
    form = db.scalar(_form_query().where(Form.public_id == public_id))
    if form is None or form.status != FormStatus.published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This typeform isn't accepting responses")
    return form


def create_form(db: Session, user: User, title: str) -> Form:
    form = Form(owner=user, title=title, settings=DEFAULT_SETTINGS)
    db.add(form)
    db.commit()
    return get_form(db, user, form.id)


def update_form(db: Session, form: Form, title: str | None, settings: dict | None) -> Form:
    if title is not None:
        form.title = title
    if settings is not None:
        # Shallow-merge so the client can patch one section (e.g. only "theme").
        form.settings = {**form.settings, **settings}
    db.commit()
    return form


def duplicate_form(db: Session, user: User, source: Form) -> Form:
    copy = Form(
        owner=user,
        title=f"{source.title} (copy)",
        settings=dict(source.settings),
        status=FormStatus.draft,
    )
    for position, q in enumerate(source.active_questions):
        copy.questions.append(
            Question(
                position=position,
                type=q.type,
                title=q.title,
                description=q.description,
                required=q.required,
                properties=dict(q.properties),
                choices=[
                    QuestionChoice(position=i, label=c.label)
                    for i, c in enumerate(q.active_choices)
                ],
            )
        )
    db.add(copy)
    db.commit()
    return get_form(db, user, copy.id)


def set_published(db: Session, form: Form, published: bool) -> Form:
    if published and not form.active_questions:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add at least one question before publishing")
    form.status = FormStatus.published if published else FormStatus.draft
    if published:
        form.published_at = utcnow()
    db.commit()
    return form


def delete_form(db: Session, form: Form) -> None:
    db.delete(form)
    db.commit()


# ---------- Questions ----------


def _touch(form: Form) -> None:
    form.updated_at = utcnow()


def _renumber(form: Form) -> None:
    for position, q in enumerate(form.active_questions):
        q.position = position


def _question_has_answers(db: Session, question_id: int) -> bool:
    return db.scalar(select(func.count()).select_from(Answer).where(Answer.question_id == question_id)) > 0


def _choice_has_answers(db: Session, choice_id: int) -> bool:
    return (
        db.scalar(
            select(func.count()).select_from(AnswerChoice).where(AnswerChoice.choice_id == choice_id)
        )
        > 0
    )


def get_question(db: Session, user: User, question_id: int) -> Question:
    question = db.scalar(
        select(Question)
        .join(Form)
        .options(selectinload(Question.choices))
        .where(Question.id == question_id, Question.deleted_at.is_(None), Form.owner_id == user.id)
    )
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return question


def _sync_choices(db: Session, question: Question, incoming: list[ChoiceIn]) -> None:
    """Make the question's active choices match `incoming` (labels and order).

    Existing choices are matched by id so answers keep pointing at them.
    Removed choices are hard-deleted if unused, otherwise soft-deleted.
    """
    existing = {c.id: c for c in question.active_choices}
    kept: set[int] = set()

    for position, item in enumerate(incoming):
        if item.id is not None and item.id in existing:
            choice = existing[item.id]
            choice.label = item.label
            choice.position = position
            kept.add(choice.id)
        else:
            question.choices.append(QuestionChoice(position=position, label=item.label))

    for choice_id, choice in existing.items():
        if choice_id in kept:
            continue
        if _choice_has_answers(db, choice_id):
            choice.deleted_at = utcnow()
        else:
            question.choices.remove(choice)


def add_question(db: Session, form: Form, data: QuestionCreate) -> Question:
    active = form.active_questions
    position = len(active) if data.position is None else max(0, min(data.position, len(active)))
    for q in active[position:]:
        q.position += 1

    question = Question(
        position=position,
        type=data.type,
        title=data.title,
        description=data.description,
        required=data.required,
        properties=normalize_properties(data.type, data.properties),
    )
    if data.type in CHOICE_TYPES:
        labels = (
            [c.label for c in data.choices]
            if data.choices
            else DEFAULT_CHOICES[data.type]
        )
        question.choices = [QuestionChoice(position=i, label=l) for i, l in enumerate(labels)]

    form.questions.append(question)
    form.questions.sort(key=lambda q: q.position)
    _touch(form)
    db.commit()
    return question


def update_question(db: Session, question: Question, data: QuestionUpdate) -> Question:
    fields = data.model_fields_set

    if "type" in fields and data.type is not None and data.type != question.type:
        if _question_has_answers(db, question.id):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "This question already has responses, so its type can't change. "
                "Add a new question instead.",
            )
        question.type = data.type
        question.properties = normalize_properties(data.type, question.properties)
        if data.type in CHOICE_TYPES and not question.active_choices and not data.choices:
            question.choices = [
                QuestionChoice(position=i, label=l)
                for i, l in enumerate(DEFAULT_CHOICES[data.type])
            ]

    if "title" in fields and data.title is not None:
        question.title = data.title
    if "description" in fields:
        question.description = data.description
    if "required" in fields and data.required is not None:
        question.required = data.required
    if "properties" in fields and data.properties is not None:
        question.properties = normalize_properties(
            question.type, {**question.properties, **data.properties}
        )
    if "choices" in fields and data.choices is not None:
        if question.type not in CHOICE_TYPES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This question type has no choices")
        if not data.choices:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Keep at least one choice")
        _sync_choices(db, question, data.choices)

    _touch(question.form)
    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question: Question) -> None:
    form = question.form
    if _question_has_answers(db, question.id):
        question.deleted_at = utcnow()  # keep it so old answers still render
    else:
        form.questions.remove(question)
    _renumber(form)
    _touch(form)
    db.commit()


def reorder_questions(db: Session, form: Form, question_ids: list[int]) -> Form:
    active = {q.id: q for q in form.active_questions}
    if len(question_ids) != len(active) or set(question_ids) != set(active):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "question_ids must list every question exactly once"
        )
    for position, qid in enumerate(question_ids):
        active[qid].position = position
    form.questions.sort(key=lambda q: q.position)
    _touch(form)
    db.commit()
    return form
