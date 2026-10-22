# SmartEdu Cloud — Academic Risk Engine & Transparent Mathematics

## 1. Deterministic Composite Formulation
The `AcademicRiskEngine` calculates a composite risk score ($0.0 - 100.0$) using 4 weighted components:

$$\text{Risk Score} = \text{Attendance Risk} + \text{Assignment Risk} + \text{Exam/Grade Risk} + \text{Trend Risk}$$

### Component Weight Breakdown
1. **Attendance Risk ($0 - 25\text{ pts}$)**:
   - $< 65.0\% \implies 25.0\text{ pts}$
   - $65.0\% \le \text{Att} < 75.0\% \implies 15.0\text{ pts}$
   - $75.0\% \le \text{Att} < 85.0\% \implies 5.0\text{ pts}$
   - $\ge 85.0\% \implies 0.0\text{ pts}$
2. **Assignment Risk ($0 - 20\text{ pts}$)**:
   - $< 50.0\% \implies 20.0\text{ pts}$
   - $50.0\% \le \text{Rate} < 75.0\% \implies 10.0\text{ pts}$
   - $75.0\% \le \text{Rate} < 90.0\% \implies 5.0\text{ pts}$
   - $\ge 90.0\% \implies 0.0\text{ pts}$
3. **Exam & Grade Risk ($0 - 30\text{ pts}$)**:
   - $\text{GPA} < 5.0 \lor \text{Exam Avg} < 45.0\% \lor \text{Backlogs} \ge 2 \implies 30.0\text{ pts}$
   - $\text{GPA} < 6.5 \lor \text{Exam Avg} < 60.0\% \lor \text{Backlogs} == 1 \implies 18.0\text{ pts}$
   - $\text{GPA} < 7.5 \lor \text{Exam Avg} < 70.0\% \implies 8.0\text{ pts}$
   - Otherwise $\implies 0.0\text{ pts}$
4. **Trend Trajectory Risk ($0 - 25\text{ pts}$)**:
   - `DECLINING` $\implies 25.0\text{ pts}$
   - `STABLE` $\implies 5.0\text{ pts}$
   - `IMPROVING` $\implies 0.0\text{ pts}$

---

## 2. Severity Classification

| Risk Level | Score Range | Criteria | Rationale & Interventions |
| :---: | :---: | :---: | :--- |
| **`CRITICAL`** | $\text{Score} \ge 75.0 \lor \text{Backlogs} \ge 2$ | Severe engagement / performance crisis | Immediate mandatory academic advising, parent notification, remedial coursework. |
| **`HIGH`** | $45.0 \le \text{Score} < 75.0 \lor \text{Att} < 70.0\%$ | High probability of failing upcoming term | Faculty mentoring, study group assignment, attendance recovery plan. |
| **`MEDIUM`** | $20.0 \le \text{Score} < 45.0$ | Minor performance deficit | Self-paced LMS revision, assignment deadline reminders. |
| **`LOW`** | $\text{Score} < 20.0$ | Meeting/exceeding all benchmarks | Optimal progress on track for Dean's List. |

---

## 3. Explainability & Non-Automation Guarantee
> [!IMPORTANT]
> The Risk Engine **NEVER** issues automated disciplinary actions, alters student grades, blocks registrations, or cancels enrollments. All risk ratings are purely advisory tools for faculty and advisors. Every output must include transparent human-readable bullet points explaining the exact metrics responsible.
