# SmartEdu Cloud — Communication Security & Privacy Isolation Matrix

## 1. Security & Authorization Matrix

| Domain | Mechanism | Invariant |
| :--- | :--- | :--- |
| **Notifications** | Direct Recipient Ownership | User can only query and mark notifications where `recipient_id == current_user.id`. |
| **Announcements** | Scoped Author Validation | Faculty restricted to assigned courses; HOD to own department. |
| **Messaging** | Relationship Gating & Participant Scoping | Non-participants attempting to fetch or post in a thread receive `403 Forbidden`. |
| **Gemini AI** | Backend Isolation & Human Review | AI generates draft text only; AI cannot auto-publish or alter database state. |
| **API Keys** | Server-Side Containment | `GEMINI_API_KEY` is loaded exclusively into backend memory and never exposed in client bundles. |
