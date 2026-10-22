# UniFlow Full Codebase Audit

**Project:** UniFlow (Cloud-Based Learning Management System for Educational Institutions)  
**Audit Date:** September 20, 2026  
**Audit Type:** Full Architecture, Security, Real-Data, RBAC & API Integrity Audit  
**Status:** COMPLETE (Zero Code Modifications Made During Audit)

---

## 1. Executive Summary

A comprehensive, line-by-line engineering audit was conducted across the entire UniFlow repository (encompassing `/frontend`, `/backend`, `/database`, `/alembic`, `/tests`, `/config`, and documentation).

### Brutally Honest Key Findings:
1. **Frontend-Backend Disconnection:** The frontend deployed on Vercel is configured with `NEXT_PUBLIC_API_URL=https://smartedu-backend.onrender.com/api/v1`. This Render backend is currently returning **HTTP 404** (offline / non-existent deployment).
2. **Client-Side Simulation & Mock Data Fallback Trap:** To circumvent the missing live API during frontend development, previous phases implemented an extensive client-side persistence and simulation layer inside `frontend/src/context/AcademicDataContext.tsx` and `frontend/src/context/AuthContext.tsx`.
3. **Ghost Data Re-population Bug:** Hardcoded initial arrays (`initialAdminUsers`, `initialDepartments`, `initialCourses`, `initialCalendarSchedules`, `initialAssignments`, etc.) were programmed to automatically re-populate `localStorage` whenever client state was cleared. This is the root cause of deleted mock data continually reappearing on refresh.
4. **Bypassed Authentication:** In `frontend/src/context/AuthContext.tsx`, `login()` validates against a hardcoded in-memory `demoProfiles` dictionary first, bypassing backend JWT authentication and PostgreSQL password verification entirely.
5. **Backend Database-First Architecture Exists but is Disconnected:** The FastAPI backend (`backend/app`) possesses a complete 27-model SQLAlchemy schema and 24 fully implemented REST routers. However, the production PostgreSQL connection (`postgresql://...db.efzpdetuasvrscsabgje.supabase.co`) fails DNS resolution (`Name or service not known`), causing local runs to fall back to an SQLite database (`smartedu_dev.db`).
6. **Next.js Direct AI Call Leak:** Next.js route handlers (`app/api/ai/tutor-chat/route.ts` and `app/api/ai/lesson-catchup/route.ts`) attempt direct calls to Google Generative Language endpoints looking for `NEXT_PUBLIC_GEMINI_API_KEY`, violating the backend-only AI isolation policy.

---

## 2. Architecture Found

```mermaid
flowchart TD
    subgraph Deployed_Frontend["Frontend (Next.js 15 App Router / Vercel)"]
        UI[UI Components & Dashboards]
        AuthCtx[AuthContext.tsx - Intercepts Login via demoProfiles]
        AcadCtx[AcademicDataContext.tsx - Client State & LocalStorage]
        NextApiRoutes[Next.js /api/ai Routes - Direct Gemini calls]
        ApiClient[lib/api-client.ts - Points to Render API]
    end

    subgraph Disconnected_Backend["Backend (FastAPI / Render & Local)"]
        FastAPIApp[FastAPI main.py]
        AuthRouter[app/auth/router.py - Real JWT & bcrypt]
        AcademicRouter[app/academic/router.py - Real DB CRUD]
        AdminRouters[app/administration/ - 7 Admin Services]
        IntelligenceService[app/intelligence/ - Backend AI Service]
    end

    subgraph Database_Layer["Database Layer"]
        Supabase[(Supabase PostgreSQL - Host Unreachable)]
        SQLiteLocal[(smartedu_dev.db - 57 Tables / 10 Seeded Users)]
    end

    UI --> AuthCtx
    UI --> AcadCtx
    UI --> NextApiRoutes
    AcadCtx -.->|Fails & Fallbacks to LocalStorage| ApiClient
    ApiClient -.->|404 Not Found| FastAPIApp
    FastAPIApp -.->|Fails DNS| Supabase
    FastAPIApp --> SQLiteLocal
```

---

## 3. Technology Stack Found

