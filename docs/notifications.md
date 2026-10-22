# SmartEdu Cloud — In-App Notifications & Event Routing

## 1. Notification Structure
- `id`: UUID Primary Key
- `recipient_id`: Target user identifier
- `category`: `ACADEMIC`, `ASSIGNMENT`, `QUIZ`, `EXAM`, `RESULT`, `ATTENDANCE`, `LEAVE`, `TIMETABLE`, `ANNOUNCEMENT`, `WORKFLOW`, `SYSTEM`, `SECURITY`, `AI_INSIGHT`
- `priority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`
- `status`: `UNREAD`, `READ`, `ARCHIVED`
- `title` & `message`: Human-readable summary
- `source_type` & `source_id`: Reference to originating entity
- `action_url`: Direct deep link to relevant dashboard section
- `dedup_key`: Deterministic hash/string preventing duplicate notifications
- `read_at`: Timestamp when recipient marked the item as read

## 2. Deduplication Strategy
To prevent spam during bulk operations (e.g. repeated attendance shortage checks, exam rescheduling updates), notifications utilize deterministic deduplication keys:
- `leave_rev_{leave_id}_{status}`
- `announcement_{announcement_id}_{user_id}`
- `shortage_{course_id}_{student_id}_{date}`
- `sched_change_{schedule_id}_{new_date}`

## 3. IDOR & Ownership Security
Every update or read action validates that `Notification.recipient_id == current_user.id`. Unauthorized attempts return HTTP 404/403 to prevent cross-tenant enumeration.
