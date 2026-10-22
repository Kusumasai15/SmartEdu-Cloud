# SmartEdu Cloud — Institutional Policy Management & Versioning

## 1. Managed Categories
- `ATTENDANCE`: Minimum attendance percentage (default 75%), shortage warning threshold (80%), recovery policies.
- `EXAMINATION`: Automated proctoring, max tab switches, browser lock sensitivity.
- `AI_GOVERNANCE`: Human-in-the-loop review enforcement, advisory output constraints.
- `SECURITY`: Failed login thresholds and account lockout timers.
- `NOTIFICATIONS`: Default delivery channels and priority escalation rules.

## 2. Policy Versioning Engine
Whenever a policy value is updated:
1. The prior configuration is snapshotted into `policy_version_histories` with a timestamp, change author, and mandatory audit justification.
2. The version string is incremented (`1.0.0` $\to$ `1.0.1`).
3. An administrative audit event is recorded in `admin_audit_events`.
