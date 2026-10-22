# SmartEdu Cloud — AI Security & Privacy Isolation Matrix

## 1. Security Invariants
- **API Key Containment**: `GEMINI_API_KEY` is loaded into backend server memory only via `app/core/config.py`. Never exposed via `NEXT_PUBLIC_` or client JavaScript bundles.
- **PII Scrubbing**: Student names, student identifiers, contact details, emails, and phone numbers are stripped before prompt transmission.
- **Access Control & IDOR**:
  - `STUDENT`: Limited to `/api/v1/intelligence/student/me`. Accessing `/api/v1/intelligence/student/{other_id}` returns `403 Forbidden`.
  - `FACULTY`: Course health queries verify `CourseInstructor` assignment before returning data.
  - `HOD`: Department intelligence queries verify `user.department_id == dept_id`.
  - `VC`: Restricted to aggregate institutional analytics; cannot inspect granular student records arbitrarily.
