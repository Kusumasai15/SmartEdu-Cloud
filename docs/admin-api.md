# SmartEdu Cloud — Administration REST API Reference

All endpoints require JWT Bearer authentication and the `ADMINISTRATOR` role.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Returns platform KPIs, term info, and operational stats |
| `GET` | `/api/v1/admin/users` | Paginated and filtered university user directory |
| `GET` | `/api/v1/admin/users/{id}` | Detailed user profile with security & audit info |
| `PATCH` | `/api/v1/admin/users/{id}/status` | Activate, deactivate, or suspend account |
| `GET` | `/api/v1/admin/audit` | Query immutable audit log with filters |
| `GET` | `/api/v1/admin/security/events` | Query security incident log |
| `GET` | `/api/v1/admin/security/sessions` | List active user sessions |
| `POST` | `/api/v1/admin/security/sessions/{id}/revoke` | Revoke active user session |
| `GET` | `/api/v1/admin/policies` | List institutional policies and version history |
| `PATCH` | `/api/v1/admin/policies/{key}` | Update policy value with audit reason |
| `GET` | `/api/v1/admin/governance/summary` | Summarize cross-phase pending approvals |
| `GET` | `/api/v1/admin/governance/requests` | List actionable governance items |
| `GET` | `/api/v1/admin/system/health` | Live diagnostic health check of all subsystems |
| `GET` | `/api/v1/admin/ai/status` | AI gateway configuration status (Secret-masked) |
