"""Respondent endpoints. No auth: anyone with the public link can fill the form."""

from typing import Annotated

from fastapi import APIRouter, Header, status

from app.deps import DB
from app.schemas import PublicForm, StartResponseOut, SubmitIn, SubmitOut
from app.services import responses as response_svc
from app.services.forms import get_published_form, question_out

router = APIRouter(prefix="/api/public", tags=["public"])

UserAgent = Annotated[str | None, Header()]


@router.get("/forms/{public_id}", response_model=PublicForm)
def get_public_form(public_id: str, db: DB):
    form = get_published_form(db, public_id)
    return PublicForm(
        public_id=form.public_id,
        title=form.title,
        settings=form.settings,
        questions=[question_out(q) for q in form.active_questions],
    )


@router.post(
    "/forms/{public_id}/responses/start",
    response_model=StartResponseOut,
    status_code=status.HTTP_201_CREATED,
)
def start_response(public_id: str, db: DB, user_agent: UserAgent = None):
    """Called when the respondent begins, so completion rate can be measured."""
    form = get_published_form(db, public_id)
    response = response_svc.start_response(db, form, user_agent)
    return StartResponseOut(response_id=response.id)


@router.post(
    "/forms/{public_id}/responses",
    response_model=SubmitOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_response(public_id: str, body: SubmitIn, db: DB, user_agent: UserAgent = None):
    form = get_published_form(db, public_id)
    response = response_svc.submit_response(db, form, body.answers, body.response_id, user_agent)
    return SubmitOut(response_id=response.id, submitted_at=response.submitted_at)
