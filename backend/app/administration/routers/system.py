"""System health, AI administration, and shared operational state."""

from datetime import datetime, timezone
from typing import Any, Dict
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.auth.dependencies import get_current_active_user, require_role
from app.models.user import User
from app.models.administration import SystemConfiguration
from app.administration.schemas import SystemHealthResponse, AIAdminStatusResponse
from app.administration.services.system_health_service import check_system_health
from app.administration.services.ai_admin_service import get_ai_admin_status

router = APIRouter(prefix="/admin", tags=["System Health & AI Admin"])

OPERATIONAL_STATE_KEY = "ACADEMIC_OPERATIONAL_STATE"
OPERATIONAL_STATE_DESCRIPTION = "Shared, database-backed state used across academic portals."

ROLE_WRITABLE_FIELDS = {
    "ADMINISTRATOR": None,
    "EXAMINATION": {
        "calendarSchedules", "institutionalHolidays", "modules", "quizzes", "caseStudies",
        "attendanceSessions", "facultyPresence", "doubtSessions", "facultyLeaves", "studentLeaves",
        "examClearances", "hallTicketsReleased", "batchCriteria", "semesterHistory",
        "currentSemester", "activeSemesterFilter", "notifications", "announcements",
        "questionPapers", "examSeatingMap", "publishedBatchMap", "proctoringOverrides",
        "dsaScoresMap", "seeScoresMap",
    },
    "HOD": {
        "calendarSchedules", "institutionalHolidays", "modules", "quizzes", "caseStudies",
        "caseStudySubmissions", "attendanceSessions", "facultyPresence", "doubtSessions",
        "facultyLeaves", "studentLeaves", "courseModules", "moduleFeedbacks",
        "notifications", "announcements", "dsaScoresMap", "dsaPublishedMap",
        "dsaRawMarksMap", "dsaBreakdownMap", "dsaEvaluationConfig", "dsaComponents",
        "questionPapers", "projectTeams", "projectSubmissions", "facultyProjects",
    },
    "FACULTY": {
        "calendarSchedules", "institutionalHolidays", "modules", "quizzes", "caseStudies",
        "caseStudySubmissions", "attendanceSessions", "facultyPresence", "doubtSessions",
        "facultyLeaves", "studentLeaves", "courseModules", "moduleFeedbacks",
        "notifications", "announcements", "dsaScoresMap", "dsaPublishedMap",
        "dsaRawMarksMap", "dsaBreakdownMap", "dsaEvaluationConfig", "dsaComponents",
        "questionPapers", "projectTeams", "projectSubmissions", "facultyProjects",
    },
    "STUDENT": {
        "doubtSessions", "studentLeaves", "moduleFeedbacks", "quizzes",
        "projectSubmissions", "projectTeams", "facultyProjects", "caseStudies", "caseStudySubmissions", "notifications",
    },
    "VC": None,
}


@router.get("/operational-state")
def get_operational_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return the shared operational state from the primary database."""
    record = db.query(SystemConfiguration).filter(
        SystemConfiguration.config_key == OPERATIONAL_STATE_KEY
    ).first()
    return {"success": True, "data": record.config_value if record else {}}


@router.patch("/operational-state")
@router.put("/operational-state")
def update_operational_state(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Atomically merge role-approved fields into shared operational state."""
    role_name = current_user.role.name if current_user.role else ""
    allowed_fields = ROLE_WRITABLE_FIELDS.get(role_name, set())
    forbidden = set(payload) if allowed_fields is None else set(payload) - allowed_fields
    if allowed_fields is not None and forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role {role_name or 'UNKNOWN'} cannot update: {sorted(forbidden)}",
        )

    record = db.query(SystemConfiguration).filter(
        SystemConfiguration.config_key == OPERATIONAL_STATE_KEY
    ).with_for_update().first()
    if record is None:
        record = SystemConfiguration(
            config_key=OPERATIONAL_STATE_KEY,
            config_value={},
            is_sensitive=False,
            description=OPERATIONAL_STATE_DESCRIPTION,
        )
        db.add(record)
        db.flush()

    current = dict(record.config_value or {})
    current.update(payload)
    record.config_value = current
    flag_modified(record, "config_value")
    db.commit()
    db.refresh(record)
    return {"success": True, "data": record.config_value}


@router.post("/projects/{project_id}/submit")
def submit_student_project(
    project_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("STUDENT")),
):
    """Save a student's project work without allowing client-side grading changes."""
    record = db.query(SystemConfiguration).filter(
        SystemConfiguration.config_key == OPERATIONAL_STATE_KEY
    ).with_for_update().first()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project was not found.")

    state = dict(record.config_value or {})
    projects = list(state.get("facultyProjects") or [])
    project_index = next((i for i, project in enumerate(projects) if project.get("id") == project_id), None)
    if project_index is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project was not found.")

    project = dict(projects[project_index])
    if project.get("status") not in {"ACTIVE", "SUBMISSIONS_OPEN", "EVALUATING"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project submissions are closed.")

    allowed_fields = ("subjectiveAnswer", "approach", "codeSnippet", "complexityAnalysis")
    submission = {key: str(payload.get(key) or "").strip() for key in allowed_fields}
    if not any(submission.values()):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Submission content is required.")

    user_id = str(current_user.id)
    teams = list(project.get("teams") or [])
    team_index = next((
        i for i, team in enumerate(teams)
        if team.get("leadStudentId") == user_id
        or any(str(member.get("id")) == user_id for member in team.get("members") or [])
    ), None)
    name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    now = datetime.now(timezone.utc).isoformat()

    if team_index is None:
        team = {
            "id": f"team-{uuid4()}",
            "name": f"{name}'s submission",
            "leadStudentId": user_id,
            "members": [{
                "id": user_id,
                "name": name,
                "rollNumber": current_user.student_identifier or "",
                "isLead": True,
            }],
        }
        teams.append(team)
        team_index = len(teams) - 1

    teams[team_index] = {
        **teams[team_index],
        **submission,
        "submissionStatus": "SUBMITTED",
        "submittedAt": now,
    }
    project["teams"] = teams
    projects[project_index] = project
    state["facultyProjects"] = projects
    record.config_value = state
    flag_modified(record, "config_value")
    db.commit()
    return {"success": True, "data": teams[team_index]}


@router.get("/system/health", response_model=SystemHealthResponse)
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Run real-time diagnostics on all critical platform subsystems."""
    return check_system_health(db)


@router.get("/ai/status", response_model=AIAdminStatusResponse)
def get_ai_status(
    current_user: User = Depends(require_role("ADMINISTRATOR")),
):
    """Retrieve AI gateway status, usage metrics, and safety rules (Secrets strictly masked)."""
    return get_ai_admin_status()
