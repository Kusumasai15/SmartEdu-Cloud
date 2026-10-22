"""Health Check Response Schemas."""
from datetime import datetime, timezone
from typing import Dict
from pydantic import BaseModel, Field


class HealthStatus(BaseModel):
    """Health check payload structure."""
    status: str = Field(default="healthy", description="Overall health state")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Active environment name")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current UTC timestamp"
    )
    services: Dict[str, str] = Field(default_factory=dict, description="Status of auxiliary services")
