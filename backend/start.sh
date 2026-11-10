#!/bin/sh
# Seed demo data on first boot (no-op when forms already exist), then serve.
set -e
python seed.py
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