- **Frontend:** Next.js 15.5.24 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Framer Motion.
- **Backend:** Python 3.13, FastAPI 0.115+, Uvicorn, Pydantic v2, Pydantic Settings.
- **Database & ORM:** SQLAlchemy 2.0+, Alembic (13 database migration versions), PostgreSQL (via psycopg2-binary / asyncpg), SQLite3 (local fallback).
- **Security & Tokens:** Passlib (bcrypt), PyJWT (HS256), Python-Jose, Cryptography.
- **AI / LLM:** Google Gemini 2.0 Flash (`google-generativeai`).
- **Cloud Infrastructure:** Vercel (Frontend), Render (Configured for Backend), Supabase (Configured for PostgreSQL).

---

## 4. Database Status

### A. Alembic Migration History (13 Versions in `backend/alembic/versions`):
1. `20260831_0202_959662165c00`: Initial Schema (Roles, Permissions, Departments, Semesters, Users, Courses, Modules, Topics, Enrollments).
2. `20260831_0212_4e344dbfbbb0`: Refresh Tokens.
3. `20260831_0645_5f182c87a110`: Learning Content & Progress.
4. `20260831_1615_7b291d34e221`: Assignments & Submissions.
5. `20260831_1700_9c412f89d331`: Assessments, Questions, Proctoring Policies & Events.
6. `20260901_0900_a1b2c3d4e5f6`: Attendance & Timetable.
7. `20260901_1000_b2c3d4e5f6a7`: Results, Grade Scales, Transcripts.
8. `20260901_1100_c3d4e5f6a7b8`: Academic Intelligence & Risk Snapshots.
9. `20260901_1200_d4e5f6a7b8c9`: Communications (Notifications, Announcements, Direct Messages).
10. `20260901_1300_e5f6a7b8c9d0`: Scheduling (Rooms, Leave, Calendar Events).
11. `20260901_1400_f6a7b8c9d0e1`: Administration, Audit, Policies, System Configurations.
12. `20260909_1100_g7h8i9j0k1l2`: Extended User Profile Columns.

### B. Live PostgreSQL Database Inspection:
- **Configured Connection:** `postgresql://postgres:***@db.efzpdetuasvrscsabgje.supabase.co:5432/postgres`
- **Connection Test Result:** **FAILED** (`psycopg2.OperationalError: could not translate host name "db.efzpdetuasvrscsabgje.supabase.co" to address: Name or service not known`).
- **Cause:** Supabase direct host unavailable, paused, or requiring connection pooling URL (`aws-0-...pooler.supabase.com:6543`).

### C. Local Development SQLite Database (`backend/smartedu_dev.db`):
- **Status:** Initialized with 57 tables.
- **Existing Seed Users in `smartedu_dev.db`:**
  - `admin@smartedu.local` (Role: ADMINISTRATOR)
  - `vc@smartedu.local` (Role: VC)
  - `hod.cse@smartedu.local` (Role: HOD)
  - `faculty1@smartedu.local`, `faculty2@smartedu.local` (Role: FACULTY)
  - `student1@smartedu.local` to `student5@smartedu.local` (Role: STUDENT)

---

## 5. Authentication Status

- **Status:** **CRITICAL DUAL-AUTH ISSUE (BROKEN IN PRODUCTION)**
- **Findings:**
  1. `frontend/src/context/AuthContext.tsx` contains an interceptor in `login()` that checks a client-side lookup table (`demoProfiles`) and `localStorage` before making any API request.
  2. Because the Render backend is 404, any valid user lookup falls into this client simulation.
  3. Real JWT verification is bypassed; token refresh via backend `/auth/refresh` fails silently.
  4. Backend `backend/app/auth/router.py` has a production-ready authentication flow with `bcrypt` password hashing and secure token generation, but it is never reached by the frontend.

---

## 6. RBAC Status

- **Status:** **PARTIALLY ENFORCED (FRONTEND GUARDS PRESENT, BACKEND SCOPES READY BUT UNCALLED)**
- **System Roles Configured (Exactly 5):**
  1. `ADMINISTRATOR`
  2. `VC`
  3. `HOD`
  4. `FACULTY`
  5. `STUDENT`
