# SmartEdu Cloud — Security Architecture & 5-Role Authorization Guide

## 1. Overview

SmartEdu Cloud enforces a three-tier defense-in-depth security model:
1. **Authentication ("Who are you?")**: Verified via email, salted PBKDF2 password hashes, and cryptographic JWT bearer tokens.
2. **Role-Based Access Control ("What are you allowed to do?")**: Database-backed granular permissions mapped through `roles` -> `role_permissions` -> `permissions`.
3. **Resource-Level Authorization ("What specific objects are you allowed to access?")**: Server-side object-level scoping and IDOR prevention derived from database relations (`Enrollment`, `CourseInstructor`, `Department`).

The FastAPI backend is the ultimate security boundary. Frontend UI checks and role guards provide user experience routing only; all actual security decisions are enforced on the backend.

---

## 2. The Five Official Roles & Scoping Model

| Role | Responsibility | Resource Scope Boundary | Key Constraints |
|---|---|---|---|
| **STUDENT** | Enrolled learner | **Self + Enrolled Courses** | Cannot access other students' private records (IDOR rejection); cannot access un-enrolled courses or faculty tools. |
| **FACULTY** | Course author & evaluator | **Assigned Courses + Enrolled Students** | Restricted strictly to courses where assigned in `CourseInstructor`; cannot manage unrelated courses or cross-department resources. |
| **HOD** | Department academic head | **Assigned Department** | Bounded strictly by `User.department_id`; can view and manage department courses, faculty, and student analytics; cannot access other departments. |
| **VC** | Vice Chancellor | **Institution-Wide Academic Governance** | Cross-department visibility for academic analytics, KPIs, and executive approvals. **NOT Administrator**: strictly denied user deletion, role definition changes, and platform infrastructure settings. |
| **ADMINISTRATOR** | System & platform authority | **Platform-Wide Governance** | Full platform administration, user provisioning, role-permission matrix management, and security configuration. Must still authenticate and pass permission dependencies. |

---

## 3. Authentication & JWT Token Architecture

### 3.1 Password Security
- **Algorithm**: `PBKDF2-HMAC-SHA256`
- **Salt**: 16 bytes of cryptographically secure pseudo-random bytes (`secrets.token_hex(16)`)
- **Iterations**: 100,000 iterations
- **Verification**: Timing-safe constant-time string comparison (`hmac.compare_digest`)
- **Storage**: Plaintext passwords are never stored, logged, or returned in API responses.

### 3.2 JWT Access Token Strategy
- **Signature Algorithm**: `HS256` (HMAC with SHA-256)
- **Secret**: `JWT_SECRET_KEY` (minimum 32-character high-entropy secret loaded from environment; never exposed to frontend)
- **Lifetime**: Short-lived (30 minutes by default)
- **Claims Payload**:
  - `sub`: User UUID
  - `role`: User role name (`STUDENT`, `FACULTY`, `HOD`, `VC`, `ADMINISTRATOR`)
  - `type`: Token type (`"access"`)
  - `iat`: Timestamp issued at
  - `exp`: Expiration timestamp
  - `jti`: Unique token UUIDv4
- **Privacy**: No sensitive academic records (grades, attendance, transcript data) are embedded in JWTs.

### 3.3 Refresh Token & Rotation Strategy
- **Lifetime**: 7 days
- **Storage**: Issued refresh tokens are tracked in the database table `refresh_tokens` (`user_id`, `token`, `jti`, `expires_at`, `revoked`).
- **Rotation**: On each `POST /api/v1/auth/refresh`, the old refresh token is marked `revoked=True` and a brand new refresh token is issued.
- **Revocation / Logout**: Calling `POST /api/v1/auth/logout` explicitly marks the refresh token as revoked, preventing subsequent token exchanges.

---

## 4. Role-Permission Matrix

