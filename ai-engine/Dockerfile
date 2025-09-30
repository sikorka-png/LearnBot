FROM python:3.11-slim

WORKDIR /app

COPY credentials.json /app/credentials.json
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./ai ./ai

CMD ["uvicorn", "ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