- **Frontend Enforcement:** `RoleGuard.tsx` checks `user.role.name` and redirects unauthorized access to `/unauthorized`.
- **Backend Enforcement:** `backend/app/auth/dependencies.py` has `require_role()` and `require_permission()` decorators with fine-grained permissions.

---

## 7. API Status

- **Status:** **DISCONNECTED FROM FRONTEND (BACKEND CODE COMPLETE, DEPLOYMENT 404)**
- **Backend Endpoints Configured in FastAPI (`app/api/v1/router.py`):**
  - `/auth/*` (Login, Register, Refresh, Me, Change Password)
  - `/departments`, `/courses`, `/semesters`, `/modules`, `/topics`, `/enrollments`, `/catalog`
  - `/lms/*` (Content upload, modules, student progress tracking)
  - `/assignments/*`, `/submissions/*`
  - `/assessments/*`, `/exams/*`, `/proctoring/*`
  - `/attendance/*`, `/timetable/*`
  - `/results/*`, `/transcripts/*`
  - `/intelligence/*` (Student, Course, Department, Institutional risk & advisory)
  - `/communication/*` (Notifications, Announcements, Direct Messages)
  - `/scheduling/*` (Rooms, Leave, Academic Calendar, Workload)
  - `/admin/*` (Dashboard stats, User admin, Audit explorer, Security logs, Policies, System health)
- **Frontend Communication:** Almost all frontend views call `useAcademicData()` which reads from `localStorage`, rather than awaiting `fetchApi()` responses.

---

## 8. Frontend Status

- **Status:** **UI COMPLETE & FUNCTIONAL, DATA LAYER HEAVILY HARDCODED & MOCKED**
- All 5 dashboard routes (`/admin`, `/vc`, `/hod`, `/faculty`, `/student`) build and render cleanly.
- However, components are bound to `AcademicDataContext.tsx` which maintains in-memory state initialized with static mock arrays.

---

## 9. Hardcoded Data Found

| Location | File | Line/Area | Type | Severity | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AuthContext | `frontend/src/context/AuthContext.tsx` | L108-L260 | Hardcoded User Profiles (`admin`, `punith`, `manav`, `rohit`, etc.) | **CRITICAL** | Remove `demoProfiles` dictionary. Route all logins strictly through `POST /auth/login`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L501-L644 | `initialCalendarSchedules` (Mock timetable slots) | **CRITICAL** | Delete hardcoded schedule array; fetch from `GET /timetable/my-schedules`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L647-L705 | `initialDepartments` | **HIGH** | Delete array; load from `GET /departments`. Empty state if 0. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L706-L766 | `initialAdminUsers` | **CRITICAL** | Delete array; load from `GET /admin/users`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L767-L868 | `initialClassrooms` | **HIGH** | Delete array; load from `GET /scheduling/rooms`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L869-L903 | `initialCourses` | **HIGH** | Delete array; load from `GET /courses`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L931-L1019 | `initialModules` | **HIGH** | Delete array; load from `GET /courses/{id}/modules`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L1020-L1071 | `initialQuizzes` | **HIGH** | Delete array; load from `GET /assessments/exams`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L1105-L1160 | `initialAdminAssignments` | **HIGH** | Delete array; load from `GET /assignments`. |
| AcademicDataContext | `frontend/src/context/AcademicDataContext.tsx` | L1161-L1193 | `initialAdminSubmissions` | **HIGH** | Delete array; load from `GET /submissions`. |
| Student Dashboard | `frontend/src/app/student/page.tsx` | L119-L181 | `initialAssignments` ("Binary Search Trees", etc.) | **HIGH** | Delete array; fetch from API. Show empty state when none exist. |
| Student Dashboard | `frontend/src/app/student/page.tsx` | L336-L337 | Hardcoded Fallback Attendance (`96.0%`) & GPA (`9.84`) | **HIGH** | Remove fallback numbers; show "N/A" or real database values. |
| Faculty Dashboard | `frontend/src/app/faculty/page.tsx` | L48-L97 | `createEmptyGradebook` (Mock students "Punith" & "Manav" with scores) | **CRITICAL** | Remove mock gradebook builder; show dynamic roster from API. |
| Faculty Dashboard | `frontend/src/app/faculty/page.tsx` | L122-L123 | Hardcoded Instructor Name Matching (`patel`, `rohit`) | **HIGH** | Remove name string sniffing; match by user ID against course instructor records. |
| VC Endowment Tab | `frontend/src/components/vc/VcEndowmentTab.tsx` | L33-L39 | `initialGrants` ($1.45M NSF Grant, etc.) | **HIGH** | Remove static mock grants; bind to real backend endpoint or empty state. |
| VC Senate Tab | `frontend/src/components/vc/VcSenateTab.tsx` | L31-L39 | `initialSenateMembers` | **MEDIUM** | Remove static member list; bind to governance API. |
| VC Approvals Tab | `frontend/src/components/vc/VcStrategicApprovalsTab.tsx` | L33-L89 | `initialGradeApprovals` | **HIGH** | Remove static approval items; load pending approvals from `/results/approvals`. |
| HOD Dashboard | `frontend/src/app/hod/page.tsx` | L76-L77 | Hardcoded GPA `8.85` & Pass Rate `96.0%` | **HIGH** | Remove fake calculation fallbacks; display actual database metrics. |
| Admin Dashboard | `frontend/src/app/admin/page.tsx` | L68-L69 | Hardcoded `activeSessions = 128` & `systemUptime = "99.98%"` | **MEDIUM** | Query `/admin/dashboard` metrics; do not fallback to 128. |

