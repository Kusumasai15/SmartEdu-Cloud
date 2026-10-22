# SmartEdu Cloud — Faculty Workload & Teaching Analytics

## 1. Overview
The Workload Engine computes deterministic teaching hours, session counts, and course distribution metrics across all assigned faculty members.

## 2. Workload Classification & Thresholds
- **Weekly Teaching Hours**: Sum of durations for all active weekly scheduled classes assigned to the instructor.
- **Load Classification**:
  - `NORMAL`: $< 16$ weekly teaching hours.
  - `HIGH`: $16 \le \text{Hours} \le 22$ weekly teaching hours.
  - `OVERLOADED`: $> 22$ weekly teaching hours.

## 3. Shortage Recovery Formula & Math
For students facing attendance shortage ($< 75\%$), the recovery engine computes:
$$\text{Current Attendance: } A = \text{Attended Sessions}, \quad C = \text{Conducted Sessions}$$
$$\text{Remaining Sessions: } R = \text{Estimated Future Sessions}$$
$$\text{Requirement: } \frac{A + x}{C + R} \ge 0.75 \implies x \ge \lceil 0.75 \times (C + R) - A \rceil$$
- If $x > R$: Recovery is mathematically impossible without formal excused leave or remedial sessions.
- If $x \le R$: The system advises the student to attend at least $x$ out of the next $R$ sessions to restore examination eligibility.
