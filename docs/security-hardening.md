# SmartEdu Cloud — Security Hardening & Audit Matrix

## 1. Authentication & Session Invariants
- JWT access tokens with short TTL (30 minutes) and persistent refresh tokens in `refresh_tokens`.
- Immediate server-side session revocation (`POST /api/v1/admin/security/sessions/{id}/revoke`).
- Passwords hashed with bcrypt and never stored in plaintext.

## 2. Authorization & Tenant Isolation
- Strict Five-Role RBAC (`STUDENT`, `FACULTY`, `HOD`, `VC`, `ADMINISTRATOR`).
- Course and Department-scoped object level authorization preventing cross-tenant IDOR attacks.
- Non-authoritative Gemini AI with privacy sanitization and strict human review requirements.
