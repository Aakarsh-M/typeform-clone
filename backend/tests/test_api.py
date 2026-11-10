"""End-to-end API tests against a throwaway SQLite database."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db, make_engine
from app.main import app


@pytest.fixture()
def client(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_form(client, title="Survey"):
    form = client.post("/api/forms", json={"title": title}).json()
    fid = form["id"]
    q = lambda **body: client.post(f"/api/forms/{fid}/questions", json=body).json()
    questions = {
        "name": q(type="short_text", title="Name?", required=True),
        "email": q(type="email", title="Email?", required=True),
        "color": q(type="multiple_choice", title="Color?", choices=[{"label": "Red"}, {"label": "Blue"}]),
        "tags": q(type="multiple_choice", title="Tags?", properties={"allow_multiple": True},
                  choices=[{"label": "A"}, {"label": "B"}, {"label": "C"}]),
        "track": q(type="dropdown", title="Track?"),
        "age": q(type="number", title="Age?", properties={"min": 0, "max": 120}),
        "ok": q(type="yes_no", title="OK?"),
        "stars": q(type="rating", title="Stars?", properties={"steps": 5}),
        "notes": q(type="long_text", title="Notes?"),
    }
    return fid, questions


def valid_answers(qs):
    return [
        {"question_id": qs["name"]["id"], "value": "Ada"},
        {"question_id": qs["email"]["id"], "value": "ada@example.com"},
        {"question_id": qs["color"]["id"], "value": [qs["color"]["choices"][1]["id"]]},
        {"question_id": qs["tags"]["id"], "value": [c["id"] for c in qs["tags"]["choices"][:2]]},
        {"question_id": qs["track"]["id"], "value": qs["track"]["choices"][0]["id"]},
        {"question_id": qs["age"]["id"], "value": 36},
        {"question_id": qs["ok"]["id"], "value": True},
        {"question_id": qs["stars"]["id"], "value": 4},
    ]


def test_form_crud_and_listing(client):
    fid, qs = make_form(client)
    forms = client.get("/api/forms").json()
    assert forms[0]["title"] == "Survey"
    assert forms[0]["created_at"].endswith("+00:00")  # timestamps carry their UTC offset
    assert forms[0]["status"] == "draft"
    assert forms[0]["question_count"] == 9

    assert client.patch(f"/api/forms/{fid}", json={"title": "Renamed"}).json()["title"] == "Renamed"
    settings = client.patch(f"/api/forms/{fid}", json={"settings": {"theme": {"preset": "dark"}}}).json()["settings"]
    assert settings["theme"] == {"preset": "dark"}
    assert "thank_you" in settings  # shallow merge kept the other section

    dup = client.post(f"/api/forms/{fid}/duplicate").json()
    assert dup["title"] == "Renamed (copy)"
    assert len(dup["questions"]) == 9
    assert dup["public_id"] != forms[0]["public_id"]

    assert client.delete(f"/api/forms/{fid}").status_code == 204
    assert client.get(f"/api/forms/{fid}").status_code == 404
    assert len(client.get("/api/forms").json()) == 1


def test_question_defaults_reorder_and_delete(client):
    fid, qs = make_form(client)
    assert [c["label"] for c in qs["track"]["choices"]] == ["Option 1", "Option 2"]
    assert qs["stars"]["properties"]["steps"] == 5

    ids = [q["id"] for q in client.get(f"/api/forms/{fid}").json()["questions"]]
    reordered = client.put(f"/api/forms/{fid}/questions/order", json={"question_ids": ids[::-1]}).json()
    assert [q["id"] for q in reordered["questions"]] == ids[::-1]
    assert [q["position"] for q in reordered["questions"]] == list(range(9))

    bad = client.put(f"/api/forms/{fid}/questions/order", json={"question_ids": ids[:3]})
    assert bad.status_code == 400

    # insert at a position
    inserted = client.post(f"/api/forms/{fid}/questions", json={"type": "short_text", "position": 0}).json()
    assert client.get(f"/api/forms/{fid}").json()["questions"][0]["id"] == inserted["id"]

    assert client.delete(f"/api/questions/{inserted['id']}").status_code == 204
    assert len(client.get(f"/api/forms/{fid}").json()["questions"]) == 9


def test_choice_sync_keeps_ids(client):
    fid, qs = make_form(client)
    color = qs["color"]
    red, blue = color["choices"]
    updated = client.patch(
        f"/api/questions/{color['id']}",
        json={"choices": [{"id": blue["id"], "label": "Navy"}, {"label": "Green"}]},
    ).json()
    labels = [c["label"] for c in updated["choices"]]
    assert labels == ["Navy", "Green"]
    assert updated["choices"][0]["id"] == blue["id"]


def test_publish_and_public_access(client):
    fid, qs = make_form(client)
    public_id = client.get(f"/api/forms/{fid}").json()["public_id"]

    assert client.get(f"/api/public/forms/{public_id}").status_code == 404  # draft
    client.post(f"/api/forms/{fid}/publish")
    public = client.get(f"/api/public/forms/{public_id}").json()
    assert public["title"] == "Survey"
    assert "id" not in public

    client.post(f"/api/forms/{fid}/unpublish")
    assert client.get(f"/api/public/forms/{public_id}").status_code == 404


def test_cannot_publish_empty_form(client):
    fid = client.post("/api/forms", json={"title": "Empty"}).json()["id"]
    assert client.post(f"/api/forms/{fid}/publish").status_code == 400


def test_server_validation(client):
    fid, qs = make_form(client)
    pid = client.post(f"/api/forms/{fid}/publish").json()["public_id"]
    url = f"/api/public/forms/{pid}/responses"

    answers = valid_answers(qs)
    answers[0]["value"] = "   "  # required, blank
    answers[1]["value"] = "not-an-email"
    answers[2]["value"] = [c["id"] for c in qs["color"]["choices"]]  # two picks, single-select
    answers[5]["value"] = 500  # above max
    answers[7]["value"] = 9  # above steps
    r = client.post(url, json={"answers": answers})
    assert r.status_code == 422
    errors = r.json()["detail"]["errors"]
    assert errors[str(qs["name"]["id"])] == "Please fill this in"
    assert "email" in errors[str(qs["email"]["id"])]
    assert str(qs["color"]["id"]) in errors
    assert str(qs["age"]["id"]) in errors
    assert str(qs["stars"]["id"]) in errors

    # nothing was stored
    assert client.get(f"/api/forms/{fid}/responses").json()["total"] == 0

    foreign = client.post(url, json={"answers": [{"question_id": 99999, "value": "x"}]})
    assert foreign.status_code == 400


def test_submit_results_summary_and_csv(client):
    fid, qs = make_form(client)
    pid = client.post(f"/api/forms/{fid}/publish").json()["public_id"]

    started = client.post(f"/api/public/forms/{pid}/responses/start").json()["response_id"]
    client.post(f"/api/public/forms/{pid}/responses/start")  # one abandoned
    r = client.post(
        f"/api/public/forms/{pid}/responses",
        json={"response_id": started, "answers": valid_answers(qs)},
    )
    assert r.status_code == 201
    again = client.post(
        f"/api/public/forms/{pid}/responses",
        json={"response_id": started, "answers": valid_answers(qs)},
    )
    assert again.status_code == 409

    page = client.get(f"/api/forms/{fid}/responses").json()
    assert page["total"] == 1
    one = client.get(f"/api/forms/{fid}/responses/{started}").json()
    displays = {a["question_id"]: a["display"] for a in one["answers"]}
    assert displays[qs["tags"]["id"]] == "A, B"
    assert displays[qs["ok"]["id"]] == "Yes"
    assert displays[qs["age"]["id"]] == "36"

    summary = client.get(f"/api/forms/{fid}/summary").json()
    assert summary["started"] == 2 and summary["completed"] == 1
    assert summary["completion_rate"] == 50.0
    by_id = {q["question_id"]: q for q in summary["questions"]}
    color = by_id[qs["color"]["id"]]
    assert [c["count"] for c in color["choices"]] == [0, 1]
    assert by_id[qs["stars"]["id"]]["distribution"]["4"] == 1
    assert by_id[qs["notes"]["id"]]["skipped"] == 1
    assert client.get("/api/forms").json()[0]["response_count"] == 1

    csv = client.get(f"/api/forms/{fid}/responses.csv")
    assert csv.headers["content-type"].startswith("text/csv")
    header, row = csv.text.strip().splitlines()
    assert "Name?" in header and "ada@example.com" in row


def test_answered_question_soft_delete_and_type_lock(client):
    fid, qs = make_form(client)
    pid = client.post(f"/api/forms/{fid}/publish").json()["public_id"]
    client.post(f"/api/public/forms/{pid}/responses", json={"answers": valid_answers(qs)})

    locked = client.patch(f"/api/questions/{qs['age']['id']}", json={"type": "short_text"})
    assert locked.status_code == 409

    # removing an answered choice soft-deletes it; old response still renders
    color = qs["color"]
    client.patch(f"/api/questions/{color['id']}", json={"choices": [color["choices"][0]]})
    client.delete(f"/api/questions/{qs['name']['id']}")

    form = client.get(f"/api/forms/{fid}").json()
    assert qs["name"]["id"] not in [q["id"] for q in form["questions"]]
    resp = client.get(f"/api/forms/{fid}/responses").json()["items"][0]
    displays = {a["question_id"]: a["display"] for a in resp["answers"]}
    assert displays[qs["name"]["id"]] == "Ada"
    assert displays[color["id"]] == "Blue"
    assert "Name?" in client.get(f"/api/forms/{fid}/responses.csv").text
