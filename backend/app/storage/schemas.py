from typing import Literal

from pydantic import BaseModel, Field, field_validator


class UploadRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=180)
    content_type: str = Field(min_length=3, max_length=100)
    size_bytes: int = Field(gt=0)
    category: Literal["avatars", "assignments", "course-materials", "documents"]

    @field_validator("file_name")
    @classmethod
    def validate_file_name(cls, value: str) -> str:
        clean = value.strip().replace("\\", "/").split("/")[-1]
        if clean in {"", ".", ".."}:
            raise ValueError("A valid file name is required")
        return clean


class UploadAuthorization(BaseModel):
    upload_url: str
    form_fields: dict[str, str]
    object_key: str
    asset_url: str
    expires_in: int
