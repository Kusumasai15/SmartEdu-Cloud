# SmartEdu Cloud — API Standards & Specifications

## 1. API Architecture & Versioning

All SmartEdu Cloud REST endpoints are versioned with the standard prefix:
```
/api/v1/
```

Base URL in local development: `http://localhost:8000/api/v1`

## 2. Standardized Response Format

Every API endpoint returns a predictable JSON envelope structure:

### 2.1 Success Response Envelope
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-08-31T07:15:00.000Z",
    "environment": "development"
  },
  "message": "Operation completed successfully"
}
```

### 2.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource could not be found.",
    "details": null
  }
}
```

## 3. Implemented Endpoints in Phase 01

### 3.1 Health Probe
- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Description**: Returns the operational status of the service, database connectivity, and environment metadata.
- **Access**: Public / Unauthenticated
- **Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "environment": "development",
    "database": "connected",
    "redis": "connected",
    "timestamp": "2026-08-31T07:15:00.000Z"
  },
  "message": "SmartEdu Cloud API is operational"
}
```

## 4. Error Codes Catalog (Roadmap)
- `VALIDATION_ERROR`: Request payload failed Pydantic schema validation (HTTP 422).
- `AUTHENTICATION_REQUIRED`: Missing or expired JWT bearer token (HTTP 401).
- `FORBIDDEN_ACCESS`: Authenticated user lacks required permission or resource ownership (HTTP 403).
- `RESOURCE_NOT_FOUND`: Specified ID does not exist in database (HTTP 404).
- `CONFLICT`: Unique constraint violation or duplicate submission (HTTP 409).
- `INTERNAL_SERVER_ERROR`: Unhandled exception; raw stack traces are hidden from client and logged securely to server logs (HTTP 500).
