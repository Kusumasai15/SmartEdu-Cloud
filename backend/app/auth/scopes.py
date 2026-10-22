"""Resource-Level Authorization and Object Scoping Engine."""
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User, Course, CourseInstructor, Enrollment, Department


def can_access_student(user: User, target_student_id: str, db: Session) -> bool:
    """Verify if the authenticated user has legitimate authorization to access target student's records."""
    if not user or not user.is_active:
        return False

    user_role = user.role.name if user.role else ""

    # Administrator, VC & Examination have institution-wide oversight
    if user_role in ["ADMINISTRATOR", "VC", "EXAMINATION"]:
        return True

    # Student can only access their own profile and records (IDOR protection)
    if user_role == "STUDENT":
        return str(user.id) == str(target_student_id)

    # Load target student
    target_student = db.query(User).filter(User.id == target_student_id).first()
    if not target_student:
        return False

    # HOD can access students belonging to their own department
    if user_role == "HOD":
        return bool(user.department_id and target_student.department_id == user.department_id)

    # Faculty can access students currently enrolled in courses taught by this faculty member
    if user_role == "FACULTY":
        is_student_in_faculty_course = (
            db.query(Enrollment.id)
            .join(CourseInstructor, CourseInstructor.course_id == Enrollment.course_id)
            .filter(
                CourseInstructor.faculty_id == user.id,
                Enrollment.student_id == target_student_id,
            )
            .first()
        )
        return is_student_in_faculty_course is not None

    return False


def verify_student_access(user: User, target_student_id: str, db: Session) -> None:
    """Raise HTTPException 403 if user cannot access target student records."""
    if not can_access_student(user, target_student_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not have permission to view or manage this student's records.",
        )


def can_access_course(user: User, target_course_id: str, db: Session) -> bool:
    """Verify if the authenticated user is authorized to access the specific course."""
    if not user or not user.is_active:
        return False

    user_role = user.role.name if user.role else ""

    # Administrator, VC & Examination have full course catalog visibility
    if user_role in ["ADMINISTRATOR", "VC", "EXAMINATION"]:
        return True

    course = db.query(Course).filter(Course.id == target_course_id).first()
    if not course:
        return False

    # HOD can access courses offered by their department
    if user_role == "HOD":
        return bool(user.department_id and course.department_id == user.department_id)

    # Faculty can access courses where they are assigned as instructor
    if user_role == "FACULTY":
        assignment = (
            db.query(CourseInstructor)
            .filter(
                CourseInstructor.course_id == target_course_id,
                CourseInstructor.faculty_id == user.id,
            )
            .first()
        )
        return assignment is not None

    # Student can access courses where they are currently enrolled
    if user_role == "STUDENT":
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.course_id == target_course_id,
                Enrollment.student_id == user.id,
            )
            .first()
        )
        return enrollment is not None

    return False


def verify_course_access(user: User, target_course_id: str, db: Session) -> None:
    """Raise HTTPException 403 if user cannot access target course."""
    if not can_access_course(user, target_course_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not have permission to view or manage this course.",
        )


def can_access_department(user: User, target_department_id: str, db: Session) -> bool:
    """Verify if user has authority over or access to the target department."""
    if not user or not user.is_active:
        return False

    user_role = user.role.name if user.role else ""

    # Administrator & VC have institution-wide department access
    if user_role in ["ADMINISTRATOR", "VC"]:
        return True

    # HOD, Faculty, and Students can access their own department
    return bool(user.department_id and str(user.department_id) == str(target_department_id))


def verify_department_access(user: User, target_department_id: str, db: Session) -> None:
    """Raise HTTPException 403 if user cannot access target department."""
    if not can_access_department(user, target_department_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not have permission to view or manage this department.",
        )
