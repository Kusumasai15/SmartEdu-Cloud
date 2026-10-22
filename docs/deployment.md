# SmartEdu Cloud — Deployment Guide

## 1. Prerequisites
- Docker Engine $\ge$ 24.0 & Docker Compose $\ge$ 2.20
- PostgreSQL 16 (or managed RDS/Cloud SQL)
- Redis 7 (or managed ElastiCache/MemoryStore)
- Python 3.13 & Node.js 20 (for local execution)

## 2. Docker Compose Deployment
1. Clone repository and copy environment template:
   ```bash
   cp .env.example .env
   # Edit .env with secure production credentials
   ```
2. Build and launch all services in detached mode:
   ```bash
   docker compose up -d --build
   ```
3. Apply database migrations:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
4. Access endpoints:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000/api/v1`
   - Health Probe: `http://localhost:8000/health`
