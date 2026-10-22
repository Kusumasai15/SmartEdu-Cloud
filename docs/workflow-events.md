# SmartEdu Cloud — Academic Event Bus & Workflow Integration

## 1. Academic Event Handlers
The `AcademicEventBus` (`app/communication/services/event_service.py`) acts as the event-driven dispatcher linking core academic milestones with the communication engine:

1. `emit_assignment_published(course_id, assignment_id, assignment_title, due_date)`:
   - Resolves all students actively enrolled in `course_id`.
   - Dispatches `ASSIGNMENT` category notification with link to course workspace.
2. `emit_results_published(course_id, semester_name)`:
   - Resolves all active enrolled students.
   - Dispatches `RESULT` category notification (`HIGH` priority).
3. `emit_attendance_warning(student_id, course_name, attendance_pct)`:
   - Dispatches `ATTENDANCE` alert if student attendance falls below $75.0\%$.
4. `emit_academic_risk_alert(student_id, risk_level, primary_reason)`:
   - Dispatches `ACADEMIC` early-warning advisory (`HIGH` or `URGENT` priority) when risk snapshot reaches elevated severity.