---

## 10. Dummy/Mock Data Found

| Location | Purpose | Production/Testing | Action Required |
| :--- | :--- | :--- | :--- |
| `frontend/src/context/AcademicDataContext.tsx` | Seed state for local UI preview | Inadvertently active in Production | Purge all `initial*` arrays; initialize state to `[]` and fetch exclusively from API. |
| `backend/app/db/seed.py` | Local development seeding (Alice Smith, Alan Turing, etc.) | Development seed (guarded by `SEED_SAMPLE_DATA=False`) | Keep in `seed.py` for local dev/testing only; ensure it never auto-runs in production. |
| `backend/tests/*` | Pytest fixtures | Automated Testing | Keep intact (strictly isolated inside `tests/`). |

---

## 11. Fake Fallback Logic

1. **`frontend/src/context/AuthContext.tsx` (L108-L260):**
   - **Flaw:** Checks `demoProfiles[cleanEmail]` before calling the backend.
   - **Correction:** Must execute `POST /auth/login` for all logins. If the API fails, display a real error message ("Unable to authenticate with server. Please try again.").
2. **`frontend/src/app/student/page.tsx` (L336-L337):**
   - **Flaw:** `overallAttendance = attendanceData?.overall_percentage ?? 96.0` and `currentGpa = transcript?.cumulative_gpa ?? "9.84"`.
   - **Correction:** Must show actual value or `"—"` / `"No attendance recorded"`.
3. **`frontend/src/app/hod/page.tsx` (L76-L77):**
   - **Flaw:** Falls back to `8.85` GPA and `96.0%` pass rate when calculations are empty.
   - **Correction:** Show `"0.00"` or `"N/A"`.
4. **`frontend/src/app/admin/page.tsx` (L68):**
   - **Flaw:** Falls back to `128` active sessions when API call fails.
   - **Correction:** Display `0` or actual database active session count.
5. **`frontend/src/app/faculty/page.tsx` (L48-L97):**
   - **Flaw:** Returns a hardcoded gradebook with mock marks if course gradebook is uninitialized.
   - **Correction:** Return an empty gradebook with `"No submissions graded yet"`.

---

## 12. Environment & Secrets Audit

| Variable | Location Found | Status | Security Assessment |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `backend/.env` | Configured with Supabase password | Secret present in local `.env` (gitignored). Hostname is currently unreachable. |
| `SECRET_KEY` | `backend/app/core/config.py` & `.env` | Default fallback present | Must be set via environment variable in production. |
| `JWT_SECRET_KEY` | `backend/app/core/config.py` & `.env` | Default fallback present | Must be set via environment variable in production. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.production` | Set to `https://smartedu-backend.onrender.com/api/v1` | Publicly exposed by design, but endpoint returns 404. |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `frontend/src/app/api/ai/*` references | **VULNERABILITY DETECTED** | Next.js routes check `NEXT_PUBLIC_GEMINI_API_KEY`. Gemini keys must NEVER be prefixed with `NEXT_PUBLIC_`. |
| `SUPABASE_PUBLISHABLE_KEY` | `frontend/.env.production` | Public key | Normal Supabase client key. |

