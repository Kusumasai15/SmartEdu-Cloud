"""Standard API Response and Error Envelope Schemas."""
from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class APIResponse(BaseModel, Generic[DataT]):
    """Standardized successful response envelope."""
    success: bool = Field(default=True, description="Indicates if the request succeeded")
    data: Optional[DataT] = Field(default=None, description="The payload data returned")
    message: Optional[str] = Field(default=None, description="Optional informative message")


class ErrorDetail(BaseModel):
    """Detailed error object representation."""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable description of error")
    details: Optional[Any] = Field(default=None, description="Optional supplementary validation or context info")


class APIErrorResponse(BaseModel):
    """Standardized error response envelope."""
    success: bool = Field(default=False, description="Always False for error responses")
    error: ErrorDetail = Field(..., description="Error detail container")
