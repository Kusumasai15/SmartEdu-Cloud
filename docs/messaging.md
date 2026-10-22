# SmartEdu Cloud — Academic Messaging & Conversations

## 1. Academic Relationship Boundaries
SmartEdu Cloud is an authoritative learning system, not an unrestricted social network. Direct messaging requires a validated academic relationship:
1. **Student <-> Faculty**: Permitted only if the student is actively enrolled in a course taught by that faculty member.
2. **Faculty <-> Faculty**: Permitted if both share the same academic department.
3. **Faculty / Student <-> HOD**: Permitted within the HOD's department.
4. **Administrator**: Universal oversight and support messaging.

## 2. Message History & Audit Invariants
- **Editing**: When a sender edits their message, `is_edited = True` and `edited_at` timestamp are recorded.
- **Soft Deletion**: Messages are soft-deleted (`is_deleted = True`, `deleted_at = timestamp`) to preserve legal and academic audit history while obscuring body text in UI threads.
- **Scoped Search**: The `GET /api/v1/messages/search?q=...` endpoint searches only conversations where `current_user` is an active participant in `conversation_participants`.