---

## 13. Gemini AI Audit

1. **Direct Next.js API Routes (Architecture Violation):**
   - `frontend/src/app/api/ai/tutor-chat/route.ts`
   - `frontend/src/app/api/ai/lesson-catchup/route.ts`
   - `frontend/src/app/api/ai/generate/route.ts`
   - These route handlers attempt to call `https://generativelanguage.googleapis.com` directly from Next.js serverless functions instead of passing requests through the backend `app/intelligence` FastAPI service.
2. **Backend Gemini Implementation:**
   - `backend/app/intelligence/` contains server-side advisory services that sanitize PII, validate schemas, and ensure AI outputs cannot mutate official database grades or attendance.
3. **Advisory Restriction:** AI is correctly restricted from directly writing grades, attendance records, or official transcripts.

---

## 14. Database/API Connection Audit

| Component | Target URL / Connection | Status | Cause / Impact |
| :--- | :--- | :--- | :--- |
| Frontend API Client | `https://smartedu-backend.onrender.com/api/v1` | **BROKEN (404 Not Found)** | The Render backend web service is either not deployed, renamed, or stopped. |
| Backend Database | `postgresql://postgres:***@db.efzpdetuasvrscsabgje.supabase.co:5432/postgres` | **BROKEN (Host DNS Failure)** | `db.efzpdetuasvrscsabgje.supabase.co` does not resolve to an IP address. |
| Local Backend DB | `backend/smartedu_dev.db` (SQLite) | **CONNECTED** | Local SQLite fallback works with 57 tables and 10 seed users. |

---

## 15. Role-by-Role Audit

### 1. STUDENT
- **Dashboard Route:** `/student`
- **Frontend Status:** UI renders; assigns mock data (`initialAssignments`, fake 96% attendance fallback).
- **Backend Access:** Scoped to self records (`/students/me/attendance`, `/results/students/me/transcript`, `/timetable/my-schedules`).
- **Data Integrity:** BROKEN (displays fake GPA `9.84` and mock assignments if API fails).

### 2. FACULTY
- **Dashboard Route:** `/faculty`
- **Frontend Status:** UI renders; contains hardcoded `createEmptyGradebook` with mock student scores for "Punith" and "Manav".
- **Backend Access:** Scoped to assigned courses and attendance marking (`/attendance/sessions`, `/assignments/submissions/grade`).
- **Data Integrity:** BROKEN (injects mock marks into empty gradebooks).

### 3. HOD
- **Dashboard Route:** `/hod`
- **Frontend Status:** UI renders; uses hardcoded fallback averages (`8.85` GPA, `96.0%` pass rate).
- **Backend Access:** Scoped to department courses, faculty workload, and grade approvals.
- **Data Integrity:** PARTIALLY HARDCODED.

### 4. VC (Vice Chancellor)
- **Dashboard Route:** `/vc`
- **Frontend Status:** UI renders; `VcEndowmentTab.tsx` and `VcSenateTab.tsx` contain 100% hardcoded mock datasets.
- **Backend Access:** Scoped to institutional analytics (`/results/vc/institution/analytics`, `/intelligence/vc/institution`).
- **Data Integrity:** HARDCODED in sub-tabs.

### 5. ADMINISTRATOR
- **Dashboard Route:** `/admin`
- **Frontend Status:** UI renders; contains full management views, but `AdminOverviewTab` falls back to `128` sessions on API failure.
- **Backend Access:** Full administrative authority over users, departments, courses, audit logs, and security policies.
- **Data Integrity:** PARTIALLY HARDCODED (falls back to `localStorage` state).

---

## 16. Feature-by-Feature Data Flow Audit

