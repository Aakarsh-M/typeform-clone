"""Runtime configuration read from environment variables.

DATABASE_URL  - SQLAlchemy URL. On hosted deploys, point this at a file on a
                persistent volume (e.g. sqlite:////data/typeform.db), otherwise
                the database is wiped on every redeploy.
CORS_ORIGINS  - comma-separated list of frontend origins allowed to call the API.
"""

import os

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./typeform.db")

CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# Real authentication is out of scope for the assignment: every creator-side
# request acts as this seeded user.
DEFAULT_USER_EMAIL: str = "creator@example.com"
DEFAULT_USER_NAME: str = "Demo Creator"
