# SmartEdu Cloud — Performance & Indexing Strategy

## 1. Database Indexing
All high-traffic queries leverage composite and single-column indexes:
- `users`: `(email)`, `(role_id)`, `(department_id)`
- `enrollments`: `(student_id, course_id, semester_id)`
- `attendance_records`: `(session_id, student_id)`
- `exam_attempts`: `(exam_id, student_id)`
- `notifications`: `(recipient_id, status, created_at)`
- `admin_audit_events`: `(action, created_at)`, `(resource_type, created_at)`

## 2. Server-Side Pagination
All large collections (Users, Notifications, Messages, Audit Events, Security Incidents) enforce server-side pagination with bounded limits ($\le 100$) to prevent memory exhaustion.
