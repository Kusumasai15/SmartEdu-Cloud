# SmartEdu Cloud — Administration Security & Isolation Invariants

## 1. Principle of Least Privilege
The `ADMINISTRATOR` manages platform configuration, user states, and policies, but is prohibited from bypassing academic boundaries:
- Administrators cannot directly submit grades without faculty course assignment.
- Administrators cannot self-deactivate their own user account.
- AI is strictly advisory and cannot alter student records or publish administrative policies.

## 2. Token & Secret Protection
- The `GET /api/v1/admin/ai/status` endpoint strictly returns `is_configured: bool` without exposing `GEMINI_API_KEY`.
- Audit logs automatically strip and redact password hashes, tokens, and credentials.
