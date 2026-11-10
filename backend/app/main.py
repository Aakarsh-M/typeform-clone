"""FastAPI application entry point.

Run locally:  uvicorn app.main:app --reload
API docs:     http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGIN_REGEX, CORS_ORIGINS
from app.database import Base, engine
from app.routers import forms, public, results


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # The schema is small and SQLite-only, so tables are created on startup
    # instead of running a migration tool.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Typeform Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms.router)
app.include_router(results.router)
app.include_router(public.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
