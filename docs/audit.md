# SmartEdu Cloud — Immutable Audit Ledger & Event Invariants

## 1. Audit Table Schema
The `admin_audit_events` table preserves all administrative operations:
- `id`: UUID Primary Key
- `actor_user_id`: ForeignKey to `users.id`
- `actor_role`: Role of actor at execution time (`ADMINISTRATOR`, `HOD`, `FACULTY`)
- `action`: `AdminActionType` Enum (`USER_ACTIVATED`, `USER_SUSPENDED`, `POLICY_UPDATED`, `SESSION_REVOKED`, etc.)
- `resource_type`: Target entity class (`USER`, `POLICY`, `SESSION`, `COURSE`)
- `resource_id`: Primary key of modified entity
- `scope`: Access boundary (e.g. `ROLE:STUDENT`, `CATEGORY:ATTENDANCE`)
- `details`: JSON payload capturing old and new values
- `ip_address`: Originating IP address
- `created_at`: UTC Timestamp

## 2. Immutability Invariant
No update (`PUT`, `PATCH`) or deletion (`DELETE`) REST endpoints are exposed for `admin_audit_events`. The audit service strictly executes append-only operations. Passwords, JWT secrets, and API credentials are automatically redacted before insertion.
