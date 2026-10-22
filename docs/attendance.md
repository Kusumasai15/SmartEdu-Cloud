# SmartEdu Cloud — Phase 08: Attendance Management & Audit Engine

## 1. Overview & Architecture

The **Attendance Management & Academic Audit Engine** provides institutional tracking of student attendance across lectures, laboratories, and tutorials. It enforces strict data integrity rules, role-scoped access control, historical immutability via closed session locking, and formal correction workflows reviewed by departmental authorities (HOD / Administrator).

---

## 2. Security & Scope Enforcement

SmartEdu Cloud enforces 5-tier role-based access control (RBAC):

| Role | Attendance Permissions |
| :--- | :--- |
| **STUDENT** | Read-only access to own attendance records and course summaries via `/students/me/attendance`. IDOR blocked (cannot access other students' records). |
| **FACULTY** | Can create attendance sessions, mark/edit records, and close sessions for assigned courses only. Unassigned courses return `403 Forbidden`. |
| **HOD** | Can view department-wide attendance analytics, export CSV audit logs, and review/approve/reject attendance correction requests. |
| **VC** | Institution-wide attendance KPIs and cross-department analytics. |
| **ADMINISTRATOR** | System-wide attendance administration, timetable scheduling, and emergency corrections. |

---

## 3. Data Model & Entity Relations

```mermaid
erDiagram
    COURSES ||--o{ ATTENDANCE_SESSIONS : "conducts"
    USERS ||--o{ ATTENDANCE_SESSIONS : "taken by faculty"
    CLASS_SCHEDULES ||--o{ ATTENDANCE_SESSIONS : "scheduled via"
    ATTENDANCE_SESSIONS ||--o{ ATTENDANCE_RECORDS : "contains"
    USERS ||--o{ ATTENDANCE_RECORDS : "student record"
    ATTENDANCE_RECORDS ||--o{ ATTENDANCE_CORRECTIONS : "audit trail"
    USERS ||--o{ ATTENDANCE_CORRECTIONS : "requested by / reviewed by"

    ATTENDANCE_SESSIONS {
        uuid id PK
        uuid course_id FK
        uuid faculty_id FK
        uuid schedule_id FK
        date session_date
        string start_time
        string end_time
        string topic_covered
        enum status "OPEN | CLOSED | CANCELLED"
    }

    ATTENDANCE_RECORDS {
        uuid id PK
        uuid session_id FK
        uuid student_id FK
        enum status "PRESENT | ABSENT | LATE | EXCUSED"
        int minutes_late
        string remarks
    }

    ATTENDANCE_CORRECTIONS {
        uuid id PK
        uuid record_id FK
        enum original_status
        enum requested_status
        string reason
        uuid requested_by FK
        uuid reviewed_by FK
        enum approval_status "PENDING | APPROVED | REJECTED"
        string review_notes
    }
```

---

## 4. Attendance Percentage Formula & Status Thresholds

### 4.1 Calculation Formula
$$\text{Attendance \%} = \frac{\text{PRESENT} + \text{LATE}}{\text{Total Sessions} - \text{EXCUSED}} \times 100$$

*Note: `EXCUSED` sessions are deducted from the denominator so authorized medical or institutional absences do not penalize the learner.*

### 4.2 Status Thresholds
- **$\ge 75\%$**: `GOOD` — Meets institutional exam eligibility requirements.
- **$65\% \le \text{Rate} < 75\%$**: `WARNING` — Automated notification to student and faculty mentor.
- **$< 65\%$**: `CRITICAL` — High risk of examination debarment; flagged for academic audit.

---

## 5. Closed Session Immutability & Correction Workflow

1. When a faculty user creates a session, its initial status is `OPEN`.
2. Faculty can freely edit attendance records during the active session window.
3. Upon completion, faculty triggers `POST /attendance/sessions/{id}/close` setting status to `CLOSED`.
4. **Immutability Protection**: Any subsequent direct write to `CLOSED` sessions is rejected with `400 Bad Request`.
5. **Formal Correction Workflow**:
   - Faculty submits `POST /attendance/corrections` specifying `record_id`, `requested_status`, and `reason`.
   - The correction appears in the HOD's approval queue (`GET /hod/attendance/pending-corrections`).
   - HOD reviews and submits `PATCH /attendance/corrections/{id}` with `approval_status: APPROVED | REJECTED`.
   - If approved, the service layer automatically updates `AttendanceRecord.status` to the approved value and records the audit log.
