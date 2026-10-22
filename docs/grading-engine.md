# SmartEdu Cloud — Grading Engine & Calculation Rules

## 1. Authoritative Mark Normalization
To ensure fair aggregation across assessments with differing maximum marks (e.g. 50-mark Midterm vs 100-mark Final Exam), all raw scores are normalized before weightage application:

$$\text{Normalized Percentage} = \min\left(100.0, \max\left(0.0, \frac{\text{Raw Score}}{\text{Max Score}} \times 100\right)\right)$$

## 2. Configurable Weight Distribution
Each course offering defines component weights that strictly sum to $100\%$:

$$\text{Final Weighted Percentage} = \sum_{i=1}^{n} \left( \text{Normalized Percentage}_i \times \frac{\text{Weight}_i}{100} \right)$$

### Default Weight Distribution
- **Assignments**: $40\%$
- **Final Examination**: $60\%$

---

## 3. Standard Institutional 10-Point Scale

| Letter Grade | Percentage Range | Grade Point (GP) | Evaluation Status | Description |
| :---: | :---: | :---: | :---: | :--- |
| **A+** | $90.0\% - 100.0\%$ | **10.0** | PASS | Outstanding |
| **A** | $80.0\% - 89.99\%$ | **9.0** | PASS | Excellent |
| **B+** | $70.0\% - 79.99\%$ | **8.0** | PASS | Very Good |
| **B** | $60.0\% - 69.99\%$ | **7.0** | PASS | Good |
| **C** | $50.0\% - 59.99\%$ | **6.0** | PASS | Satisfactory |
| **D** | $40.0\% - 49.99\%$ | **5.0** | PASS | Pass |
| **F** | $0.0\% - 39.99\%$ | **0.0** | FAIL | Fail |

---

## 4. Missing Marks Handling
The engine detects missing coursework without converting absent components silently to zero. When missing submissions are present, a prominent warning indicator alerts faculty before final submission to HOD.
