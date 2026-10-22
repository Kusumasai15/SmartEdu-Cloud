import logging
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user, get_optional_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import Assignment, AssignmentSubmission, Course, CourseInstructor, User
from app.storage.schemas import UploadAuthorization, UploadRequest

logger = logging.getLogger("smartedu.storage")

router = APIRouter(prefix="/storage", tags=["Storage"])
OBJECT_KEY_PATTERN = re.compile(r"^(avatars|assignments|course-materials|documents)/([a-f0-9-]{36})/[a-f0-9]{32}(\.[a-z0-9]{1,12})?$")
LOCAL_STORAGE_DIR = Path(os.getenv("LOCAL_STORAGE_DIR", Path(tempfile.gettempdir()) / "smartedu_uploads"))
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/x-python",
    "application/json",
    "application/zip",
    "application/x-zip-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-compressed",
    "application/octet-stream",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


@router.post("/uploads", response_model=UploadAuthorization)
def authorize_upload(
    payload: UploadRequest,
    current_user: User = Depends(get_current_active_user),
) -> UploadAuthorization:
    """Create a short-lived S3 upload form."""
    if payload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="This file type is not allowed.")
    if payload.size_bytes > settings.AWS_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="The file exceeds the upload limit.")
    if payload.category == "avatars" and not payload.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Profile images must be JPEG, PNG, or WebP.")
    role = current_user.role.name if current_user.role else ""
    allowed_roles = {
        "avatars": {"STUDENT", "FACULTY", "HOD", "VC", "ADMINISTRATOR"},
        "assignments": {"STUDENT"},
        "course-materials": {"FACULTY", "HOD", "ADMINISTRATOR"},
        "documents": {"ADMINISTRATOR"},
    }
    if role not in allowed_roles[payload.category]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This upload category is not available to your role.")

    suffix = re.sub(r"[^a-zA-Z0-9.]", "", Path(payload.file_name).suffix.lower())[:12]
    object_key = f"{payload.category}/{current_user.id}/{uuid.uuid4().hex}{suffix}"

    if settings.AWS_S3_BUCKET:
        try:
            s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
            )
            conditions = [
                {"Content-Type": payload.content_type},
                {"x-amz-server-side-encryption": "AES256"},
                ["content-length-range", 1, settings.AWS_MAX_UPLOAD_BYTES],
            ]
            fields = {
                "Content-Type": payload.content_type,
                "x-amz-server-side-encryption": "AES256",
            }
            signed = s3.generate_presigned_post(
                Bucket=settings.AWS_S3_BUCKET,
                Key=object_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=settings.AWS_UPLOAD_URL_EXPIRE_SECONDS,
            )
            asset_url = f"s3://{settings.AWS_S3_BUCKET}/{object_key}"
            return UploadAuthorization(
                upload_url=signed["url"],
                form_fields=signed["fields"],
                object_key=object_key,
                asset_url=asset_url,
                expires_in=settings.AWS_UPLOAD_URL_EXPIRE_SECONDS,
            )
        except Exception as exc:
            logger.error("AWS S3 presigned upload generation failed: %s", exc)
            if settings.ENVIRONMENT.lower() in {"production", "prod"}:
                raise HTTPException(status_code=503, detail="File storage is temporarily unavailable.") from exc

    # Fallback to direct application server storage
    return UploadAuthorization(
        upload_url="/api/v1/storage/direct-upload",
        form_fields={"category": payload.category, "object_key": object_key},
        object_key=object_key,
        asset_url=f"/api/v1/storage/files/{object_key}",
        expires_in=settings.AWS_UPLOAD_URL_EXPIRE_SECONDS,
    )


