FROM python:3.11-slim

WORKDIR /app

# Install OS dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker cache
COPY requirements.txt .

# Increase timeout for large packages like torch/transformers
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# Download spacy model separately
RUN python -m spacy download en_core_web_sm

# Copy the application code specifically
COPY app/ ./app/

# Set PYTHONPATH
ENV PYTHONPATH=/app

EXPOSE 8000

HEALTHCHECK --interval=60s --timeout=30s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]
