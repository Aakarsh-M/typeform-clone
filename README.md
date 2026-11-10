# Typeform Clone

A functional clone of Typeform: build forms with a drag-and-drop builder, publish them via a public link, collect responses through the one-question-at-a-time conversational flow, and view results.

> **Status:** Phase 1 complete (backend API, schema, seed data, frontend scaffold). The builder, respondent flow and results UI are in progress.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Framer Motion, dnd-kit, Zustand, Sonner |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | SQLite |

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py            # creates typeform.db with demo forms; --reset to start over
uvicorn app.main:app --reload
```

API runs on http://localhost:8000; interactive docs at http://localhost:8000/docs.
Run tests with `pytest`.

### Frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

App runs on http://localhost:3000. Seeded public forms: `/to/feedback` and `/to/meetup`.

### Environment variables

| Variable | Where | Default |
|---|---|---|
| `DATABASE_URL` | backend | `sqlite:///./typeform.db` |
| `CORS_ORIGINS` | backend | `http://localhost:3000` (comma-separated) |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` |

## Architecture

```
frontend/  Next.js app (client-rendered pages calling the API)
  src/app/                  routes: / (workspace), /forms/[id]/{create,connect,share,results}, /to/[publicId]
  src/lib/api.ts            typed API client, the only place that talks to the backend
  src/lib/types.ts          TypeScript mirrors of the backend schemas
  src/lib/questionTypes.ts  per-type UI registry (label, icon, color)
  src/lib/validation.ts     client-side answer validation (same rules as server)

backend/   FastAPI app
  app/models.py             SQLAlchemy schema
  app/schemas.py            Pydantic request/response bodies
  app/routers/              HTTP layer only: forms, results, public
  app/services/             business logic: forms, responses, stats
  app/validation.py         per-type server-side answer validation
  app/question_types.py     per-type default properties
  seed.py                   demo data, submitted through the real validation path
  tests/                    end-to-end API tests
```

Routers stay thin: they parse input, call a service, and return a schema. Services hold the logic, which keeps it testable and lets the seed script reuse it.

## Database schema

```
users ──< forms ──< questions ──< question_choices
            │           │               │
            └──< responses ──< answers ──< answer_choices >──┘
```

| Table | Key columns |
|---|---|
| `users` | id, name, email (unique) |
| `forms` | id, owner_id → users, public_id (unique slug), title, status (draft/published), settings JSON, created_at, updated_at, published_at |
| `questions` | id, form_id → forms, position, type, title, description, required, properties JSON, deleted_at |
| `question_choices` | id, question_id → questions, position, label, deleted_at |
| `responses` | id (UUID), form_id → forms, status (in_progress/completed), started_at, submitted_at, user_agent |
| `answers` | id, response_id → responses, question_id → questions, value_text, value_number, value_bool; unique (response_id, question_id) |
| `answer_choices` | answer_id → answers, choice_id → question_choices (composite PK) |

Design decisions:

- **Typed answer columns** rather than a JSON value, so summary stats are SQL aggregates (`AVG`, `GROUP BY`).
- **Choices in their own table**, referenced by id from answers, so renaming a choice doesn't break historical counts.
- **`answer_choices` join table** supports multi-select answers.
- **Soft delete** (`deleted_at`) for questions and choices that already have answers, so past responses still render and export. Unanswered ones are hard-deleted.
- **A question's type is locked once it has answers** (409), since old answers would no longer match the type.
- **JSON only for non-queried config**: `forms.settings` (theme, thank-you screen) and `questions.properties` (rating steps, min/max, allow_multiple).
- **Response ids are UUIDs** because respondents hold them without logging in; form links use a short random `public_id`, not the numeric id.
- **`in_progress` responses** are created when a respondent starts, which gives the completion rate.

## API overview

Creator endpoints (default creator, no login):

| Method | Path | Purpose |
|---|---|---|
| GET / POST | `/api/forms` | List forms (with status and response count) / create |
| GET / PATCH / DELETE | `/api/forms/{id}` | Get with questions / rename or update settings / delete |
| POST | `/api/forms/{id}/duplicate` | Duplicate as a new draft |
| POST | `/api/forms/{id}/publish`, `/unpublish` | Toggle the public link |
| POST | `/api/forms/{id}/questions` | Add a question (optionally at a position) |
| PUT | `/api/forms/{id}/questions/order` | Reorder (full ordered id list) |
| PATCH / DELETE | `/api/questions/{id}` | Edit (incl. choices) / delete |
| GET | `/api/forms/{id}/responses` | Paginated completed responses |
| GET / DELETE | `/api/forms/{id}/responses/{rid}` | One response / delete it |
| GET | `/api/forms/{id}/summary` | Per-question stats and completion rate |
| GET | `/api/forms/{id}/responses.csv` | CSV export |

Public endpoints (no auth, published forms only):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/forms/{public_id}` | Form definition for the respondent |
| POST | `/api/public/forms/{public_id}/responses/start` | Begin a response (completion tracking) |
| POST | `/api/public/forms/{public_id}/responses` | Submit answers; 422 with per-question errors if invalid |

## Assumptions

- Authentication is simplified to a single default creator (`app/deps.py::current_user`).
- Edits to a published form are live immediately; there is no separate "publish changes" step.
- Answers are stored on final submit only; partial answers are not saved mid-flow.
- Tables are created on startup (`create_all`) rather than via migrations, given the SQLite-only scope.
- The font is Inter, since Typeform's own typefaces are proprietary.
