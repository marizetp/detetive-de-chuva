FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Ensure baseline is verified / ready
RUN python -c "from src.baseline_engine import BaselineEngine; BaselineEngine().load_baseline()"

EXPOSE 8000

# Use PORT environment variable passed by PaaS or default to 8000
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
