# SmartEdu Cloud — System Architecture & Modular Development Standards

## 1. Executive Summary & Core Architectural Principles

SmartEdu Cloud is an enterprise-grade academic platform built for scale, reliability, strict security, and maintainability.
To ensure the system remains clean, modular, and extensible across all 15 development phases, all code follows the **Global Modular Development Rule**:

1. **Single Responsibility Principle (SRP)**: Each file, function, and component has one clear, well-defined responsibility.
2. **Layered Separation of Concerns**:
   - **Backend**: `Router` $\rightarrow$ `Service` $\rightarrow$ `Repository` $\rightarrow$ `Database / ORM`.
   - **Frontend**: `Page / Layout` $\rightarrow$ `Feature Components` $\rightarrow$ `Custom Hooks` $\rightarrow$ `API Services` $\rightarrow$ `Backend REST API`.
3. **No "God Files"**: Monolithic files mixing DB queries, route handling, UI rendering, calculations, and auth logic are strictly prohibited.
4. **Authoritative Logic**: Calculations (e.g., attendance percentage, grades, exam integrity scores, academic risk metrics) reside in authoritative, reusable service/utility layers—never duplicated across endpoints or client components.
5. **Isolated AI & External Integrations**: Gemini API and external integrations are strictly isolated in backend service layers; no API keys or direct client calls are ever exposed to the frontend.

---

## 2. Directory Architecture & Layered Boundaries

```
backend/
├── app/
│   ├── core/                  # Infrastructure, database engine, settings, security & base exceptions
│   │   ├── config.py          # Environment settings & validation
│   │   ├── database.py        # SQLAlchemy session & Base
│   │   ├── security.py        # Token generation & password hashing
│   │   └── logging.py         # Structured logging configuration
│   │
│   ├── auth/                  # Phase 03: Identity, JWT tokens & 5-Role RBAC
│   │   ├── router.py          # Auth endpoints (/login, /refresh, /logout)
│   │   ├── dependencies.py    # get_current_user, require_permission, scope checks
│   │   ├── schemas.py         # Login & token DTOs
│   │   └── service.py         # User verification & token lifecycle
│   │
│   ├── academic/              # Phase 04: Departments, Semesters, Courses & Enrollments
│   ├── lms/                   # Phase 05: Course Content, Learning Tree & Progress
│   ├── assignments/           # Phase 06: Assignment Authoring, Submissions & Grading
│   ├── assessments/           # Phase 07: Question Banks, Timed Exams & Proctoring
│   ├── attendance/            # Phase 08: Attendance Sessions, Locking, Timetable & Engagement
│   │   ├── router.py          # HTTP routing & validation
│   │   ├── schemas.py         # Typed Pydantic DTOs
│   │   ├── service.py         # Domain orchestration, immutability & corrections
│   │   └── calculations.py    # Attendance % & Engagement score algorithms
│   │
│   ├── models/                # Domain entities partitioned by sub-domain
│   │   ├── user.py, role.py, department.py, semester.py
│   │   ├── course.py, enrollment.py
│   │   ├── content.py, progress.py
│   │   ├── assignment.py, submission.py
│   │   ├── question.py, exam.py, exam_attempt.py, proctoring_event.py
│   │   ├── timetable.py, attendance.py
│   │   └── __init__.py
│   │
│   ├── api/v1/router.py       # Centralized API v1 router aggregator
│   └── main.py                # Application bootstrap & middleware
│
├── alembic/                   # Database schema migrations
└── tests/                     # Feature-partitioned automated pytest suites

frontend/
├── src/
│   ├── app/                   # Next.js App Router (Pages compose feature components)
│   │   ├── admin/             # Administrator workspace
│   │   ├── faculty/           # Faculty command center
│   │   ├── hod/               # Head of Department academic hub
│   │   ├── student/           # Student portal & learning center
│   │   ├── vc/                # Vice Chancellor governance & institution metrics
│   │   ├── courses/           # Course & LMS learning tree pages
│   │   └── exams/             # Proctored examination player & review
│   │
│   ├── components/            # Reusable UI component library
│   │   ├── ui/                # Base primitives (Card, Button, Dialog, Input, Table)
│   │   ├── smartedu/          # Shared platform widgets (StatCard, PageHeader, EmptyState)
│   │   └── [feature]/         # Modular feature-specific components
│   │
│   ├── context/               # AuthContext & global UI providers
│   ├── lib/                   # API client & utility functions
│   └── types/                 # Domain TypeScript interfaces
```

---

## 3. Layer Responsibilities & Rules

### 3.1 Backend Layers
- **Routers (`router.py`)**:
  - Accept HTTP requests, parse query params/path variables.
  - Enforce authentication dependencies (`get_current_user`, `require_permission`).
  - Validate payloads via Pydantic schemas.
  - Call service layer methods and return formatted responses.
  - **No raw DB queries or heavy business logic in routes.**
- **Services (`service.py`)**:
  - Implement business rules, invariants, workflow validations, and authorization checks.
  - Handle transactions, manage entity lifecycles (e.g., closed session locking, exam auto-grading).
  - Coordinate calculations and audits.
- **Models (`models/`)**:
  - Pure SQLAlchemy entity definitions with explicit foreign keys, indexes, and constraints.
- **Schemas (`schemas.py`)**:
  - Pydantic v2 DTOs with `ConfigDict(from_attributes=True)` separating input payloads from responses.

### 3.2 Frontend Layers
- **Pages (`app/**/page.tsx`)**:
  - Thin orchestrators that load page data, manage top-level navigation, and compose sub-components.
- **Feature Components**:
  - Modular UI widgets under 200–300 lines with focused presentation concerns.
- **API Client (`lib/api-client.ts`)**:
  - Unified HTTP fetcher with automatic Bearer token injection, refresh handling, and typed error responses.

---

## 4. 5-Role Security & Resource Scoping Matrix

| Role | Operational Scope & Authorization Boundary |
| :--- | :--- |
| **`STUDENT`** | **Self-Scope**: Access strictly limited to own profile, enrolled courses, own submissions, own exam attempts, and personal attendance. IDOR strictly blocked. |
| **`FACULTY`** | **Assigned Course Scope**: Content authoring, assignment grading, exam creation, and attendance marking strictly restricted to assigned courses (`CourseInstructor`). |
| **`HOD`** | **Department Scope**: Full oversight of department courses, faculty assignments, student rosters, and attendance correction approvals for own department (`User.department_id`). |
| **`VC`** | **Institution Scope**: University-wide read and governance access across all departments, courses, institutional attendance KPIs, and academic analytics. |
| **`ADMINISTRATOR`** | **Platform Scope**: Full infrastructure, role management, user provisioning, global timetables, and system configurations. |

---

## 5. Phase Completion & Modularity Checklist

Prior to completing any development phase, verify:
- [x] **Single Responsibility**: No monolithic "god files" combining DB, routing, business logic, or UI.
- [x] **No Logic Duplication**: Reusable calculation algorithms (attendance, integrity score, engagement rating).
- [x] **Strict Server-Side Auth**: Role and resource checks verified on every backend route.
- [x] **AI Isolation**: Gemini clients run backend-only; no client-side API exposure.
- [x] **Automated Regression**: Pytest test suite runs 100% clean with zero regressions.
- [x] **Frontend Type Safety**: `npm run build` passes with 0 TypeScript/ESLint errors.
