# SmartEdu Cloud — Advanced Timetable & Schedule Management

## 1. Overview
The Timetable module coordinates class scheduling across departments, courses, faculty, and physical rooms while preventing collisions and auditing all schedule changes.

## 2. Dynamic Schedule Rescheduling & Substitutions
1. **Multi-Vector Conflict Pre-Validation**: Before any schedule is updated or rescheduled, the system validates that:
   - The instructor has no overlapping teaching commitments.
   - The designated physical room is free and not double-booked.
   - The target date is not a blocked university holiday or exam blackout period.
2. **Audit Logging**: Every schedule modification records an entry in `schedule_change_logs`:
   - `old_day_of_week`, `old_start_time`, `old_end_time`, `old_room`
   - `new_day_of_week`, `new_start_time`, `new_end_time`, `new_room`
   - `changed_by`, `reason`, `timestamp`
3. **Temporary Substitute Faculty**:
   - Instructors traveling for conferences or on medical leave can assign substitute faculty to specific schedule sessions via `substitute_faculty_assignments`.
   - Substitute faculty gain session attendance marking authority for that date without altering official primary course instructor ownership.

## 3. Notification Dispatch
Schedule changes and substitute assignments automatically dispatch scoped, deduplicated notifications via the Phase 11 notification engine to all enrolled students and affected faculty members.
