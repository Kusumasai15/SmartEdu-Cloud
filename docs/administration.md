# SmartEdu Cloud — Enterprise Administration & System Control Center

## 1. Executive Overview
The Administration, Governance, Security & System Control Engine (Phase 14) serves as the central orchestration and oversight platform for SmartEdu Cloud. It enables administrators to manage user accounts, academic entities, institutional policies, and security operations while strictly adhering to the 5-role RBAC architecture (`STUDENT`, `FACULTY`, `HOD`, `VC`, `ADMINISTRATOR`).

## 2. Core Capabilities
1. **Real-time Platform KPI Dashboard (`/api/v1/admin/dashboard`)**: Aggregates live student, faculty, HOD, and admin counts, active academic semester info, pending approvals, and active user sessions.
2. **User Administration (`/api/v1/admin/users`)**: Server-side paginated search, role and department filtering, account activation, deactivation, and suspension with full audit logging.
3. **Governance Aggregator (`/api/v1/admin/governance`)**: Centralized visibility into pending result corrections, student leave applications, and grade publishing reviews.
4. **Audit Explorer (`/api/v1/admin/audit`)**: Append-only, immutable transaction ledger capturing administrative mutations, previous/new values, actor roles, and request IDs.
5. **Security Center & Session Revocation (`/api/v1/admin/security`)**: Live tracking of active JWT refresh token sessions with one-click revocation and security incident alerts.
6. **Institutional Policy Versioning (`/api/v1/admin/policies`)**: Managed thresholds for attendance requirements, exam proctoring parameters, and AI governance with version history snapshots.
7. **System Health & AI Gateway (`/api/v1/admin/system/health`, `/api/v1/admin/ai/status`)**: Diagnostics on database, auth, notifications, scheduling, and AI services with secret masking.
