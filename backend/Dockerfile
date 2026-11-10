FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY seed.py start.sh ./

# Point DATABASE_URL at a mounted volume in production, e.g.
# sqlite:////data/typeform.db, so data survives redeploys.
EXPOSE 8000
CMD ["sh", "start.sh"]