| # | Feature | Frontend → API → Backend → Database | Status | Notes / Root Cause |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Authentication | `AuthContext` → `/auth/login` → `auth_router` → `users` | **BROKEN** | Frontend intercepts via `demoProfiles`; Render API 404. |
| 2 | RBAC & Permissions | `RoleGuard` → Token Claims → `dependencies.py` → `roles` | **PARTIAL** | Frontend guards routes; backend validation unreached in prod. |
| 3 | Student Dashboard | `student/page.tsx` → `/students/me/*` → `attendance` / `enrollments` | **HARDCODED** | Displays hardcoded `initialAssignments` & fallback GPA. |
| 4 | Faculty Dashboard | `faculty/page.tsx` → `/courses/*` → `course_instructors` | **HARDCODED** | Gradebook injects hardcoded mock marks for Punith & Manav. |
| 5 | HOD Dashboard | `hod/page.tsx` → `/department/*` → `departments` | **PARTIAL** | Fallback metrics hardcoded (`8.85` GPA). |
| 6 | VC Dashboard | `vc/page.tsx` → `/results/vc/*` → `results` | **HARDCODED** | Endowment & Senate sub-tabs use static mock arrays. |
| 7 | Administrator Dashboard | `admin/page.tsx` → `/admin/dashboard` → `User` / `Course` | **PARTIAL** | Falls back to `AcademicDataContext` / localStorage. |
| 8 | Course Management | `CourseManagementView` → `/courses` → `Course` table | **PARTIAL** | CRUD in frontend context writes to localStorage. |
| 9 | Modules & Syllabus | `LmsModuleBuilder` → `/courses/{id}/modules` → `course_modules` | **PARTIAL** | Backed by local state; API calls fail on Render. |
| 10 | Learning Content | `courses/[id]/learn` → `/content/{id}` → `learning_contents` | **PARTIAL** | Implemented but disconnected in production. |
| 11 | Assignments | `FacultyAssignmentsTab` → `/assignments` → `assignments` | **HARDCODED** | Mock assignments hardcoded in student view. |
| 12 | Submissions | `FacultySubmissionsModal` → `/submissions` → `submissions` | **PARTIAL** | Connected to context; unreached in production. |
| 13 | Grading Engine | `FacultyGradebookView` → `/results/*` → `course_results` | **HARDCODED** | Fallback gradebook with mock scores. |
| 14 | Quizzes | `LmsQuizPlayer` → `/assessments/exams` → `exams` | **PARTIAL** | Uses `initialQuizzes` array in context. |
| 15 | Question Bank | `FacultyCreateExamModal` → `/questions` → `questions` | **PARTIAL** | Frontend modal creates questions into local state. |
| 16 | Exams & Proctoring | `exams/[examId]/take` → `/assessments/*` → `exam_attempts` | **PARTIAL** | Proctoring event listeners present; backend disconnected. |
| 17 | Attendance Sessions | `FacultyAttendanceTab` → `/attendance/sessions` → `attendance_sessions` | **PARTIAL** | Disconnected from live database. |
| 18 | Student Attendance Log | `student/page.tsx` → `/students/me/attendance` → `attendance_records` | **HARDCODED** | Falls back to fake `96.0%`. |
| 19 | Timetable & Calendar | `TimetableCalendarAdminView` → `/timetable/*` → `class_schedules` | **HARDCODED** | `initialCalendarSchedules` pre-fills slots. |
| 20 | Leave Management | `LeaveManagementView` → `/scheduling/leave` → `student_leave_requests` | **PARTIAL** | UI connected to context; backend unreached. |
| 21 | Results & Transcripts | `OfficialTranscriptView` → `/results/transcripts` → `transcripts` | **HARDCODED** | Falls back to `9.84` GPA when empty. |
| 22 | Academic Intelligence | `AcademicHealthCard` → `/intelligence/*` → `academic_risk_snapshots` | **PARTIAL** | Backend service complete; disconnected in prod. |
| 23 | Gemini AI Advisory | `app/api/ai/*` → Google Gemini API | **BROKEN** | Client routes call Gemini directly instead of backend. |
| 24 | Notifications | `NotificationBell` → `/notifications` → `notifications` | **PARTIAL** | Pulls from local context; backend unreached. |
| 25 | Announcements | `AnnouncementFeed` → `/announcements` → `announcements` | **PARTIAL** | Backend CRUD exists; frontend falls back to context. |
| 26 | Direct Messaging | `AcademicMessagingView` → `/messages` → `direct_messages` | **PARTIAL** | Disconnected from live database. |
| 27 | User Administration | `UserManagementView` → `/admin/users` → `users` | **PARTIAL** | Writes to local context and attempts API call. |
| 28 | Audit Logs | `AuditExplorer` → `/admin/audit` → `admin_audit_events` | **PARTIAL** | Backend service complete; unreached in prod. |
| 29 | Security Center | `SecurityCenter` → `/admin/security` → `security_event_logs` | **PARTIAL** | Backend service complete; unreached in prod. |
| 30 | Policy Management | `PolicyManagementView` → `/admin/policies` → `system_policies` | **PARTIAL** | Backend service complete; unreached in prod. |
| 31 | System Health | `SystemHealthView` → `/admin/system/health` → `health_service` | **PARTIAL** | Backend service complete; unreached in prod. |

