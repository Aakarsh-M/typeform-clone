"""Creator-side results: responses table, single response, summary, CSV."""

import re

from fastapi import APIRouter, Query, status
from fastapi.responses import Response as HTTPResponse

from app.deps import DB, OwnedForm
from app.schemas import FormSummary, ResponseOut, ResponsePage
from app.services import responses as svc
from app.services.stats import form_summary

router = APIRouter(prefix="/api/forms/{form_id}", tags=["results"])


@router.get("/responses", response_model=ResponsePage)
def list_responses(
    form: OwnedForm,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    return svc.list_responses(db, form, page, page_size)


@router.get("/responses.csv")
def export_responses(form: OwnedForm, db: DB):
    slug = re.sub(r"[^a-z0-9]+", "-", form.title.lower()).strip("-") or "responses"
    return HTTPResponse(
        content=svc.export_csv(db, form),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{slug}-responses.csv"'},
    )


@router.get("/responses/{response_id}", response_model=ResponseOut)
def get_response(response_id: str, form: OwnedForm, db: DB):
    return svc.response_out(svc.get_response(db, form, response_id))


@router.delete("/responses/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_response(response_id: str, form: OwnedForm, db: DB):
    svc.delete_response(db, form, response_id)


@router.get("/summary", response_model=FormSummary)
def summary(form: OwnedForm, db: DB):
    return form_summary(db, form)
