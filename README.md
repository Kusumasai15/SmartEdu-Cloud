# SmartEdu Cloud — Enterprise Academic Management & Learning Platform

SmartEdu Cloud is a full-stack, cloud-native Academic Management and Learning Management System (LMS) engineered for universities and educational institutions.

---

## 1. Five-Role RBAC Model
SmartEdu Cloud enforces strict role-based access control across five primary roles:
1. **STUDENT**: Course content learning, assignment submissions, proctored examinations, attendance shortage tracking, results & transcripts, academic intelligence, in-app messaging with professors.
2. **FACULTY**: Course curriculum authoring, assignments & automated grading, question bank & exam builder, attendance recording, result submission & corrections, timetable & workload.
3. **HOD (Head of Department)**: Departmental curriculum oversight, student leave approvals, result publication approvals, departmental timetabling & conflict resolution, faculty workload balancing.
4. **VC (Vice Chancellor)**: University-wide academic KPIs, institutional performance analytics, multi-department comparative intelligence, university calendar milestones.
5. **ADMINISTRATOR**: Enterprise control center, user directory & status governance, active session revocation, immutable audit explorer, institutional policy versioning, real-time subsystem diagnostics.

---

## 2. Technology Stack
- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons).
- **Backend**: FastAPI (Python 3.13), Pydantic v2, SQLAlchemy 2.0, Uvicorn.
- **Database & Cache**: PostgreSQL 16, Redis 7, Alembic migrations.
- **AI Gateway**: Google Gemini AI (Advisory-only drafting, summarization, and early-warning analytics).
- **Testing**: Pytest & FastAPI TestClient (116 automated tests across 15 phases).

---

## 3. Quickstart Guide

### Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Docker Compose Deployment
```bash
cp .env.example .env
docker compose up -d --build
```

---

## 4. Automated Testing
Run the complete 15-phase test suite:
```bash
cd backend
pytest tests/ -q
```

---

## 5. Security & AI Governance Invariants
- **Non-Authoritative AI**: Gemini outputs are advisory and require human approval before publication or state mutation.
- **PII & Token Masking**: Credentials, JWT tokens, and passwords are automatically redacted before logging and AI processing.
- **Correlation Tracing**: Every HTTP transaction includes an `X-Request-ID` for end-to-end operational visibility.
