# SmartEdu Cloud — Academic Engagement & Audit Scoring

## 1. Concept & Philosophy

The **Academic Engagement Score** is a composite metric designed to provide holistic insights into student participation without relying exclusively on traditional test grades. It synthesizes behavioral indicators from attendance, assignment submissions, and proctored examination participation.

---

## 2. Mathematical Formulation

$$\text{Engagement Score} = 0.40 \cdot \text{Attendance Rate} + 0.35 \cdot \text{Assignment Rate} + 0.25 \cdot \text{Exam Participation Rate}$$

Where:
- $\text{Attendance Rate} = \frac{\text{Attended Sessions}}{\text{Total Sessions Conducted}} \times 100$
- $\text{Assignment Rate} = \frac{\text{Submitted Assignments}}{\text{Total Published Assignments}} \times 100$
- $\text{Exam Participation Rate} = \frac{\text{Attempted Exams}}{\text{Total Published Exams}} \times 100$

---

## 3. Rating Classifications

| Rating | Score Range | Description |
| :--- | :--- | :--- |
| **HIGH** | $\ge 80\%$ | Active participant across all course touchpoints. |
| **MODERATE** | $60\% \le \text{Score} < 80\%$ | Satisfactory participation with opportunities for improvement. |
| **NEEDS_ATTENTION** | $< 60\%$ | Academic advising intervention recommended. |

---

## 4. API Endpoints

- `GET /api/v1/students/{student_id}/engagement-score`: Retrieves computed composite engagement score with individual metric breakdowns. (Role-scoped: Student can only query own score; Faculty/HOD can query enrolled students).
