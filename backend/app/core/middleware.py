"""Production Middleware for Request Correlation, Structured Logging & Security Headers."""

import time
import uuid
import logging
from typing import Callable
from collections import defaultdict, deque
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.redis import get_redis_client

logger = logging.getLogger("smartedu.access")

_local_rate_buckets: dict[str, deque[float]] = defaultdict(deque)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Injects a unique X-Request-ID header into every incoming request and outgoing response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Retrieve or generate correlation ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        # 2. Measure request processing duration
        start_time = time.time()
        
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.time() - start_time) * 1000.0, 2)
            logger.error(
                "Unhandled error [request_id=%s] %s %s (%sms): %s",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
                exc,
            )
            raise exc

        duration_ms = round((time.time() - start_time) * 1000.0, 2)

        # 3. Attach correlation ID and security headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'"
        )
        if settings.ENVIRONMENT.lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        # 4. Structured access log (Suppress noise for frequent health checks)
        if not request.url.path.startswith("/health"):
            logger.info(
                "[request_id=%s] %s %s -> %s (%sms)",
                request_id,
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )

        return response


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Throttle repeated auth attempts by client IP and endpoint."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method != "POST" or request.url.path not in {
            f"{settings.API_V1_STR}/auth/login",
            f"{settings.API_V1_STR}/auth/register",
        } or not settings.AUTH_RATE_LIMIT_ENABLED:
            return await call_next(request)

        forwarded_for = request.headers.get("X-Forwarded-For", "")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else None
        if not client_ip and request.client:
            client_ip = request.client.host
        if not client_ip or client_ip in {"127.0.0.1", "::1", "localhost"}:
            return await call_next(request)
        key = f"auth-rate:{request.url.path}:{client_ip}"

        allowed, retry_after = self._allow_request(key)
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many sign-in attempts. Please wait and try again.",
                    },
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)

    def _allow_request(self, key: str) -> tuple[bool, int]:
        attempts = settings.LOGIN_RATE_LIMIT_ATTEMPTS
        window = settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS
        redis_client = get_redis_client()

        if redis_client is not None:
            try:
                count = redis_client.incr(key)
                if count == 1:
                    redis_client.expire(key, window)
                ttl = redis_client.ttl(key)
                return count <= attempts, max(int(ttl), 1)
            except Exception as exc:
                logger.warning("Redis auth throttling unavailable: %s", exc)

        now = time.time()
        bucket = _local_rate_buckets[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= attempts:
            retry_after = max(1, int(window - (now - bucket[0])))
            return False, retry_after
        bucket.append(now)
        return True, window