@router.post("/direct-upload")
async def direct_upload(
    file: UploadFile = File(...),
    category: str = Form("assignments"),
    object_key: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Local upload path with policy checks matching S3 uploads."""
    if category not in {"avatars", "assignments", "course-materials", "documents"}:
        raise HTTPException(status_code=400, detail="Invalid upload category.")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="This file type is not allowed.")
    if not object_key:
        suffix = re.sub(r"[^a-zA-Z0-9.]", "", Path(file.filename or "").suffix.lower())[:12]
        object_key = f"{category}/{current_user.id}/{uuid.uuid4().hex}{suffix}"

    contents = await file.read()
    if not contents or len(contents) > settings.AWS_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The file is empty or exceeds the upload limit.")
    match = OBJECT_KEY_PATTERN.fullmatch(object_key)
    if not match or match.group(1) != category or match.group(2) != current_user.id:
        raise HTTPException(status_code=403, detail="Invalid upload destination.")
    dest_path = (LOCAL_STORAGE_DIR / object_key).resolve()
    if LOCAL_STORAGE_DIR.resolve() not in dest_path.parents:
        raise HTTPException(status_code=400, detail="Invalid object key.")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(contents)

    asset_url = f"/api/v1/storage/files/{object_key}"

    # Mirror to AWS S3 if configured
    if settings.AWS_S3_BUCKET:
        try:
            s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
            )
            s3.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=object_key,
                Body=contents,
                ContentType=file.content_type or "application/octet-stream",
            )
        except Exception as exc:
            logger.warning("S3 mirror upload failed: %s", exc)

    # If avatar upload, automatically update user record in database
    if category == "avatars":
        current_user.avatar_url = asset_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return {
        "success": True,
        "object_key": object_key,
        "asset_url": asset_url,
        "file_name": file.filename,
        "size_bytes": len(contents),
    }


@router.get("/files/{object_key:path}")
def serve_uploaded_file(
    object_key: str,
    download: bool = False,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Serve an owned or public avatar file. Avatars are accessible without authentication."""
    match = OBJECT_KEY_PATTERN.fullmatch(object_key)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid object key format.")
    category, owner_id = match.group(1), match.group(2)

    # Only avatars are public without login. Non-avatar files require valid authentication.
    if category != "avatars":
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
        role = current_user.role.name if current_user.role else ""
        if owner_id != current_user.id and role != "ADMINISTRATOR":
            raise HTTPException(status_code=403, detail="You do not have access to this file.")

    file_path = (LOCAL_STORAGE_DIR / object_key).resolve()
    if LOCAL_STORAGE_DIR.resolve() not in file_path.parents:
        raise HTTPException(status_code=400, detail="Invalid object key.")

    # If file not found locally but S3 is configured, attempt fetch from S3
    if not file_path.is_file() and settings.AWS_S3_BUCKET:
        try:
            s3 = boto3.client("s3", region_name=settings.AWS_REGION, config=Config(signature_version="s3v4"))
            file_path.parent.mkdir(parents=True, exist_ok=True)
            s3.download_file(settings.AWS_S3_BUCKET, object_key, str(file_path))
        except Exception as exc:
            logger.warning("Could not download %s from S3: %s", object_key, exc)

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Requested file not found.")

    suffix = file_path.suffix.lower()
    media_type = (
        "application/pdf"
        if suffix == ".pdf"
        else "image/png"
        if suffix == ".png"
        else "image/jpeg"
        if suffix in (".jpg", ".jpeg")
        else "image/webp"
        if suffix == ".webp"
        else "application/zip"
        if suffix == ".zip"
        else "text/plain"
        if suffix in (".txt", ".log", ".py", ".md", ".json")
        else "application/octet-stream"
    )

    disposition = "attachment" if download else "inline"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        content_disposition_type=disposition,
        filename=file_path.name,
    )


@router.get("/download", response_model=dict)
def authorize_download(
    object_key: str = Query(..., max_length=220),
    download: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Grant access to an owned file or an assigned student's submission."""
    # Check if file exists locally
    local_file = LOCAL_STORAGE_DIR / object_key
    if local_file.is_file():
        dl_param = "?download=true" if download else ""
        return {"url": f"/api/v1/storage/files/{object_key}{dl_param}", "expires_in": 3600}

    if not settings.AWS_S3_BUCKET:
        raise HTTPException(status_code=503, detail="File storage is not configured.")
    match = OBJECT_KEY_PATTERN.fullmatch(object_key)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid object key.")

    category, owner_id = match.group(1), match.group(2)
    role = current_user.role.name if current_user.role else ""
    permitted = owner_id == current_user.id or role == "ADMINISTRATOR"
    if not permitted and category == "assignments" and role in {"FACULTY", "HOD"}:
        stored_url = f"s3://{settings.AWS_S3_BUCKET}/{object_key}"
        query = (
            db.query(AssignmentSubmission.id)
            .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
            .join(Course, Assignment.course_id == Course.id)
            .filter(AssignmentSubmission.attachment_url == stored_url)
        )
        if role == "FACULTY":
            query = query.join(CourseInstructor, CourseInstructor.course_id == Course.id).filter(
                CourseInstructor.faculty_id == current_user.id
            )
        else:
            query = query.filter(Course.department_id == current_user.department_id)
        permitted = query.first() is not None
    if not permitted:
        raise HTTPException(status_code=403, detail="You do not have access to this file.")

    try:
        s3 = boto3.client("s3", region_name=settings.AWS_REGION, config=Config(signature_version="s3v4"))
        params = {"Bucket": settings.AWS_S3_BUCKET, "Key": object_key}
        if not download:
            params["ResponseContentDisposition"] = "inline"
        else:
            params["ResponseContentDisposition"] = f'attachment; filename="{Path(object_key).name}"'
        url = s3.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=settings.AWS_UPLOAD_URL_EXPIRE_SECONDS,
        )
        return {"url": url, "expires_in": settings.AWS_UPLOAD_URL_EXPIRE_SECONDS}
    except Exception as exc:
        logger.error("S3 download authorization failed: %s", exc)
        raise HTTPException(status_code=503, detail="File download is temporarily unavailable.") from exc
