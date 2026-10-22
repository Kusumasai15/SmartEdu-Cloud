"""Health Check API Endpoint."""
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_database_connection
from app.core.redis import check_redis_connection
from app.schemas.health import HealthStatus
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/health", response_model=APIResponse[HealthStatus], summary="System Health Probe")
def get_system_health() -> APIResponse[HealthStatus]:
    """Retrieve operational health status of the API and its dependent services.
    
    Returns:
        APIResponse[HealthStatus]: Envelope containing current service status.
    """
    db_connected = check_database_connection()
    redis_connected = check_redis_connection()

    services_status = {
        "database": "connected" if db_connected else "disconnected",
        "redis": "connected" if redis_connected else "disconnected",
    }

    overall_status = "healthy" if db_connected else "degraded"

    payload = HealthStatus(
        status=overall_status,
        app_name=settings.APP_NAME,
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        services=services_status,
    )

    return APIResponse(
        success=True,
        data=payload,
        message=f"{settings.APP_NAME} API v1 is operational",
    )
