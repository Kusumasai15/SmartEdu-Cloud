"""LMS & Course Content Service Layer."""
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from app.models.learning_content import LearningContent, ContentType, ContentStatus
from app.models.content_progress import StudentContentProgress, ProgressStatus
from app.models.topic import Topic
from app.models.course_module import CourseModule
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.user import User
from app.lms.schemas import (
    LearningContentCreate,
    LearningContentUpdate,
    ProgressUpdatePayload,
    LearningContentViewWithProgress,
    TopicLearningView,
    ModuleLearningView,
    CourseLearningView,
    StudentProgressRow,
    FacultyCourseAnalytics,
)


class LMSService:
    """Service layer for learning content delivery, progress calculation, and faculty content management."""

    # -------------------------------------------------------------
    # AUTHORIZATION CHAIN CHECKS
    # -------------------------------------------------------------

    @staticmethod
    def get_course_for_topic(db: Session, topic_id: str) -> Tuple[Topic, CourseModule, Course]:
        """Traverse Topic -> CourseModule -> Course."""
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic '{topic_id}' not found",
            )
        module = db.query(CourseModule).filter(CourseModule.id == topic.module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course module not found",
            )
        course = db.query(Course).filter(Course.id == module.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course not found",
            )
        return topic, module, course

    @staticmethod
    def resolve_course(db: Session, course_id: str) -> Course:
        """Resolve a Course model by UUID or course code (space and case-insensitive)."""
        clean_target = (course_id or "").strip()
        course = db.query(Course).filter(
            or_(
                Course.id == clean_target,
                Course.course_code == clean_target,
                Course.course_code == clean_target.replace(" ", "-"),
                Course.course_code == clean_target.replace("-", " "),
                func.upper(func.replace(Course.course_code, "-", "")) == clean_target.upper().replace("-", "").replace(" ", "")
            )
        ).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course '{course_id}' not found",
            )
        return course

    @staticmethod
    def verify_faculty_course_authorization(db: Session, user: User, course_id: str):
        """Verify that user is ADMINISTRATOR, HOD of course department, or assigned FACULTY."""
        role_name = user.role.name if user.role else ""
        if role_name in ["ADMINISTRATOR", "VC"]:
            return LMSService.resolve_course(db, course_id)

        course = LMSService.resolve_course(db, course_id)

        if role_name == "HOD":
            if user.department_id != course.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HOD cannot manage content outside own department",
                )
            return course

        if role_name == "FACULTY":
            is_assigned = (
                db.query(CourseInstructor)
                .filter(
                    CourseInstructor.course_id == course.id,
                    CourseInstructor.faculty_id == user.id,
                )
                .first()
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Faculty is not assigned to this course",
                )
            return course

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have faculty management permissions",
        )

    @staticmethod
    def verify_student_course_enrollment(db: Session, user: User, course_id: str) -> Enrollment:
        """Verify that user is enrolled as ACTIVE in the course, or has elevated academic view permissions."""
        role_name = user.role.name if user.role else ""
        if role_name in ["ADMINISTRATOR", "VC", "HOD", "FACULTY"]:
            return None  # Academic staff can preview course

        if role_name != "STUDENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only enrolled students can access learning content",
            )

        course = LMSService.resolve_course(db, course_id)

        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student is not actively enrolled in this course",
            )
        return enrollment

    # -------------------------------------------------------------
    # LEARNING CONTENT CRUD & LIFECYCLE
    # -------------------------------------------------------------

    def create_content(
        self,
        db: Session,
        topic_id: str,
        payload: LearningContentCreate,
        current_user: User,
    ) -> LearningContent:
        """Create new learning content item attached to topic."""
        topic, module, course = self.get_course_for_topic(db, topic_id)
        self.verify_faculty_course_authorization(db, current_user, course.id)

        # Compute next display order if not specified or colliding
        existing_count = db.query(LearningContent).filter(LearningContent.topic_id == topic_id).count()
        display_order = payload.display_order if payload.display_order else (existing_count + 1)

        # Check collision
        collision = (
            db.query(LearningContent)
            .filter(
                LearningContent.topic_id == topic_id,
                LearningContent.display_order == display_order,
            )
            .first()
        )
        if collision:
            display_order = existing_count + 1

        published_at = datetime.now(timezone.utc) if payload.status == ContentStatus.PUBLISHED else None

        content = LearningContent(
            topic_id=topic_id,
            title=payload.title.strip(),
            description=payload.description,
            content_type=payload.content_type.value if hasattr(payload.content_type, "value") else payload.content_type,
            content_url=str(payload.content_url) if payload.content_url else None,
            text_content=payload.text_content,
            thumbnail_url=str(payload.thumbnail_url) if payload.thumbnail_url else None,
            display_order=display_order,
            status=payload.status.value if hasattr(payload.status, "value") else payload.status,
            is_required=payload.is_required,
            created_by=current_user.id,
            published_at=published_at,
        )
        db.add(content)
        db.commit()
        db.refresh(content)
        return content

    def get_content_by_id(
        self,
        db: Session,
        content_id: str,
        current_user: User,
    ) -> LearningContent:
        """Fetch content item and verify authorization."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        role_name = current_user.role.name if current_user.role else ""

        if role_name == "STUDENT":
            self.verify_student_course_enrollment(db, current_user, course.id)
            if content.status != ContentStatus.PUBLISHED.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Content is not published yet",
                )
        else:
            self.verify_faculty_course_authorization(db, current_user, course.id)

        return content

    def update_content(
        self,
        db: Session,
        content_id: str,
        payload: LearningContentUpdate,
        current_user: User,
    ) -> LearningContent:
        """Update content item."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        self.verify_faculty_course_authorization(db, current_user, course.id)

        update_data = payload.dict(exclude_unset=True)
        if "status" in update_data and update_data["status"]:
            status_val = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]
            if status_val == ContentStatus.PUBLISHED.value and content.status != ContentStatus.PUBLISHED.value:
                content.published_at = datetime.now(timezone.utc)
            content.status = status_val
            del update_data["status"]

        if "content_type" in update_data and update_data["content_type"]:
            content.content_type = (
                update_data["content_type"].value
                if hasattr(update_data["content_type"], "value")
                else update_data["content_type"]
            )
            del update_data["content_type"]

        for key, value in update_data.items():
            setattr(content, key, value)

        db.commit()
        db.refresh(content)
        return content

    def publish_content(
        self,
        db: Session,
        content_id: str,
        current_user: User,
    ) -> LearningContent:
        """Transition content to PUBLISHED state."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        self.verify_faculty_course_authorization(db, current_user, course.id)

        content.status = ContentStatus.PUBLISHED.value
        content.published_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(content)
        return content

    def archive_content(
        self,
        db: Session,
        content_id: str,
        current_user: User,
    ) -> LearningContent:
        """Transition content to ARCHIVED state."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        self.verify_faculty_course_authorization(db, current_user, course.id)

        content.status = ContentStatus.ARCHIVED.value
        db.commit()
        db.refresh(content)
        return content

    def restore_content(
        self,
        db: Session,
        content_id: str,
        current_user: User,
    ) -> LearningContent:
        """Restore archived content back to PUBLISHED state."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        self.verify_faculty_course_authorization(db, current_user, course.id)

        content.status = ContentStatus.PUBLISHED.value
        db.commit()
        db.refresh(content)
        return content

    def get_archived_content_for_course(
        self,
        db: Session,
        course_id: str,
        current_user: User,
    ) -> List[Dict[str, Any]]:
        """Retrieve all archived learning content items for a course."""
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            course = db.query(Course).filter(Course.course_code == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course '{course_id}' not found",
            )

        modules = db.query(CourseModule).filter(CourseModule.course_id == course.id).all()
        module_map = {m.id: m.title for m in modules}
        module_ids = list(module_map.keys())

        topics = db.query(Topic).filter(Topic.module_id.in_(module_ids)).all() if module_ids else []
        topic_map = {t.id: (t.title, module_map.get(t.module_id, "Unknown Module")) for t in topics}
        topic_ids = list(topic_map.keys())

        archived_contents = (
            db.query(LearningContent)
            .filter(
                LearningContent.topic_id.in_(topic_ids),
                LearningContent.status == ContentStatus.ARCHIVED.value,
            )
            .order_by(LearningContent.updated_at.desc())
            .all()
            if topic_ids
            else []
        )

        return [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "content_type": c.content_type,
                "text_content": c.text_content,
                "content_url": c.content_url,
                "status": c.status,
                "topic_id": c.topic_id,
                "topic_title": topic_map.get(c.topic_id, ("General Topic", ""))[0],
                "module_title": topic_map.get(c.topic_id, ("", "General Module"))[1],
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in archived_contents
        ]

    def delete_content(
        self,
        db: Session,
        content_id: str,
        current_user: User,
    ) -> Dict[str, Any]:
        """Delete or safely archive content if progress records exist."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        self.verify_faculty_course_authorization(db, current_user, course.id)

        # Check if students have historical progress records
        progress_count = db.query(StudentContentProgress).filter(StudentContentProgress.content_id == content_id).count()
        if progress_count > 0:
            # Soft-archive rather than destroying student academic history
            content.status = ContentStatus.ARCHIVED.value
            db.commit()
            return {
                "message": "Content has student progress records; transitioned to ARCHIVED instead of hard deletion",
                "status": "ARCHIVED",
                "content_id": content_id,
            }

        db.delete(content)
        db.commit()
        return {
            "message": "Learning content deleted successfully",
            "content_id": content_id,
        }

    # -------------------------------------------------------------
    # STUDENT LEARNING & PROGRESS ENGINE
    # -------------------------------------------------------------

    def update_student_content_progress(
        self,
        db: Session,
        content_id: str,
        payload: ProgressUpdatePayload,
        student_user: User,
    ) -> StudentContentProgress:
        """Mark content progress (Derived strictly from JWT subject)."""
        content = db.query(LearningContent).filter(LearningContent.id == content_id).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning content '{content_id}' not found",
            )

        topic, module, course = self.get_course_for_topic(db, content.topic_id)
        self.verify_student_course_enrollment(db, student_user, course.id)

        if content.status != ContentStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot record progress on un-published content",
            )

        progress = (
            db.query(StudentContentProgress)
            .filter(
                StudentContentProgress.student_id == student_user.id,
                StudentContentProgress.content_id == content_id,
            )
            .first()
        )

        now = datetime.now(timezone.utc)
        status_val = payload.status.value if hasattr(payload.status, "value") else payload.status

        if not progress:
            progress = StudentContentProgress(
                student_id=student_user.id,
                content_id=content_id,
                status=status_val,
                started_at=now,
                completed_at=now if status_val == ProgressStatus.COMPLETED.value else None,
            )
            db.add(progress)
        else:
            progress.status = status_val
            if not progress.started_at:
                progress.started_at = now
            if status_val == ProgressStatus.COMPLETED.value:
                progress.completed_at = now
            else:
                progress.completed_at = None

        db.commit()
        db.refresh(progress)
        return progress

    def get_course_learning_tree(
        self,
        db: Session,
        course_id: str,
        current_user: User,
    ) -> CourseLearningView:
        """Load the complete structured course learning tree with modules, topics, contents, and student progress."""
        course = self.resolve_course(db, course_id)
        actual_course_id = course.id

        role_name = current_user.role.name if current_user.role else ""
        is_student = (role_name == "STUDENT")

        if is_student:
            self.verify_student_course_enrollment(db, current_user, actual_course_id)
        # Academic staff (Faculty, HOD, Admin) can always view and preview learning content

        # Pre-fetch student progress records for this student if student
        student_progress_map: Dict[str, StudentContentProgress] = {}
        if is_student:
            records = (
                db.query(StudentContentProgress)
                .join(LearningContent, StudentContentProgress.content_id == LearningContent.id)
                .join(Topic, LearningContent.topic_id == Topic.id)
                .join(CourseModule, Topic.module_id == CourseModule.id)
                .filter(
                    StudentContentProgress.student_id == current_user.id,
                    CourseModule.course_id == actual_course_id,
                )
                .all()
            )
            for r in records:
                student_progress_map[r.content_id] = r

        # Fetch modules ordered by display_order
        modules = (
            db.query(CourseModule)
            .filter(CourseModule.course_id == actual_course_id)
            .order_by(CourseModule.display_order.asc())
            .all()
        )

        total_course_published_contents = 0
        total_course_completed_contents = 0

        module_views: List[ModuleLearningView] = []

        for m in modules:
            topics = (
                db.query(Topic)
                .filter(Topic.module_id == m.id)
                .order_by(Topic.display_order.asc())
                .all()
            )

            topic_views: List[TopicLearningView] = []
            module_published_contents = 0
            module_completed_contents = 0

            for t in topics:
                # Content query: Students see PUBLISHED only; Faculty/Admin see all non-archived or all
                content_query = db.query(LearningContent).filter(LearningContent.topic_id == t.id)
                if is_student:
                    content_query = content_query.filter(LearningContent.status == ContentStatus.PUBLISHED.value)
                else:
                    content_query = content_query.filter(LearningContent.status != ContentStatus.ARCHIVED.value)

                contents = content_query.order_by(LearningContent.display_order.asc()).all()

                topic_content_views: List[LearningContentViewWithProgress] = []
                topic_completed_count = 0

                for c in contents:
                    p_rec = student_progress_map.get(c.id)
                    p_status = ProgressStatus(p_rec.status) if p_rec else ProgressStatus.NOT_STARTED
                    is_done = (p_status == ProgressStatus.COMPLETED)
                    if is_done:
                        topic_completed_count += 1

                    topic_content_views.append(
                        LearningContentViewWithProgress(
                            id=c.id,
                            topic_id=c.topic_id,
                            title=c.title,
                            description=c.description,
                            content_type=ContentType(c.content_type),
                            content_url=c.content_url,
                            text_content=c.text_content,
                            thumbnail_url=c.thumbnail_url,
                            display_order=c.display_order,
                            status=ContentStatus(c.status),
                            is_required=c.is_required,
                            created_by=c.created_by,
                            published_at=c.published_at,
                            created_at=c.created_at,
                            updated_at=c.updated_at,
                            student_progress_status=p_status,
                            is_completed=is_done,
                            started_at=p_rec.started_at if p_rec else None,
                            completed_at=p_rec.completed_at if p_rec else None,
                        )
                    )

                tot_c = len(contents)
                progress_pct = (topic_completed_count / tot_c * 100.0) if tot_c > 0 else 0.0
                is_topic_done = (tot_c > 0 and topic_completed_count >= tot_c)

                module_published_contents += tot_c
                module_completed_contents += topic_completed_count

                topic_views.append(
                    TopicLearningView(
                        id=t.id,
                        module_id=t.module_id,
                        title=t.title,
                        description=t.description,
                        display_order=t.display_order,
                        contents=topic_content_views,
                        total_contents=tot_c,
                        completed_contents=topic_completed_count,
                        is_topic_completed=is_topic_done,
                        progress_percentage=round(progress_pct, 1),
                    )
                )

            mod_progress_pct = (
                (module_completed_contents / module_published_contents * 100.0)
                if module_published_contents > 0
                else 0.0
            )

            total_course_published_contents += module_published_contents
            total_course_completed_contents += module_completed_contents

            module_views.append(
                ModuleLearningView(
                    id=m.id,
                    course_id=m.course_id,
                    title=m.title,
                    description=m.description,
                    display_order=m.display_order,
                    topics=topic_views,
                    total_topics=len(topics),
                    completed_topics=sum(1 for tv in topic_views if tv.is_topic_completed),
                    module_progress_percentage=round(mod_progress_pct, 1),
                )
            )

        course_progress_pct = (
            (total_course_completed_contents / total_course_published_contents * 100.0)
            if total_course_published_contents > 0
            else 0.0
        )

        # Resolve assigned instructor
        inst_name = None
        inst_desig = None
        if hasattr(course, "instructors") and course.instructors:
            primary_ci = next((ci for ci in course.instructors if getattr(ci, "is_primary", False)), course.instructors[0])
            u = getattr(primary_ci, "faculty", None) or getattr(primary_ci, "instructor", None)
            if not u and getattr(primary_ci, "faculty_id", None):
                u = db.query(User).filter(User.id == primary_ci.faculty_id).first()
            if u:
                inst_name = f"Prof. {u.first_name} {u.last_name or ''}".strip()
                inst_desig = getattr(u, "designation", None) or (f"Course Director - {course.department.name}" if course.department else "Course Director")

        dept_str = course.department.name if course.department else "Academic Dept"

        return CourseLearningView(
            course_id=course.id,
            course_code=course.course_code,
            title=course.title,
            description=course.description,
            department_name=course.department.name if course.department else None,
            semester_name=course.semester.name if course.semester else None,
            instructor_name=inst_name or "Prof. Subrata Pain",
            instructor_designation=inst_desig or f"Course Director - {dept_str}",
            total_published_contents=total_course_published_contents,
            total_completed_contents=total_course_completed_contents,
            course_progress_percentage=round(course_progress_pct, 1),
            modules=module_views,
        )

    # -------------------------------------------------------------
    # FACULTY LEARNING ANALYTICS (ZERO FAKE DATA)
    # -------------------------------------------------------------

    def get_faculty_course_analytics(
        self,
        db: Session,
        course_id: str,
        current_user: User,
    ) -> FacultyCourseAnalytics:
        """Compute live course progress analytics across all enrolled students."""
        course = self.resolve_course(db, course_id)
        actual_course_id = course.id

        self.verify_faculty_course_authorization(db, current_user, actual_course_id)

        # 1. Total published contents in course
        published_contents = (
            db.query(LearningContent.id)
            .join(Topic, LearningContent.topic_id == Topic.id)
            .join(CourseModule, Topic.module_id == CourseModule.id)
            .filter(
                CourseModule.course_id == actual_course_id,
                LearningContent.status == ContentStatus.PUBLISHED.value,
            )
            .all()
        )
        total_published_count = len(published_contents)
        published_content_ids = [c[0] for c in published_contents]

        # 2. Enrolled students
        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .all()
        )

        roster_rows: List[StudentProgressRow] = []
        total_progress_sum = 0.0
        students_completed_all = 0
        students_not_started = 0

        for enr in enrollments:
            student = enr.student
            if not student:
                continue

            if total_published_count > 0:
                completed_count = (
                    db.query(StudentContentProgress)
                    .filter(
                        StudentContentProgress.student_id == student.id,
                        StudentContentProgress.content_id.in_(published_content_ids),
                        StudentContentProgress.status == ProgressStatus.COMPLETED.value,
                    )
                    .count()
                )
                pct = round((completed_count / total_published_count) * 100.0, 1)
            else:
                completed_count = 0
                pct = 0.0

            if pct >= 100.0 and total_published_count > 0:
                students_completed_all += 1
            elif completed_count == 0:
                students_not_started += 1

            total_progress_sum += pct

            roster_rows.append(
                StudentProgressRow(
                    student_id=student.id,
                    student_name=student.full_name,
                    student_email=student.email,
                    completed_contents_count=completed_count,
                    total_contents_count=total_published_count,
                    progress_percentage=pct,
                    enrollment_date=enr.enrolled_at,
                )
            )

        avg_progress = (total_progress_sum / len(enrollments)) if enrollments else 0.0

        return FacultyCourseAnalytics(
            course_id=course.id,
            course_code=course.course_code,
            course_title=course.title,
            total_enrolled_students=len(enrollments),
            total_published_contents=total_published_count,
            average_course_progress=round(avg_progress, 1),
            students_completed_all=students_completed_all,
            students_not_started=students_not_started,
            student_roster_progress=roster_rows,
        )


lms_service = LMSService()
