# SmartEdu Cloud — Observability & Correlation Tracing

## 1. Request Correlation ID
Every HTTP transaction passing through `CorrelationIdMiddleware` is tagged with `X-Request-ID`. This ID is injected into response headers and structured error JSON payloads, allowing support engineers to trace client errors directly in backend logs.

## 2. Health Monitoring Probes
- `GET /health`: Platform overall status and database connectivity.
- `GET /health/live`: Process liveness probe.
- `GET /health/ready`: Dependency readiness probe.
- `GET /api/v1/admin/system/health`: Deep diagnostic matrix reporting latencies for Database, Auth, Notifications, Scheduling, and Exams.
