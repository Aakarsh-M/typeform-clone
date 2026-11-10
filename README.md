# Typeform Clone

A functional clone of Typeform. Creators build forms in a three-panel builder, publish them to a public link, and read results. Respondents fill them in Typeform's signature way: one question at a time, full screen, with smooth transitions and keyboard shortcuts. No login is needed to respond.

- **Live demo:** _add your deployed URL here_
- **Seeded forms:** `/to/feedback` and `/to/meetup` are published and already have responses.

## Features

**Builder** (`/forms/:id/create`)
- Three panels: question list, live canvas, settings
- Add questions from a grouped picker (inserted after the selected one); 8 types: short text, long text, multiple choice, dropdown, email, number, yes/no, rating
- Edit title, description and choice labels inline on the canvas, which renders the same component respondents see
- Drag and drop to reorder; duplicate and delete from each question's menu
- Per-question settings: required, multiple selection, randomize choices, max characters, number min/max, rating steps and shape, placeholder
- Desktop / mobile canvas toggle and a full-screen preview that saves nothing
- Edits save automatically (debounced) with a "Saving / Saved" indicator
- Design tab with 5 theme presets; editable thank-you screen
- Logic tab and file-upload / payment types are "Coming soon" placeholders

**Form management** (`/`)
- Workspace list (or grid) with status, question and response counts, sorting
- Create, rename (in the workspace or inline in the top bar), duplicate and delete, with modals and toasts
- Publish / unpublish; share page with a copyable public link

**Respondent flow** (`/to/:publicId`)
- One question per screen with slide transitions and a progress bar
- Keyboard: `Enter` to continue, `Shift+Enter` for a new line in long text, `A`–`Z` to pick choices, `Y`/`N` for yes/no, `1`–`9` (`0` = 10) for ratings, `↑`/`↓` to move between questions
- Single-choice, yes/no, rating and dropdown advance automatically after a pick
- Validation on the client for instant feedback and again on the server (required, email format, number range, valid choices, rating range)
- Thank-you screen; unpublished or unknown links show a "closed" page

**Results** (`/forms/:id/results`)
- Responses, starts and completion rate
- Summary per question: choice counts and percentages, rating average and distribution, yes/no split, number average/min/max, latest text answers
- Responses table with paging; open any response in full in a side drawer; delete a response
- CSV export

**Bonus items done:** theme presets, CSV export, completion-rate tracking.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Framer Motion (transitions), dnd-kit (drag and drop), Zustand (builder state), Sonner (toasts), Lucide icons |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | SQLite |

## Local setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python seed.py            # creates typeform.db with demo data; --reset to start over
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs. Run the tests with `pytest`.

### Frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

The app runs at http://localhost:3000.

### Environment variables

| Variable | Where | Default |
|---|---|---|
| `DATABASE_URL` | backend | `sqlite:///./typeform.db` |
| `CORS_ORIGINS` | backend | `http://localhost:3000` (comma-separated) |
| `CORS_ORIGIN_REGEX` | backend | unset (e.g. `https://.*\.vercel\.app` for preview deploys) |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` |

## Deployment

**Backend (Railway, Render or any Docker host).** `backend/Dockerfile` installs dependencies and runs `start.sh`, which seeds demo data on first boot (it does nothing once forms exist) and starts uvicorn on `$PORT`.

1. Create a service from the repo with root directory `backend`.
2. Attach a persistent volume at `/data` and set `DATABASE_URL=sqlite:////data/typeform.db`. Without a volume the SQLite file is lost on every redeploy.
3. Set `CORS_ORIGINS` to the frontend URL, e.g. `https://your-app.vercel.app`.

**Frontend (Vercel).** Import the repo with root directory `frontend` and set `NEXT_PUBLIC_API_URL` to the backend URL.

## Architecture

```
backend/
  app/main.py              FastAPI app, CORS, routers, table creation on startup
  app/models.py            SQLAlchemy schema
  app/schemas.py           Pydantic request/response bodies
  app/deps.py              shared dependencies: DB session, current user, owned form
  app/routers/             HTTP layer only: forms.py, results.py, public.py
  app/services/            business logic: forms.py, responses.py, stats.py
  app/validation.py        per-type answer validators
  app/question_types.py    per-type default properties
  seed.py                  demo data, submitted through the real validation path
  tests/test_api.py        end-to-end API tests

frontend/src/
  app/                     routes: / · /forms/[id]/{create,connect,share,results} · /to/[publicId]
  lib/api.ts               typed API client; the only code that calls the backend
  lib/types.ts             TypeScript mirrors of the API schemas
  lib/formStore.ts         Zustand store for the open form: optimistic edits, debounced saves
  lib/validation.ts        client-side answer validation (same rules as the server)
  lib/questionTypes.ts     per-type UI registry: label, icon, color, group
  lib/themes.ts            theme presets → CSS variables
  components/respondent/   FormRunner (state + transitions), QuestionView, one input per type
  components/builder/      QuestionList (dnd), Canvas, SettingsPanel, AddQuestionModal, PreviewModal
  components/workspace/    forms list, actions menu
  components/results/      summary cards, responses table and drawer
  components/form-shell/   top bar (tabs, rename, publish) and FormGate (loading/error)
  components/ui/, common/  Button, Modal, Menu, Toggle, prompts, share link
```