---

## 17. Security Findings

1. **Bypassed Authentication:** Client-side login matching in `AuthContext.tsx` allows login without password verification against hashed database records.
2. **API Key Exposure Risk:** Next.js route handlers reference `NEXT_PUBLIC_GEMINI_API_KEY`. If set, this exposes the API key to client browsers.
3. **IDOR Prevention Ready in Backend:** Backend routers (`app/academic/router.py`, `app/attendance/router.py`, `app/results/router.py`) correctly implement `verify_course_access()` and role scope checks. However, because the backend is not connected in production, this security layer is inactive.

---

## 18. Authentication Findings

1. Passwords in `backend/app/models/user.py` use secure `bcrypt` hashing (`password_hash`).
2. Refresh token rotation and revocation are fully modeled in `backend/app/models/token.py`.
3. In the current frontend production build, `sessionStorage` stores user profile objects directly without a validated JWT from the backend.

---

## 19. Authorization Findings

1. The 5 system roles (`ADMINISTRATOR`, `VC`, `HOD`, `FACULTY`, `STUDENT`) are clearly segregated.
2. `backend/app/auth/scopes.py` provides institutional permission boundaries.
3. Frontend navigation correctly isolates `/admin`, `/vc`, `/hod`, `/faculty`, `/student` using `RoleGuard`.

---

## 20. Performance Findings

1. Next.js production build completes in ~10 seconds with 0 TypeScript errors.
2. The entire client application bundle is lightweight (~157kB First Load JS shared).
3. LocalStorage reading and writing of heavy simulated datasets (`smartedu_clean_production_v5`) causes unnecessary client CPU cycles and data desynchronization.

---

## 21. UI/Data Integrity Findings

1. **Empty States Missing in Several Tabs:** Instead of displaying empty states (e.g. "No assignments posted yet", "No timetable sessions scheduled"), components were injected with dummy fallback records.
2. **Re-appearing Data Issue:** When users delete records, the cleanup triggers `if (data.length === 0) setList(initialData)` logic in client contexts, re-populating deleted mock items immediately.

---

## 22. Critical Issues

1. **CRITICAL-1:** Render backend (`https://smartedu-backend.onrender.com/api/v1`) is returning 404, breaking the real data pipeline between Frontend and PostgreSQL database.
2. **CRITICAL-2:** `demoProfiles` dictionary in `AuthContext.tsx` bypasses backend authentication.
3. **CRITICAL-3:** `AcademicDataContext.tsx` re-seeds `localStorage` with hardcoded arrays (`initialAdminUsers`, `initialCourses`, `initialCalendarSchedules`, `initialAssignments`) whenever state is cleared.
4. **CRITICAL-4:** Supabase PostgreSQL database URL in `backend/.env` has an invalid/unresolvable host name.

---

## 23. High Priority Issues

1. **HIGH-1:** Hardcoded mock gradebook in `FacultyDashboardContent` (`createEmptyGradebook` with mock marks for Punith and Manav).
2. **HIGH-2:** Hardcoded mock assignments in `StudentDashboardContent` (`initialAssignments`).
3. **HIGH-3:** Hardcoded fallback values (`96.0%` attendance, `9.84` GPA, `8.85` GPA) in Student and HOD dashboards.
4. **HIGH-4:** Hardcoded mock grants and senate members in `VcEndowmentTab.tsx` and `VcSenateTab.tsx`.
5. **HIGH-5:** Next.js direct Gemini AI call handlers checking `NEXT_PUBLIC_GEMINI_API_KEY`.

