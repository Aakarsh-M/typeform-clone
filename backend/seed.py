"""Seed the database with demo forms and responses.

    python seed.py          # seed only if the database has no forms yet
    python seed.py --reset  # drop everything and reseed

Responses go through the same validation/submit service the API uses, so the
seed data is guaranteed to be valid.
"""

import random
import sys
from datetime import timedelta

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Form, QuestionType, Response, ResponseStatus, utcnow
from app.schemas import AnswerIn, ChoiceIn, QuestionCreate
from app.services.forms import add_question, create_form, get_or_create_default_user, set_published
from app.services.responses import submit_response

T = QuestionType
rng = random.Random(42)  # deterministic seed data

FIRST_NAMES = ["Aarav", "Priya", "Liam", "Sofia", "Kenji", "Amara", "Noah", "Isha", "Mateo",
               "Zara", "Ethan", "Meera", "Lucas", "Ananya", "Oliver", "Riya", "Leo", "Diya"]

FORMS = [
    {
        "title": "Customer Feedback Survey",
        "public_id": "feedback",
        "publish": True,
        "responses": 18,
        "abandoned": 5,
        "thank_you": {
            "title": "Thanks for the feedback! 🙌",
            "description": "We read every response and use it to make the product better.",
        },
        "questions": [
            dict(type=T.short_text, title="Hi there! What's your first name?", required=True),
            dict(type=T.email, title="Thanks! What's the best email to reach you?",
                 description="We'll only use it to follow up on your feedback.", required=True),
            dict(type=T.rating, title="How would you rate your overall experience?",
                 required=True, properties={"steps": 5, "shape": "star"}),
            dict(type=T.multiple_choice, title="How did you hear about us?",
                 choices=["Search engine", "Social media", "Friend or colleague", "Blog or article", "Other"]),
            dict(type=T.multiple_choice, title="Which features do you use most?",
                 properties={"allow_multiple": True},
                 choices=["Form builder", "Templates", "Integrations", "Analytics", "Logic jumps"]),
            dict(type=T.yes_no, title="Would you recommend us to a friend?", required=True),
            dict(type=T.long_text, title="Anything else you'd like to tell us?",
                 description="Bugs, ideas, compliments — all welcome."),
        ],
    },
    {
        "title": "Tech Meetup 2026 — Registration",
        "public_id": "meetup",
        "publish": True,
        "responses": 12,
        "abandoned": 3,
        "thank_you": {
            "title": "You're registered! 🎉",
            "description": "Check your inbox for the calendar invite. See you there.",
        },
        "questions": [
            dict(type=T.short_text, title="What's your full name?", required=True),
            dict(type=T.email, title="Your email address", required=True),
            dict(type=T.dropdown, title="Which track are you most interested in?", required=True,
                 choices=["AI & Machine Learning", "Web Development", "Cloud & DevOps",
                          "Mobile", "Design Systems"]),
            dict(type=T.number, title="How many years of professional experience do you have?",
                 properties={"min": 0, "max": 60}),
            dict(type=T.multiple_choice, title="Any dietary requirements?",
                 properties={"allow_multiple": True},
                 choices=["Vegetarian", "Vegan", "Gluten-free", "None"]),
            dict(type=T.yes_no, title="Will you need parking?"),
            dict(type=T.rating, title="How excited are you, on a scale of 1 to 10?",
                 properties={"steps": 10, "shape": "number"}),
        ],
    },
    {
        "title": "Product Research (draft)",
        "publish": False,
        "responses": 0,
        "abandoned": 0,
        "questions": [
            dict(type=T.short_text, title="What's your role?"),
            dict(type=T.long_text, title="What's the biggest pain point in your workflow?",
                 required=True),
            dict(type=T.number, title="How many people are on your team?"),
        ],
    },
]

LONG_TEXT_SAMPLES = [
    "Loving the new builder, super smooth.",
    "Would be great to have more templates for HR teams.",
    "The mobile experience could be faster.",
    "Support was quick and friendly, thanks!",
    "Please add a dark mode.",
    "Exporting to CSV saved me hours this week.",
]


def fake_answer(question, name: str):
    """Plausible random answer for a question, or None to skip optional ones."""
    if not question.required and rng.random() < 0.2:
        return None
    t = question.type
    if t == T.short_text:
        return name if "name" in question.title.lower() else rng.choice(["Engineer", "Designer", "PM"])
    if t == T.email:
        return f"{name.lower()}{rng.randint(1, 99)}@example.com"
    if t == T.long_text:
        return rng.choice(LONG_TEXT_SAMPLES)
    if t == T.number:
        return rng.randint(0, 15)
    if t == T.yes_no:
        return rng.random() < 0.75
    if t == T.rating:
        steps = question.properties["steps"]
        return rng.choices(range(1, steps + 1), weights=range(1, steps + 1))[0]  # skew positive
    choice_ids = [c.id for c in question.active_choices]
    if question.properties.get("allow_multiple"):
        return rng.sample(choice_ids, rng.randint(1, min(3, len(choice_ids))))
    return rng.choice(choice_ids)


def seed(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if not reset and db.scalar(select(Form.id).limit(1)) is not None:
            print("Database already has forms; run with --reset to reseed.")
            return

        user = get_or_create_default_user(db)
        now = utcnow()

        for spec in FORMS:
            form = create_form(db, user, spec["title"])
            if "public_id" in spec:
                form.public_id = spec["public_id"]  # stable demo links: /to/feedback
            if "thank_you" in spec:
                form.settings = {**form.settings, "thank_you": spec["thank_you"]}
            for q in spec["questions"]:
                choices = [ChoiceIn(label=l) for l in q.pop("choices", [])] or None
                add_question(db, form, QuestionCreate(**q, choices=choices))
            if spec["publish"]:
                set_published(db, form, True)
                form.published_at = now - timedelta(days=15)

            for _ in range(spec["responses"]):
                name = rng.choice(FIRST_NAMES)
                answers = [
                    AnswerIn(question_id=q.id, value=fake_answer(q, name))
                    for q in form.active_questions
                ]
                response = submit_response(db, form, answers, None, "seed-script")
                # Spread submissions over the last two weeks for realistic tables.
                submitted = now - timedelta(minutes=rng.randint(10, 14 * 24 * 60))
                response.submitted_at = submitted
                response.started_at = submitted - timedelta(seconds=rng.randint(40, 400))

            for _ in range(spec["abandoned"]):
                db.add(Response(form=form, status=ResponseStatus.in_progress,
                                started_at=now - timedelta(hours=rng.randint(1, 300))))
            db.commit()
            print(f"  {form.title}: {len(form.active_questions)} questions, "
                  f"{spec['responses']} responses, public id {form.public_id}")
        print("Seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