Key decisions:

- **Thin routers, logic in services.** Routers parse input, call a service and return a schema. Services are testable on their own, and the seed script reuses them, so seed data goes through the same validation as real submissions.
- **One question renderer everywhere.** `QuestionView` renders the live form, the full-screen preview and the builder canvas. In the builder it receives editor callbacks, so titles and choices become editable in place. The preview cannot drift from what respondents see.
- **Inputs own their shortcuts.** Each input registers its keys (letters, Y/N, digits) and marks handled events, then the runner handles Enter and arrows. Child effects register first, so inputs always get the first chance.
- **Optimistic builder.** The UI updates immediately. Text edits are debounced per question and requests for the same question run in order. New choices get temporary negative ids until the server returns real ones. On failure a toast appears and the form reloads from the server.
- **Validation twice.** The client gives instant feedback; the server is authoritative and returns a 422 with an error per question, and the runner jumps to the first one.

## Database schema

```
users ──< forms ──< questions ──< question_choices
            │           │               │
            └──< responses ──< answers ──< answer_choices >──┘
```

| Table | Columns |
|---|---|
| `users` | id, name, email (unique), created_at |
| `forms` | id, owner_id → users, public_id (unique), title, status (`draft`/`published`), settings JSON, created_at, updated_at, published_at |
| `questions` | id, form_id → forms, position, type, title, description, required, properties JSON, created_at, updated_at, deleted_at |
| `question_choices` | id, question_id → questions, position, label, deleted_at |
| `responses` | id (UUID), form_id → forms, status (`in_progress`/`completed`), started_at, submitted_at, user_agent |
| `answers` | id, response_id → responses, question_id → questions, value_text, value_number, value_bool; unique (response_id, question_id) |
| `answer_choices` | answer_id → answers, choice_id → question_choices (composite primary key) |

Indexes: `questions(form_id, position)`, `responses(form_id, status)`, plus foreign-key indexes on choices and answers. Foreign keys cascade on delete, enforced in SQLite with `PRAGMA foreign_keys=ON`.

Why it looks like this:

- **Typed answer columns** instead of a JSON value, so summary stats are SQL aggregates (`AVG`, `GROUP BY`).
- **Choices are rows**, referenced by id from answers, so renaming a choice doesn't corrupt historical counts.
- **`answer_choices`** supports multi-select answers.
- **Soft delete** (`deleted_at`) for questions and choices that already have answers, so old responses still display and export. Unanswered ones are hard-deleted.
- **A question's type is locked once it has answers** (409), since stored answers would no longer match it.
- **JSON only for config that is never queried**: `forms.settings` (theme, thank-you screen) and `questions.properties` (rating steps, min/max, multi-select).
- **Unguessable public ids**: responses use UUIDs and form links use a short random `public_id`, not sequential ids.
- **`in_progress` responses** are created when a respondent answers their first question, which gives the completion rate.

## API overview

Creator endpoints (acting as the default creator):

| Method | Path | Purpose |
|---|---|---|
| GET / POST | `/api/forms` | List forms with status and counts / create |
| GET / PATCH / DELETE | `/api/forms/{id}` | Get with questions / rename or update settings / delete |
| POST | `/api/forms/{id}/duplicate` | Copy as a new draft |
| POST | `/api/forms/{id}/publish`, `/api/forms/{id}/unpublish` | Open or close the public link |
| POST | `/api/forms/{id}/questions` | Add a question, optionally at a position |
| PUT | `/api/forms/{id}/questions/order` | Reorder (full ordered list of ids) |
| PATCH / DELETE | `/api/questions/{id}` | Edit (including the full choice list) / delete |
| GET | `/api/forms/{id}/responses?page=&page_size=` | Completed responses, newest first |
| GET / DELETE | `/api/forms/{id}/responses/{response_id}` | One response / delete it |
| GET | `/api/forms/{id}/summary` | Per-question stats, starts, completion rate |
| GET | `/api/forms/{id}/responses.csv` | CSV export |

Public endpoints (no auth, published forms only):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/forms/{public_id}` | Form definition for respondents |
| POST | `/api/public/forms/{public_id}/responses/start` | Begin a response (completion tracking) |
| POST | `/api/public/forms/{public_id}/responses` | Submit answers; 422 with per-question messages if invalid |

## Assumptions

- Authentication is simplified to one default creator (`app/deps.py::current_user`); replacing it with real auth only changes that function.
- Edits to a published form go live immediately; there is no separate "publish changes" step.
- Answers are stored on final submit; partially filled answers are not saved.
- Tables are created on startup (`create_all`) rather than through migrations, given the SQLite-only scope.
- Typeform's fonts and logo are proprietary, so the app uses Inter and a generic wordmark.
- Logic jumps, integrations, team sharing, file upload and payment are placeholders.
