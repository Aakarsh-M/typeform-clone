"""Creator-side form CRUD, publishing and question editing."""

from fastapi import APIRouter, status

from app.deps import DB, CurrentUser, OwnedForm
from app.schemas import (
    FormCreate,
    FormDetail,
    FormListItem,
    FormUpdate,
    QuestionCreate,
    QuestionOut,
    QuestionUpdate,
    ReorderIn,
)
from app.services import forms as svc

router = APIRouter(prefix="/api", tags=["forms"])


@router.get("/forms", response_model=list[FormListItem])
def list_forms(db: DB, user: CurrentUser):
    return svc.list_forms(db, user)


@router.post("/forms", response_model=FormDetail, status_code=status.HTTP_201_CREATED)
def create_form(body: FormCreate, db: DB, user: CurrentUser):
    return svc.form_detail(db, svc.create_form(db, user, body.title))


@router.get("/forms/{form_id}", response_model=FormDetail)
def get_form(form: OwnedForm, db: DB):
    return svc.form_detail(db, form)


@router.patch("/forms/{form_id}", response_model=FormDetail)
def update_form(body: FormUpdate, form: OwnedForm, db: DB):
    return svc.form_detail(db, svc.update_form(db, form, body.title, body.settings))


@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form: OwnedForm, db: DB):
    svc.delete_form(db, form)


@router.post("/forms/{form_id}/duplicate", response_model=FormDetail, status_code=status.HTTP_201_CREATED)
def duplicate_form(form: OwnedForm, db: DB, user: CurrentUser):
    return svc.form_detail(db, svc.duplicate_form(db, user, form))


@router.post("/forms/{form_id}/publish", response_model=FormDetail)
def publish(form: OwnedForm, db: DB):
    return svc.form_detail(db, svc.set_published(db, form, True))


@router.post("/forms/{form_id}/unpublish", response_model=FormDetail)
def unpublish(form: OwnedForm, db: DB):
    return svc.form_detail(db, svc.set_published(db, form, False))


# ---------- Questions ----------


@router.post("/forms/{form_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(body: QuestionCreate, form: OwnedForm, db: DB):
    return svc.question_out(svc.add_question(db, form, body))


@router.put("/forms/{form_id}/questions/order", response_model=FormDetail)
def reorder_questions(body: ReorderIn, form: OwnedForm, db: DB):
    return svc.form_detail(db, svc.reorder_questions(db, form, body.question_ids))


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(question_id: int, body: QuestionUpdate, db: DB, user: CurrentUser):
    question = svc.get_question(db, user, question_id)
    return svc.question_out(svc.update_question(db, question, body))


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: DB, user: CurrentUser):
    svc.delete_question(db, svc.get_question(db, user, question_id))
