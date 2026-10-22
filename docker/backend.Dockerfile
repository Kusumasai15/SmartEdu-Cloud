# ==============================================================================
# SmartEdu Cloud - Backend Dockerfile (FastAPI / Python 3.13)
# ==============================================================================
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and general utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and Alembic migrations
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Set Python unbuffered mode for real-time log output
ENV PYTHONUNBUFFERED=1

# Run Uvicorn production server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