| Permission Identifier | Description | Student | Faculty | HOD | VC | Admin |
|---|---|---|---|---|---|---|
| `user:view` | View user profiles & rosters | ❌ | ✅ | ✅ | ✅ | ✅ |
| `user:create` | Provision new user accounts | ❌ | ❌ | ❌ | ❌ | ✅ |
| `user:update` | Update user profiles & roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| `user:delete` | Deactivate/delete user accounts | ❌ | ❌ | ❌ | ❌ | ✅ |
| `role:manage` | Configure roles & permissions | ❌ | ❌ | ❌ | ❌ | ✅ |
| `system:config` | Manage system & platform settings | ❌ | ❌ | ❌ | ❌ | ✅ |
| `department:view` | View academic departments | ❌ | ✅ | ✅ | ✅ | ✅ |
| `department:create` | Create new departments | ❌ | ❌ | ❌ | ❌ | ✅ |
| `department:update` | Update department details | ❌ | ❌ | ✅ | ❌ | ✅ |
| `course:view` | View course details & catalog | ✅ | ✅ | ✅ | ✅ | ✅ |
| `course:create` | Create new courses | ❌ | ❌ | ✅ | ❌ | ✅ |
| `course:update` | Update course syllabus | ❌ | ✅ | ✅ | ❌ | ✅ |
| `course:delete` | Archive or delete courses | ❌ | ❌ | ❌ | ❌ | ✅ |
| `module:view` | View course syllabus modules | ✅ | ✅ | ✅ | ✅ | ✅ |
| `module:create` / `update` / `delete` | Manage syllabus modules | ❌ | ✅ | ✅ | ❌ | ✅ |
| `topic:view` | View syllabus topics | ✅ | ✅ | ✅ | ✅ | ✅ |
| `topic:create` / `update` / `delete` | Manage syllabus topics | ❌ | ✅ | ✅ | ❌ | ✅ |
| `enrollment:view` | View student course enrollments | ✅ | ✅ | ✅ | ✅ | ✅ |
| `enrollment:create` | Enroll students in courses | ❌ | ❌ | ✅ | ❌ | ✅ |
| `analytics:institution:view` | Multi-department KPI analytics | ❌ | ❌ | ❌ | ✅ | ✅ |
| `analytics:department:view` | Departmental performance analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| `analytics:faculty:view` | Faculty instructional analytics | ❌ | ❌ | ❌ | ✅ | ✅ |
| `analytics:student:view` | Student performance trends | ❌ | ✅ | ✅ | ✅ | ✅ |
| `reports:institution:view` | Institutional audit & KPI reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| `reports:academic:view` | Department academic grade reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| `approvals:academic:view` | Pending academic approvals | ❌ | ❌ | ❌ | ✅ | ✅ |
| `approvals:academic:approve` | Grant executive academic approvals | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 5. Resource-Level Authorization & IDOR Protection

```
                                  AUTHORIZATION PIPELINE
                                  
     Client Request with Bearer Token
                   │
                   ▼
     1. Authentication Dependency (get_current_user / get_current_active_user)
        • Decodes JWT & verifies signature
        • Ensures token type == 'access' & exp is valid
        • Loads User record from DB & verifies is_active == True
                   │
                   ▼
     2. RBAC Permission Checker (require_permission)
        • Queries user's granted permissions via RolePermission table
        • Verifies required action permission (e.g. course:view)
                   │
                   ▼
     3. Resource Scoping Engine (verify_student_access / verify_course_access / verify_department_access)
        • Student: Enforces target_student_id == user.id OR course_id in Enrollment
        • Faculty: Enforces course_id in CourseInstructor OR student enrolled in taught course
        • HOD: Enforces department_id == user.department_id
        • VC: Enforces institution-wide academic scope
        • Administrator: Enforces system-wide governance
                   │
                   ▼
     Protected Resource / DB Operation
```

### 5.1 IDOR Prevention Rules
- **Student Profile Access**: Changing `/students/{id}` in request URL is verified against `can_access_student(user, target_student_id, db)`. A student attempting to view another student's record immediately receives `403 Forbidden`.
- **Course Scoping**: Faculty cannot access courses where they are not an assigned instructor in `course_instructors`. Students cannot access courses where they do not hold an active `enrollments` record.
- **Department Isolation**: HODs cannot view or alter departments outside their assigned `User.department_id`.

---

## 6. Frontend Security & Credential Isolation

- **Zero Gemini API Exposure**: `GEMINI_API_KEY` is strictly confined to backend processes and never referenced with `NEXT_PUBLIC_` prefixes.
- **Client Auth State**: Session tokens are held in client state / session storage with automatic Bearer header injection via `fetchApi`.
- **Role Routing**: Frontend `RoleGuard` redirects unauthenticated users to `/login` and unauthorized roles to `/unauthorized` (HTTP 403 status equivalent).
