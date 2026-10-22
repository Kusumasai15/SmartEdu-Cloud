# SmartEdu Cloud — Academic Calendar & University Milestones

## 1. Overview
The Academic Calendar engine manages authoritative university term dates, semester commencement and conclusion boundaries, examination windows, and recognized holidays.

## 2. Event Types & Classification
- `SEMESTER_START`: Official beginning of academic instruction.
- `SEMESTER_END`: Official end of semester and grade finalization.
- `HOLIDAY`: University-wide recognized closures (non-instructional days).
- `WORKING_DAY`: Compensatory working days or special academic schedules.
- `EXAM_PERIOD`: Designated examination period where regular teaching is suspended.
- `RESULT_PERIOD`: Result compilation and verification window.
- `REGISTRATION`: Course enrollment and registration windows.
- `ACADEMIC_EVENT`: Conferences, symposia, convocation, and student fests.

## 3. Date Constraints & Invariant Rules
1. **Date Sequence**: For every event, `start_date <= end_date`. Violations are rejected with HTTP 400 Bad Request.
2. **Instructional Day Flag**: `is_instructional_day: bool` marks whether classes and attendance sessions are expected to run.
3. **Multi-Tenancy & Scoping**: Events can be university-wide (`department_id=None`) or department-scoped.

## 4. API Endpoints
- `GET /api/v1/calendar`: Retrieve calendar events with optional `semester_id`, `event_type`, and date filters.
- `POST /api/v1/calendar/events`: Create calendar events (restricted to ADMINISTRATOR / HOD).
- `DELETE /api/v1/calendar/events/{id}`: Remove calendar milestone.
