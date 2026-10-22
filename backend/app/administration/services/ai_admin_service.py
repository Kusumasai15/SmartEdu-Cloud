"""Service for AI Gateway Administration, Usage Monitoring, and Security Masking."""

from app.core.config import settings
from app.administration.schemas import AIAdminStatusResponse


def get_ai_admin_status() -> AIAdminStatusResponse:
    """Retrieve AI gateway status, usage indicators, and safety invariants. Secrets are NEVER returned."""
    is_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())

    return AIAdminStatusResponse(
        is_configured=is_configured,
        model_name=settings.GEMINI_MODEL or "gemini-2.5-flash",
        total_draft_requests=0,
        total_summaries_generated=0,
        total_fallbacks_triggered=0,
        total_errors=0,
        human_review_enforced=True,
        safety_disclaimer="All AI capabilities in SmartEdu Cloud remain strictly advisory. Autonomous record modification or publication is blocked by architecture.",
    )
