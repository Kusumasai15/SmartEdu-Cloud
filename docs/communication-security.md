# SmartEdu Cloud — Communication Security & IDOR Protections

## 1. Security Invariants
1. **Ownership Validation**: Users cannot view, mark read, or delete notifications belonging to other users.
2. **Conversation Access Boundaries**: Non-participants are rejected with HTTP 403 Forbidden when attempting to retrieve conversation messages, post messages, or search private threads.
3. **Audience Tampering Prevention**: Faculty cannot post announcements to courses they do not teach, and HODs cannot post announcements targeting other departments.
4. **Non-Authoritative AI**: Gemini cannot bypass human review, directly publish announcements, or mutate academic records.
