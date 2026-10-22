# SmartEdu Cloud — Security Center & Active Session Controls

## 1. Security Architecture
The Security Center provides live surveillance over platform security:
- **Incident Monitoring**: Logs failed logins, account suspensions, unauthorized IDOR attempts, and suspicious events.
- **Severity Levels**: `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Session Revocation**: Lists all active refresh tokens in `refresh_tokens`. Administrators can instantly revoke suspicious sessions (`revoked = True`), immediately invalidating access token refresh capabilities.
