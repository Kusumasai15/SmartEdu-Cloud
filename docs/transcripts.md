# SmartEdu Cloud — Official Academic Transcripts & Security

## 1. Official Transcript Specification
The Student Academic Transcript compiles officially published and locked semester records:
- **Header**: University seal, Registrar Directorate, Student identifier, Degree Program, Department.
- **Semester Sections**: Chronological table of completed courses, credits earned, raw percentages, assigned letter grades, and grade points.
- **Term Metrics**: Registered credits, earned credits, and term GPA.
- **Cumulative Summary**: Total credits earned, Cumulative GPA (CGPA), and academic standing classification (`DEAN_LIST`, `GOOD_STANDING`, `PROBATION`).

---

## 2. Security & IDOR Authorization Boundaries

| Role | Access Boundary |
| :--- | :--- |
| **`STUDENT`** | **Self-Scope Only**: Can only retrieve their own transcript via `/api/v1/results/students/me/transcript`. Querying other student IDs is blocked with `403 Forbidden`. |
| **`FACULTY`** | **Course Scope**: Access restricted to assigned course gradebooks; cannot view institution-wide student transcripts arbitrarily. |
| **`HOD`** | **Department Scope**: Can view transcripts and approve result submissions for students and courses belonging to their department. |
| **`VC`** | **Institution Scope**: University-wide academic pass rates, departmental rankings, and aggregate GPA analytics. |
| **`ADMINISTRATOR`** | **Platform Scope**: Full grade scale provisioning, audit inspection, and oversight. |