---

## 24. Medium Priority Issues

1. **MED-1:** Hardcoded active sessions (`128`) and uptime (`99.98%`) fallbacks in `admin/page.tsx`.
2. **MED-2:** Hardcoded default form values in `TimetableCalendarAdminView.tsx` (`slotClassName = "B.Tech CSE - Sem 5 (Sec A)"`).

---

## 25. Low Priority Issues

1. **LOW-1:** Legacy documentation references mentioning deprecated phase milestones.
2. **LOW-2:** Unused mock SVG icons in static asset directories.

---

## 26. Recommended Fix Order

```mermaid
flowchart TD
    Step1["1. Fix Database Connection (Valid PostgreSQL / Supabase URL)"]
    Step2["2. Deploy / Connect Backend FastAPI Service (Live & Healthy)"]
    Step3["3. Purge All Frontend Dummy Data & Initial Arrays (AcademicDataContext & AuthContext)"]
    Step4["4. Enforce Strict Database Login (Remove demoProfiles, Use Real JWT API)"]
    Step5["5. Wire Frontend Components Directly to Real API Endpoints (0 Fake Fallbacks)"]
    Step6["6. Implement Explicit Empty, Loading, and Error States in All Views"]
    Step7["7. Route Gemini AI Calls Strictly Through Backend Intelligence Router"]
    Step8["8. Final Production Build, Deploy to Vercel, and End-to-End Verification"]

    Step1 --> Step2 --> Step3 --> Step4 --> Step5 --> Step6 --> Step7 --> Step8
```

---

## 27. Admin Testing Account

### Status:
- In the local development database (`backend/smartedu_dev.db`), a development administrator account exists:
  - **Email:** `admin@smartedu.local`
  - **Role:** `ADMINISTRATOR`
  - **Default Development Password:** `DevPassword123!` (bcrypt hashed)

### Safe Creation Method for Real PostgreSQL Database:
To provision a clean, real Administrator account in the PostgreSQL database without hardcoding credentials in source code, execute the backend CLI user creation utility or the idempotent migration seeder with environment-supplied credentials:

```bash
# Set secure admin credentials in environment:
export INITIAL_ADMIN_EMAIL="admin@yourinstitution.edu"
export INITIAL_ADMIN_PASSWORD="YourSecurePassword"

# Run backend admin provisioning:
python -m app.db.create_admin
```

---

## 28. Manual Testing Readiness

| Area | Manual Testing Readiness |
| :--- | :--- |
| UI Layout & Visual Design System | **READY** (Next.js 15, responsive, all tabs navigatable) |
| Local Component Interactions | **READY** (Modals, filters, form controls functional) |
| Backend Database Models & Routers | **READY LOCALLY** (57 tables, 24 routers verified via Pytest/SQLite) |
| End-to-End Live Real Data Synchronization | **NOT READY** (Blocked by Render backend 404 & Frontend client mock fallbacks) |

---

## 29. Things NOT Yet Ready

1. Live PostgreSQL connection in production (requires active Supabase/PostgreSQL instance).
2. Live FastAPI backend on public URL (requires active Render / Railway / cloud service deployment).
3. Pure real-data UI (requires stripping all `initial*` mock arrays from frontend contexts and pages).

---

## 30. Final Verdict

| Metric | Status |
| :--- | :--- |
| **Codebase Completeness** | **COMPLETE** (All 5 roles, 57 database tables, 24 routers, and 102 frontend components implemented) |
| **Data Integrity** | **FAILED / HARDCODED** (Extensive client-side mock arrays and fallback numbers present) |
| **Production Connectivity** | **DISCONNECTED** (Frontend points to 404 backend; Supabase host DNS unresolvable) |
| **Audit Conclusion** | **AUDIT COMPLETE. NO UNAUTHORIZED CHANGES MADE. AWAITING USER INSTRUCTION TO PROCEED WITH REMEDIATION.** |
