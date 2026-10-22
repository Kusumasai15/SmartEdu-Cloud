"""Main FastAPI Application Entrypoint for SmartEdu Cloud."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.middleware import AuthRateLimitMiddleware, CorrelationIdMiddleware
from app.core.database import check_database_connection, SessionLocal, engine, Base
from app.core.redis import check_redis_connection
from app.db.seed import init_roles_and_permissions, seed_database
from app.administration.services.policy_service import get_or_create_default_policies
from app.schemas.response import APIErrorResponse, ErrorDetail

# Configure structured root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("smartedu.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle management."""
    logger.info("Starting %s in [%s] mode...", settings.APP_NAME, settings.ENVIRONMENT)
    try:
        # Local development can create tables automatically. Production schema changes
        # must be applied by Alembic before the service starts.
        if settings.ENVIRONMENT.lower() not in {"production", "prod"}:
            Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            init_roles_and_permissions(db)
            get_or_create_default_policies(db)
            logger.info("Database schema and production policies ready (Zero Dummy Data).")
        finally:
            db.close()
    except Exception as exc:
        logger.exception("Database initialization failed")
        raise RuntimeError("Database initialization failed; refusing to start") from exc

    yield
    logger.info("Shutting down %s...", settings.APP_NAME)


def create_application() -> FastAPI:
    """Factory creating and configuring the production-hardened FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="SmartEdu Cloud — Advanced Cloud-Based Learning Management System API",
        version="1.0.0",
        docs_url="/docs" if settings.PUBLIC_API_DOCS or settings.ENVIRONMENT.lower() != "production" else None,
        redoc_url="/redoc" if settings.PUBLIC_API_DOCS or settings.ENVIRONMENT.lower() != "production" else None,
        openapi_url="/openapi.json" if settings.PUBLIC_API_DOCS or settings.ENVIRONMENT.lower() != "production" else None,
        lifespan=lifespan,
    )

    # 1. Register request throttling, correlation ID & security headers middleware
    app.add_middleware(AuthRateLimitMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    if "*" not in settings.ALLOWED_HOSTS and settings.ALLOWED_HOSTS:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

    # 2. Configure CORS middleware
    cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 3. Register Global Exception Handlers for Security & Error Normalization
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle schema validation failures uniformly."""
        req_id = getattr(request.state, "request_id", "unknown")
        logger.warning("[request_id=%s] Validation error on %s %s: %s", req_id, request.method, request.url.path, exc.errors())
        error_resp = APIErrorResponse(
            success=False,
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message="Request payload failed validation schema.",
                details=exc.errors(),
            ),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder(error_resp.model_dump()),
            headers={"X-Request-ID": req_id},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle unhandled exceptions cleanly without leaking internal stack traces or paths."""
        req_id = getattr(request.state, "request_id", "unknown")
        logger.error("[request_id=%s] Unhandled exception on %s %s: %s", req_id, request.method, request.url.path, exc, exc_info=True)
        error_resp = APIErrorResponse(
            success=False,
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected internal server error occurred. Please contact administrator with reference ID.",
                details={"request_id": req_id},
            ),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_resp.model_dump(),
            headers={"X-Request-ID": req_id},
        )

    # 4. Root Health Probes & Render / Cloud Health Check Handlers
    @app.get("/health", tags=["Health Probes"])
    @app.head("/health", tags=["Health Probes"])
    def root_health() -> dict:
        """Root health probe reporting overall platform operational readiness."""
        db_ok = check_database_connection()
        redis_ok = check_redis_connection()
        return {
            "status": "healthy" if db_ok and redis_ok else "degraded",
            "app_name": settings.APP_NAME,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "database": "connected" if db_ok else "disconnected",
            "redis": "connected" if redis_ok else "disconnected",
        }

    @app.get("/health/live", tags=["Health Probes"])
    @app.head("/health/live", tags=["Health Probes"])
    def liveness_probe() -> dict:
        """Kubernetes / Cloud process liveness probe."""
        return {"status": "alive"}

    @app.get("/health/ready", tags=["Health Probes"])
    @app.head("/health/ready", tags=["Health Probes"])
    def readiness_probe() -> dict:
        """Kubernetes / Cloud dependency readiness probe."""
        db_ok = check_database_connection()
        redis_ok = check_redis_connection()
        ready = db_ok and (redis_ok or not settings.REQUIRE_REDIS)
        return {
            "status": "ready" if ready else "not_ready",
            "database": "connected" if db_ok else "disconnected",
            "redis": "connected" if redis_ok else "disconnected",
        }

    # 5. Register API Routers & MCP AI Gateway
    app.include_router(api_router, prefix=settings.API_V1_STR)

    from app.mcp.router import mcp_router
    app.include_router(mcp_router)

    # 6. Root Discovery & Head Probes (Handles Render HEAD / health check)
    @app.get("/", tags=["Root"])
    @app.head("/", tags=["Root"])
    def root_info() -> dict:
        return {
            "app_name": settings.APP_NAME,
            "version": "1.0.0",
            "documentation": "/docs",
            "health_check": f"{settings.API_V1_STR}/health",
            "api_v1": settings.API_V1_STR,
        }

    return app


app = create_application()
