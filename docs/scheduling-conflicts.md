# SmartEdu Cloud — Multi-Vector Timetable Conflict Engine

## 1. Overview
The Timetable Conflict Engine guarantees schedule integrity across four distinct conflict vectors before any timetable slot is allocated or moved.

## 2. Conflict Detection Vectors
1. **Faculty Overlap (`FACULTY_OVERLAP`)**:
   - Checks if the instructor is already teaching another class in the same day and overlapping time window.
   - Time overlap condition: $\max(S_1, S_2) < \min(E_1, E_2)$.
2. **Room Double Booking (`ROOM_DOUBLE_BOOKED`)**:
   - Checks if another course is assigned to the same physical room during the requested time slot on that day.
3. **Exam Period Block (`EXAM_PERIOD_COLLISION`)**:
   - Checks if the requested schedule coincides with university-wide or department-level final examination dates.
4. **Holiday Closure (`HOLIDAY_BLOCK`)**:
   - Blocks scheduling instructional sessions on gazetted holidays and university closure dates.

## 3. Pre-Flight Conflict Checking API
- `POST /api/v1/timetable-advanced/conflict-check`:
  - Request: `course_id`, `faculty_id`, `day_of_week`, `start_time`, `end_time`, `room`.
  - Response:
    ```json
    {
      "has_conflicts": true,
      "is_blocked": true,
      "conflicts": [
        {
          "conflict_type": "FACULTY_OVERLAP",
          "message": "Faculty Dr. Jane Smith already assigned to CS201 at 09:00 - 10:30 on MONDAY",
          "severity": "BLOCKING"
        }
      ]
    }
    ```
