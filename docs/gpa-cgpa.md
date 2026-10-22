# SmartEdu Cloud — GPA, CGPA & Academic Standing Mathematics

## 1. Credit-Weighted Semester GPA Formula
Semester Grade Point Average (GPA) is calculated as the credit-weighted sum of earned grade points divided by total registered credits:

$$\text{Semester GPA} = \frac{\sum_{i=1}^{m} (\text{Credits}_i \times \text{Grade Point}_i)}{\sum_{i=1}^{m} \text{Credits}_i}$$

### Example
- Course A (4 Credits, Grade A+ $\rightarrow 10.0$ GP) $\rightarrow 4 \times 10 = 40$
- Course B (3 Credits, Grade B+ $\rightarrow 8.0$ GP) $\rightarrow 3 \times 8 = 24$
- Course C (3 Credits, Grade C $\rightarrow 6.0$ GP) $\rightarrow 3 \times 6 = 18$
- **Total Points**: $40 + 24 + 18 = 82$
- **Total Registered Credits**: $4 + 3 + 3 = 10$
- **Semester GPA**: $\frac{82}{10} = \mathbf{8.20}$

---

## 2. Cumulative Grade Point Average (CGPA)
CGPA aggregates across all completed academic semesters:

$$\text{CGPA} = \frac{\sum_{j=1}^{N} (\text{Course Credits}_j \times \text{Grade Point}_j)}{\sum_{j=1}^{N} \text{Course Credits}_j}$$

---

## 3. Academic Standing Categorization

| Standing Category | Criterion | Status Rationale |
| :--- | :--- | :--- |
| **`DEAN_LIST`** | $\text{CGPA} \ge 8.50$ and $0$ failed courses | High Academic Distinction |
| **`GOOD_STANDING`** | $\text{CGPA} \ge 5.00$ and $\le 2$ backlogs | Standard Satisfactory Progress |
| **`PROBATION`** | $\text{CGPA} < 5.00$ or $> 2$ backlogs | Requires Academic Advising & Re-registration |
