"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Form, User
from app.services.forms import get_form, get_or_create_default_user

DB = Annotated[Session, Depends(get_db)]


def current_user(db: DB) -> User:
    # Auth is simplified per the assignment: everyone is the default creator.
    # Swapping this for real session/JWT auth touches only this function.
    return get_or_create_default_user(db)


CurrentUser = Annotated[User, Depends(current_user)]


def owned_form(form_id: int, db: DB, user: CurrentUser) -> Form:
    return get_form(db, user, form_id)


OwnedForm = Annotated[Form, Depends(owned_form)]
