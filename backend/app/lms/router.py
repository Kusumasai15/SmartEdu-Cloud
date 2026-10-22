"""LMS & Course Content REST API Router."""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user, get_current_active_user, require_permission
from app.models.user import User
from app.lms.schemas import (
    LearningContentCreate,
    LearningContentUpdate,
    LearningContentResponse,
    LearningContentViewWithProgress,
    ProgressUpdatePayload,
    ProgressResponse,
    CourseLearningView,
    FacultyCourseAnalytics,
)
from app.lms.service import lms_service

router = APIRouter(tags=["LMS & Learning Content"])


# -------------------------------------------------------------
# TOPIC CONTENT CRUD & LIFECYCLE
# -------------------------------------------------------------

@router.post(
    "/topics/{topic_id}/content",
    response_model=LearningContentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create learning content attached to topic",
)
def create_topic_content(
    topic_id: str,
    payload: LearningContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("topic:create")),
):
    """Author a new learning content item (Faculty assigned / Admin)."""
    return lms_service.create_content(db, topic_id, payload, current_user)


@router.get(
    "/topics/{topic_id}/content",
    response_model=List[LearningContentResponse],
    summary="List learning contents for a topic",
)
def list_topic_contents(
    topic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List contents for a topic. Enforces role visibility (Students see PUBLISHED only)."""
    topic, module, course = lms_service.get_course_for_topic(db, topic_id)
    role_name = current_user.role.name if current_user.role else ""

    if role_name == "STUDENT":
        lms_service.verify_student_course_enrollment(db, current_user, course.id)
    else:
        lms_service.verify_faculty_course_authorization(db, current_user, course.id)

    from app.models.learning_content import LearningContent, ContentStatus
    query = db.query(LearningContent).filter(LearningContent.topic_id == topic_id)
    if role_name == "STUDENT":
        query = query.filter(LearningContent.status == ContentStatus.PUBLISHED.value)
    else:
        query = query.filter(LearningContent.status != ContentStatus.ARCHIVED.value)

    return query.order_by(LearningContent.display_order.asc()).all()


@router.get(
    "/content/{content_id}",
    response_model=LearningContentResponse,
    summary="Get single learning content item",
)
def get_content_item(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve content details. Verifies student enrollment or faculty assignment."""
    return lms_service.get_content_by_id(db, content_id, current_user)


@router.patch(
    "/content/{content_id}",
    response_model=LearningContentResponse,
    summary="Update learning content item",
)
def update_content_item(
    content_id: str,
    payload: LearningContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("topic:update")),
):
    """Update learning content parameters."""
    return lms_service.update_content(db, content_id, payload, current_user)


@router.post(
    "/content/{content_id}/publish",
    response_model=LearningContentResponse,
    summary="Publish learning content item",
)
def publish_content_item(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("topic:update")),
):
    """Transition draft content to PUBLISHED state."""
    return lms_service.publish_content(db, content_id, current_user)


@router.post(
    "/content/{content_id}/archive",
    response_model=LearningContentResponse,
    summary="Archive learning content item",
)
def archive_content_item(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("topic:update")),
):
    """Transition content to ARCHIVED state."""
    return lms_service.archive_content(db, content_id, current_user)


@router.post(
    "/content/{content_id}/restore",
    response_model=LearningContentResponse,
    summary="Restore archived learning content item",
)
def restore_content_item(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("topic:update")),
):
    """Transition archived content back to active PUBLISHED state."""
    return lms_service.restore_content(db, content_id, current_user)


@router.get(
    "/courses/{course_id}/archived-content",
    response_model=List[Dict[str, Any]],
    summary="Retrieve all archived content items for a course",
)
def get_course_archived_content(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:read")),
):
    """Retrieve archived materials list for course management."""
    return lms_service.get_archived_content_for_course(db, course_id, current_user)


@router.delete(
    "/content/{content_id}",
    response_model=Dict[str, Any],
    summary="Delete or archive learning content",
)
def delete_content_item(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("topic:delete")),
):
    """Safely delete content item (automatically archives if progress exists)."""
    return lms_service.delete_content(db, content_id, current_user)


# -------------------------------------------------------------
# STUDENT LEARNING & PROGRESS TRACKING
# -------------------------------------------------------------

@router.post(
    "/content/{content_id}/progress",
    response_model=ProgressResponse,
    summary="Update student completion progress",
)
def update_content_progress(
    content_id: str,
    payload: ProgressUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("enrollment:view")),
):
    """Mark content item as completed/in-progress. Student identity is derived strictly from JWT subject."""
    return lms_service.update_student_content_progress(db, content_id, payload, current_user)


@router.get(
    "/courses/{course_id}/learn",
    response_model=CourseLearningView,
    summary="Get full course learning structure with student progress",
)
def get_course_learning_tree(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch complete hierarchical course learning tree for the LMS learning player."""
    return lms_service.get_course_learning_tree(db, course_id, current_user)


# -------------------------------------------------------------
# FACULTY COURSE LEARNING ANALYTICS
# -------------------------------------------------------------

@router.get(
    "/courses/{course_id}/faculty-analytics",
    response_model=FacultyCourseAnalytics,
    summary="Get real faculty learning progress analytics for course",
)
def get_faculty_course_analytics(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("course:view")),
):
    """Compute real student completion matrix and course statistics (zero fake data)."""
    return lms_service.get_faculty_course_analytics(db, course_id, current_user)
