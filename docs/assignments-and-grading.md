# SmartEdu Cloud — Assignments & Grading Architecture (Phase 06)

## 1. Overview
Phase 06 delivers a complete coursework assignment lifecycle, student submission portal, and faculty grading/evaluation engine for SmartEdu Cloud.

---

## 2. Assignment State Machine
```
   ┌─────────┐
   │  DRAFT  │ (Faculty authoring, hidden from students)
   └────┬────┘
        │
   ┌────▼──────────┐
   │   PUBLISHED   │ (Visible to enrolled students, submissions accepted)
   └────┬──────────┘
        │
   ┌────▼──────────┐
   │    CLOSED     │ (Deadline reached, no further submissions if late disallowed)
   └────┬──────────┘
        │
   ┌────▼──────────┐
   │   EVALUATED   │ (Faculty recorded scores and rubric feedback)
   └────┬──────────┘
        │
   ┌────▼──────────────┐
   │ RESULTS PUBLISHED │ (Scores & feedback released to students)
   └───────────────────┘
```

---

## 3. Database Entities & Constraints
* **`assignments` Table**:
  * `id`: UUID Primary Key.
  * `course_id`: Foreign Key $\to$ `courses.id` (CASCADE).
  * `module_id`: Foreign Key $\to$ `course_modules.id` (SET NULL, optional).
  * `title`: String(200), required.
  * `max_points`: Positive integer (default: 100).
  * `passing_points`: Positive integer $\le$ `max_points` (default: 40).
  * `due_date`: UTC Timestamp with timezone index.
  * `allow_late_submission`: Boolean flag.
  * `status`: `DRAFT` | `PUBLISHED` | `CLOSED` | `ARCHIVED`.
  * `results_published`: Boolean (gates student visibility of scores & feedback).
* **`assignment_submissions` Table**:
  * `id`: UUID Primary Key.
  * `assignment_id`: Foreign Key $\to$ `assignments.id` (CASCADE).
  * `student_id`: Foreign Key $\to$ `users.id` (CASCADE).
  * `submission_text`: Optional text / written solution.
  * `attachment_url`: Optional file / repository link.
  * `submitted_at`: Timestamp (defaults to `CURRENT_TIMESTAMP`).
  * `is_late`: Boolean (automatically flagged if `submitted_at > due_date`).
  * `score`: Float marks awarded by evaluator.
  * `feedback`: Evaluator text feedback.
  * `graded_by`: Foreign Key $\to$ `users.id` (faculty evaluator).
  * `status`: `SUBMITTED` | `GRADED` | `RESUBMITTED` | `RETURNED`.
  * Constraint: `UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student_submission")`.

---

## 4. Security & Scoping
* **Student Identity Integrity**: Student submissions derive `student_id` strictly from JWT token subject claim; frontend-supplied IDs are rejected to prevent IDOR vulnerabilities.
* **Faculty Course Scoping**: Instructors can only create assignments, view submissions, and grade work for courses where assigned in `CourseInstructor`.
* **Draft Shielding**: Students cannot view, list, or submit to draft assignments.
* **Grade Release Gate**: Students cannot view scores or feedback until `results_published == True`.
