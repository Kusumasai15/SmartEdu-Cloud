"""Service for Backend System Health, Error Monitoring, and Operational Checks."""

import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.redis import check_redis_connection
from app.administration.schemas import SystemHealthResponse, ServiceHealthItem


def check_system_health(db: Session) -> SystemHealthResponse:
    """Run real-time diagnostics on all major system services."""
    services = []

    # 1. Database Check
    db_start = time.time()
    try:
        db.execute(text("SELECT 1")).scalar()
        db_latency = (time.time() - db_start) * 1000.0
        services.append(
            ServiceHealthItem(
                service_name="PostgreSQL Database",
                status="HEALTHY",
                latency_ms=round(db_latency, 2),
                message="Database query succeeded.",
            )
        )
    except Exception as exc:
        services.append(
            ServiceHealthItem(
                service_name="PostgreSQL Database",
                status="DOWN",
                message="Database query failed.",
            )
        )

    redis_start = time.time()
    redis_ok = check_redis_connection()
    services.append(
        ServiceHealthItem(
            service_name="Redis",
            status="HEALTHY" if redis_ok else "DOWN",
            latency_ms=round((time.time() - redis_start) * 1000.0, 2),
            message="Ping succeeded." if redis_ok else "Ping failed.",
        )
    )

    overall_status = "HEALTHY"
    if any(s.status == "DOWN" for s in services):
        overall_status = "DOWN"
    elif any(s.status == "DEGRADED" for s in services):
        overall_status = "DEGRADED"

    return SystemHealthResponse(
        overall_status=overall_status,
        checked_at=datetime.now(timezone.utc),
        services=services,
    )
