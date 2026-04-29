FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY . .

# Create uploads dir (fallback, GCS is primary)
RUN mkdir -p uploads

EXPOSE 8080

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
