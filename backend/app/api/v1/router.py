"""API v1 Router Aggregator."""
from fastapi import APIRouter
from app.api.v1.endpoints import health
from app.auth.router import router as auth_router
from app.academic.router import router as academic_router
from app.lms.router import router as lms_router
from app.assignments.router import router as assignment_router
from app.assessments.router import router as assessment_router
from app.attendance.router import router as attendance_router
from app.results.router import router as results_router
from app.intelligence.router import router as intelligence_router
from app.communication.routers.notifications import router as notifications_router
from app.communication.routers.announcements import router as announcements_router
from app.communication.routers.messages import router as messages_router
from app.communication.routers.discussions import router as discussions_router
from app.scheduling.routers.calendar import router as calendar_router
from app.scheduling.routers.rooms import router as rooms_router
from app.scheduling.routers.leave import router as leave_router
from app.scheduling.routers.timetable import router as timetable_advanced_router
from app.scheduling.routers.workload import router as workload_router
from app.administration.routers.dashboard import router as admin_dashboard_router
from app.administration.routers.users import router as admin_users_router
from app.administration.routers.audit import router as admin_audit_router
from app.administration.routers.security import router as admin_security_router
from app.administration.routers.policies import router as admin_policies_router
from app.administration.routers.governance import router as admin_governance_router
from app.administration.routers.system import router as admin_system_router
from app.administration.routers.leadership import router as leadership_router
from app.storage.router import router as storage_router

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth_router)
api_router.include_router(academic_router)
api_router.include_router(lms_router)
api_router.include_router(assignment_router)
api_router.include_router(assessment_router)
api_router.include_router(attendance_router)
api_router.include_router(results_router)
api_router.include_router(intelligence_router)
api_router.include_router(notifications_router)
api_router.include_router(announcements_router)
api_router.include_router(messages_router)
api_router.include_router(discussions_router)
api_router.include_router(calendar_router)
api_router.include_router(rooms_router)
api_router.include_router(leave_router)
api_router.include_router(timetable_advanced_router)
api_router.include_router(workload_router)
api_router.include_router(storage_router)
api_router.include_router(leadership_router)

# Administration & Governance Routers (Phase 14)
api_router.include_router(admin_dashboard_router)
api_router.include_router(admin_users_router)
api_router.include_router(admin_audit_router)
api_router.include_router(admin_security_router)
api_router.include_router(admin_policies_router)
api_router.include_router(admin_governance_router)
api_router.include_router(admin_system_router)
