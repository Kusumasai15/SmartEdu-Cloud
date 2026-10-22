# SmartEdu Cloud — Architecture Decision Records (ADRs)

## ADR-001: Monorepo Repository Structure
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: The project combines a Next.js web application, a Python FastAPI backend, a custom Data Structures module, and centralized infrastructure configuration.
- **Decision**: Adopt a clean monorepo structure with top-level `frontend/`, `backend/`, `data-structures/`, `docs/`, `docker/`, `scripts/`, and `tests/` directories.
- **Consequences**: Simplified unified version control, consistent documentation, and unified Docker Compose orchestration.

## ADR-002: Backend-Only AI Integration
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: We need to use the Google Gemini API for tutoring, quiz generation, and summaries without risking credential exposure or uncontrolled API consumption.
- **Decision**: All Gemini API calls must originate from the FastAPI backend service (`app/ai/`). Frontend clients communicate solely through authenticated `/api/v1` routes.
- **Consequences**: `GEMINI_API_KEY` is completely isolated from the browser client; rate limits, caching, and prompt injection controls can be enforced server-side.

## ADR-003: PostgreSQL with pgvector for Relational and Vector Storage
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: The system requires transactional integrity for academic data (grades, attendance) alongside vector similarity search for RAG.
- **Decision**: Use PostgreSQL 16 with the `pgvector` extension instead of maintaining separate relational and standalone vector databases (e.g. Pinecone/Milvus).
- **Consequences**: Reduces infrastructure complexity; allows single-query joins between vector distances and relational access permissions.

## ADR-004: Standardized Envelope Response Format
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: Frontend client requires consistent error and data structures across all REST endpoints.
- **Decision**: All API responses wrap payloads in `{ "success": boolean, "data": ..., "message"?: string }` or `{ "success": false, "error": { "code": ..., "message": ..., "details": ... } }`.
- **Consequences**: Uniform frontend error handling and standardized API contracts.

## ADR-005: UUID Primary Key Format
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: Domain models require non-enumerable, globally unique primary keys that function identically in distributed cloud environments, test suites, and client apps.
- **Decision**: All database entities use `String(36)` UUIDv4 primary keys generated on the application layer via `uuid.uuid4()`.
- **Consequences**: Prevents ID enumeration attacks (e.g. `/api/v1/users/1`); guarantees cross-database compatibility across SQLite testing and PostgreSQL production.

## ADR-006: Academic Entity Deletion Policies
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: Accidental cascading deletion of institutional parent records (e.g., deleting a Department or User) could permanently erase student transcripts, grade histories, or course enrollments.
- **Decision**: Enforce `ondelete="RESTRICT"` for critical institutional associations (Department, Semester, Course, User). Use `ondelete="CASCADE"` strictly for content-tree children (Course -> Modules -> Topics, Role -> RolePermissions).
- **Consequences**: Prevents accidental data loss; requires explicit administrative archiving rather than destructive cascading deletes.

## ADR-007: Five-Role Security Architecture and VC Separation
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: The institution requires a distinct separation between institutional academic governance (Vice Chancellor) and technical platform operations (Administrator).
- **Decision**: Establish exactly five official system roles: `STUDENT`, `FACULTY`, `HOD`, `VC`, and `ADMINISTRATOR`. The `VC` role is granted multi-department visibility over academic analytics, KPI reports, and academic approvals, but is explicitly barred from user management, role alterations, and platform technical settings unless individually granted.
- **Consequences**: Clear separation of institutional academic oversight from IT system administration; eliminates privilege overreach.

## ADR-008: Revocable Refresh Token Storage and Rotation
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: Stateless JWT access tokens cannot be revoked before expiration, which poses a security risk if user sessions are compromised or after explicit logout.
- **Decision**: Implement short-lived stateless JWT access tokens (30 minutes) paired with persistent database-backed refresh tokens (`refresh_tokens` table). On each token refresh, rotate the refresh token and revoke the old token. On logout, immediately revoke the active refresh token.
- **Consequences**: Enables immediate termination of refresh sessions; limits token reuse window while preserving stateless performance for standard request authorization.

## ADR-009: Hierarchical Syllabus Structure and Course Tree API
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: Academic curricula require deep nested structures (Course -> CourseModule -> Topic) with deterministic sequence ordering. Fetching each topic individually causes N+1 network requests on the frontend.
- **Decision**: Expose `GET /api/v1/courses/{course_id}/structure` which utilizes SQLAlchemy `selectinload` eager loading to fetch the complete ordered curriculum tree in a single database transaction, validated by the user's role authorization scope.
- **Consequences**: Reduces frontend API latency; ensures atomic retrieval of syllabus hierarchies with guaranteed ordering.

## ADR-010: Faculty Assignment and Student Enrollment Scope Enforcement
- **Date**: 2026-08-31
- **Status**: Accepted
- **Context**: Authorization to view course rosters or edit course materials cannot rely solely on URL parameters.
- **Decision**: Faculty course management permissions are strictly gated through the `course_instructors` association table. Student enrollment operations derive student identity directly from the authenticated JWT `sub` claim and validate against existing `enrollments` records with `status='ACTIVE'`.
- **Consequences**: Complete elimination of horizontal privilege escalation and IDOR vulnerabilities for course operations.
