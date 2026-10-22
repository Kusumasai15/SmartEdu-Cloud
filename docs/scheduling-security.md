# SmartEdu Cloud — Scheduling & Attendance Security Invariants

## 1. Role-Based Access Control Matrix
| Feature / Operation | STUDENT | FACULTY | HOD | VC | ADMINISTRATOR |
|---|:---:|:---:|:---:|:---:|:---:|
| View Academic Calendar & Holidays | Read | Read | Read | Read | Read / Write |
| View Room Catalog & Availability | Read | Read | Read | Read | Read / Write |
| Submit Leave Request | Self | Self | Self | Self | Self / Admin |
| Review / Approve Student Leave | ❌ | ❌ | Department | Department | Full |
| Mark Session Attendance | ❌ | Assigned Course / Substitute | Department | ❌ | Full |
| Reschedule Timetable Slot | ❌ | Assigned Course | Department | ❌ | Full |
| Assign Substitute Faculty | ❌ | Assigned Course | Department | ❌ | Full |
| View Shortage Recovery Math | Self | Assigned Course | Department | Institution | Institution |
| View Faculty Workload Analytics | ❌ | Self | Department | Institution | Institution |

## 2. Non-Authoritative AI Invariant
- AI services in SmartEdu Cloud provide advisory recommendations, predictive risk analysis, and drafting assistance only.
- AI is strictly prohibited from mutating attendance records, approving/rejecting leave applications, or modifying timetables directly.
