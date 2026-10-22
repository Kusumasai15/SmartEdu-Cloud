# SmartEdu Cloud — Authoritative Scoped Announcements

## 1. Scope & Audience Boundaries
| Scope Type | Permitted Roles | Target Audience Resolution |
|---|---|---|
| `COURSE` | FACULTY (Assigned instructors), HOD, ADMIN | All active student enrollments in the course |
| `DEPARTMENT` | HOD (Own department), ADMIN | All faculty and students belonging to the department |
| `INSTITUTION` | VC, ADMINISTRATOR | All registered university users |
| `INDIVIDUAL` | FACULTY, HOD, ADMIN | Specific target student / user |

## 2. Lifecycle & Scheduling
- `DRAFT`: Saved offline for author editing and AI assistance.
- `SCHEDULED`: `publish_at > now` (automatically revealed when reaching publish timestamp).
- `PUBLISHED`: Actively visible in student and faculty communication feeds.
- `EXPIRED`: `expires_at <= now` (automatically filtered out from active feed).
- `ARCHIVED`: Manually archived by author or administrator.

## 3. Formal Acknowledgements
For policy documents, exam regulations, or critical announcements (`is_acknowledgement_required = True`), users must click "Acknowledge", recording an audit record in `announcement_acknowledgements`.
