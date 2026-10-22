"""FastAPI Router for Academic Management REST Endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.auth.dependencies import (
    get_current_active_user,
    require_permission,
    require_role,
)
from app.auth.scopes import (
    verify_course_access,
    verify_department_access,
    can_access_course,
)
from app.models import User, Role, CourseModule, Topic, Course
from app.academic.schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentRead,
    SchoolCreate,
    SchoolUpdate,
    SemesterCreate,
    SemesterUpdate,
    SemesterRead,
    CourseCreate,
    CourseUpdate,
    CourseRead,
    CourseStructureRead,
    CourseModuleCreate,
    CourseModuleUpdate,
    CourseModuleRead,
    TopicCreate,
    TopicUpdate,
    TopicRead,
    CourseInstructorAssign,
    CourseInstructorRead,
    EnrollmentRead,
    CatalogCourseRead,
)
from app.academic import service

router = APIRouter(tags=["Academic Management"])


def _school_data(school):
    return {"id": school.id, "name": school.name, "code": school.code, "dean": school.dean,
            "description": school.description, "is_active": school.is_active}


@router.get("/schools", response_model=dict)
async def get_schools(active_only: bool = False, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return {"success": True, "data": [_school_data(s) for s in service.list_schools(db, active_only)]}


@router.post("/schools", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_school(payload: SchoolCreate, current_user: User = Depends(require_permission("system:config")), db: Session = Depends(get_db)):
    return {"success": True, "data": _school_data(service.create_school(db, payload))}


@router.patch("/schools/{school_id}", response_model=dict)
async def update_school(school_id: str, payload: SchoolUpdate, current_user: User = Depends(require_permission("system:config")), db: Session = Depends(get_db)):
    school = service.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")
    return {"success": True, "data": _school_data(service.update_school(db, school, payload))}


@router.delete("/schools/{school_id}", response_model=dict)
async def delete_school(school_id: str, current_user: User = Depends(require_permission("system:config")), db: Session = Depends(get_db)):
    school = service.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")
    service.delete_school(db, school)
    return {"success": True, "message": "School deleted."}


# ==============================================================================
# 1. DEPARTMENTS
# ==============================================================================

@router.get(
    "/departments",
    response_model=dict,
    summary="List Departments",
)
async def get_departments(
    active_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List academic departments."""
    depts = service.list_departments(db, active_only=active_only)
    results = []
    for d in depts:
        course_count = len(d.courses) if hasattr(d, "courses") and d.courses else 0
        hod_name = getattr(d, "head_of_department", None)
        hod_id = None
        if not hod_name:
            hod_user = (
                db.query(User)
                .join(Role)
                .filter(Role.name == "HOD", User.department_id == d.id)
                .first()
            )
            if hod_user:
                hod_name = f"{hod_user.first_name} {hod_user.last_name}".strip()
                hod_id = hod_user.id
        else:
            hod_user = (
                db.query(User)
                .filter(
                    (User.department_id == d.id) | (User.department_id.is_(None)),
                    or_(
                        func.concat(User.first_name, " ", User.last_name) == hod_name,
                        User.email == hod_name,
                    ),
                )
                .first()
            )
            if hod_user:
                hod_id = hod_user.id

        results.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "school": d.school,
            "description": d.description,
            "head_of_department": {
                "id": hod_id,
                "full_name": hod_name or "Unassigned",
            },
            "hod": hod_name or "Unassigned",
            "dean": hod_name or "Unassigned",
            "cohorts": getattr(d, "cohorts", []) or [],
            "is_active": d.is_active,
            "created_at": d.created_at,
            "course_count": course_count,
        })
    return {"success": True, "data": results}


@router.post(
    "/departments",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create Department",
)
async def create_department(
    payload: DepartmentCreate,
    current_user: User = Depends(require_permission("department:create")),
    db: Session = Depends(get_db),
):
    """Create a new academic department."""
    dept = service.create_department(db, payload)
    hod_name = dept.head_of_department or "Unassigned"
    return {
        "success": True,
        "data": {
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "school": dept.school,
            "head_of_department": {
                "id": None,
                "full_name": hod_name,
            },
            "hod": hod_name,
            "dean": hod_name,
            "cohorts": getattr(dept, "cohorts", []) or [],
            "description": dept.description,
            "is_active": dept.is_active,
        },
        "message": "Department created successfully.",
    }


@router.get("/departments/{department_id}", response_model=dict)
async def get_department(
    department_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get department details."""
    dept = service.get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    verify_department_access(current_user, dept.id, db)
    hod_name = dept.head_of_department or "Unassigned"
    return {
        "success": True,
        "data": {
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "school": dept.school,
            "head_of_department": {
                "id": None,
                "full_name": hod_name,
            },
            "hod": hod_name,
            "dean": hod_name,
            "description": dept.description,
            "is_active": dept.is_active,
            "created_at": dept.created_at,
            "cohorts": getattr(dept, "cohorts", []) or [],
        },
    }


@router.patch("/departments/{department_id}", response_model=dict)
async def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    current_user: User = Depends(require_permission("department:update")),
    db: Session = Depends(get_db),
):
    """Update department information."""
    dept = service.get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    verify_department_access(current_user, dept.id, db)
    updated = service.update_department(db, dept, payload)
    hod_name = updated.head_of_department or "Unassigned"
    return {
        "success": True,
        "data": {
            "id": updated.id,
            "name": updated.name,
            "code": updated.code,
            "school": updated.school,
            "head_of_department": {
                "id": None,
                "full_name": hod_name,
            },
            "hod": hod_name,
            "dean": hod_name,
            "cohorts": getattr(updated, "cohorts", []) or [],
        },
        "message": "Department updated.",
    }


@router.delete("/departments/{department_id}", response_model=dict)
async def delete_department(
    department_id: str,
    current_user: User = Depends(require_permission("system:config")),
    db: Session = Depends(get_db),
):
    """Delete department."""
    dept = service.get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    service.delete_department(db, dept)
    return {"success": True, "message": "Department deleted successfully."}


# ==============================================================================
# 2. SEMESTERS
# ==============================================================================

@router.get("/semesters", response_model=dict)
async def get_semesters(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List academic semesters."""
    semesters = service.list_semesters(db)
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "name": s.name,
                "academic_year": s.academic_year,
                "start_date": s.start_date.isoformat(),
                "end_date": s.end_date.isoformat(),
                "is_current": s.is_current,
            }
            for s in semesters
        ],
    }


@router.post("/semesters", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_semester(
    payload: SemesterCreate,
    current_user: User = Depends(require_permission("system:config")),
    db: Session = Depends(get_db),
):
    """Create a new academic semester term."""
    semester = service.create_semester(db, payload)
    return {"success": True, "data": {"id": semester.id, "name": semester.name}, "message": "Semester created."}


@router.patch("/semesters/{semester_id}", response_model=dict)
async def update_semester(
    semester_id: str,
    payload: SemesterUpdate,
    current_user: User = Depends(require_permission("system:config")),
    db: Session = Depends(get_db),
):
    """Update semester dates or metadata."""
    semester = service.get_semester(db, semester_id)
    if not semester:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found.")
    updated = service.update_semester(db, semester, payload)
    return {"success": True, "data": {"id": updated.id, "name": updated.name}, "message": "Semester updated."}


@router.delete("/semesters/{semester_id}", response_model=dict)
async def delete_semester(
    semester_id: str,
    current_user: User = Depends(require_permission("system:config")),
    db: Session = Depends(get_db),
):
    """Delete semester."""
    semester = service.get_semester(db, semester_id)
    if not semester:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found.")
    service.delete_semester(db, semester)
    return {"success": True, "message": "Semester deleted."}


# ==============================================================================
# 3. COURSES
# ==============================================================================

def format_course_read(c: Course) -> dict:
    """Format Course ORM entity to read dictionary."""
    instructors_data = [
        {
            "id": ci.id,
            "course_id": ci.course_id,
            "faculty_id": ci.faculty_id,
            "faculty_name": ci.faculty.full_name if ci.faculty else "Unknown",
            "faculty_email": ci.faculty.email if ci.faculty else "",
            "faculty_identifier": ci.faculty.faculty_identifier if ci.faculty else None,
            "is_primary": ci.is_primary,
        }
        for ci in (c.instructors or [])
    ]
    return {
        "id": c.id,
        "course_code": c.course_code,
        "name": c.name,
        "description": c.description,
        "credits": c.credits,
        "department_id": c.department_id,
        "department_name": c.department.name if c.department else None,
        "department_code": c.department.code if c.department else None,
        "semester_id": c.semester_id,
        "semester_name": c.semester.name if c.semester else None,
        "is_active": c.is_active,
        "instructors": instructors_data,
        "module_count": len(c.modules) if c.modules else 0,
        "enrolled_count": len(c.enrollments) if c.enrollments else 0,
    }


@router.get("/courses", response_model=dict)
async def get_courses(
    department_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(150, ge=1, le=500),
    current_user: User = Depends(require_permission("course:view")),
    db: Session = Depends(get_db),
):
    """Retrieve courses filtered by user's role authorization and optional criteria."""
    courses, total_count = service.list_courses(
        db=db,
        user=current_user,
        department_id=department_id,
        semester_id=semester_id,
        search=search,
        active_only=active_only,
        page=page,
        page_size=page_size,
    )
    return {
        "success": True,
        "data": [format_course_read(c) for c in courses],
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
    }


@router.post("/courses", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    current_user: User = Depends(require_permission("course:create")),
    db: Session = Depends(get_db),
):
    """Create a new academic course."""
    course = service.create_course(db, current_user, payload)
    return {"success": True, "data": format_course_read(course), "message": "Course created successfully."}


@router.get("/courses/{course_id}", response_model=dict)
async def get_course_detail(
    course_id: str,
    current_user: User = Depends(require_permission("course:view")),
    db: Session = Depends(get_db),
):
    """Get course details."""
    course = service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    verify_course_access(current_user, course.id, db)
    return {"success": True, "data": format_course_read(course)}


@router.patch("/courses/{course_id}", response_model=dict)
async def update_course(
    course_id: str,
    payload: CourseUpdate,
    current_user: User = Depends(require_permission("course:update")),
    db: Session = Depends(get_db),
):
    """Update course attributes."""
    course = service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    verify_course_access(current_user, course.id, db)
    updated = service.update_course(db, current_user, course, payload)
    return {"success": True, "data": format_course_read(updated), "message": "Course updated."}


@router.delete("/courses/{course_id}", response_model=dict)
async def delete_course(
    course_id: str,
    current_user: User = Depends(require_permission("course:delete")),
    db: Session = Depends(get_db),
):
    """Delete a course."""
    course = service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    service.delete_course(db, course)
    return {"success": True, "message": "Course deleted successfully."}


@router.get("/courses/{course_id}/structure", response_model=dict)
async def get_course_structure(
    course_id: str,
    current_user: User = Depends(require_permission("course:view")),
    db: Session = Depends(get_db),
):
    """Retrieve full hierarchical course structure (Course -> Modules -> Topics)."""
    course = service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    verify_course_access(current_user, course.id, db)

    modules_data = []
    for m in (course.modules or []):
        topics_data = [
            {
                "id": t.id,
                "module_id": t.module_id,
                "title": t.title,
                "description": t.description,
                "display_order": t.display_order,
            }
            for t in (m.topics or [])
        ]
        modules_data.append({
            "id": m.id,
            "course_id": m.course_id,
            "title": m.title,
            "description": m.description,
            "display_order": m.display_order,
            "topics": topics_data,
        })

    return {
        "success": True,
        "data": {
            "course": format_course_read(course),
            "modules": modules_data,
        },
    }


# ==============================================================================
# 4. MODULES & TOPICS
# ==============================================================================

@router.post("/courses/{course_id}/modules", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_module(
    course_id: str,
    payload: CourseModuleCreate,
    current_user: User = Depends(require_permission("module:create")),
    db: Session = Depends(get_db),
):
    """Create a module within a course."""
    verify_course_access(current_user, course_id, db)
    module = service.create_module(db, course_id, payload)
    return {
        "success": True,
        "data": {
            "id": module.id,
            "course_id": module.course_id,
            "title": module.title,
            "description": module.description,
            "display_order": module.display_order,
        },
        "message": "Module created successfully.",
    }


@router.patch("/modules/{module_id}", response_model=dict)
async def update_module(
    module_id: str,
    payload: CourseModuleUpdate,
    current_user: User = Depends(require_permission("module:update")),
    db: Session = Depends(get_db),
):
    """Update a module."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    verify_course_access(current_user, module.course_id, db)
    updated = service.update_module(db, module, payload)
    return {"success": True, "data": {"id": updated.id, "title": updated.title}, "message": "Module updated."}


@router.delete("/modules/{module_id}", response_model=dict)
async def delete_module(
    module_id: str,
    current_user: User = Depends(require_permission("module:delete")),
    db: Session = Depends(get_db),
):
    """Delete a module and its topics."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    verify_course_access(current_user, module.course_id, db)
    service.delete_module(db, module)
    return {"success": True, "message": "Module deleted."}


@router.post("/modules/{module_id}/topics", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_topic(
    module_id: str,
    payload: TopicCreate,
    current_user: User = Depends(require_permission("topic:create")),
    db: Session = Depends(get_db),
):
    """Create a topic under a module."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    verify_course_access(current_user, module.course_id, db)
    topic = service.create_topic(db, module_id, payload)
    return {
        "success": True,
        "data": {
            "id": topic.id,
            "module_id": topic.module_id,
            "title": topic.title,
            "display_order": topic.display_order,
        },
        "message": "Topic created successfully.",
    }


@router.patch("/topics/{topic_id}", response_model=dict)
async def update_topic(
    topic_id: str,
    payload: TopicUpdate,
    current_user: User = Depends(require_permission("topic:update")),
    db: Session = Depends(get_db),
):
    """Update topic title or description."""
    topic = db.query(Topic).join(CourseModule).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    verify_course_access(current_user, topic.module.course_id, db)
    updated = service.update_topic(db, topic, payload)
    return {"success": True, "data": {"id": updated.id, "title": updated.title}, "message": "Topic updated."}


@router.delete("/topics/{topic_id}", response_model=dict)
async def delete_topic(
    topic_id: str,
    current_user: User = Depends(require_permission("topic:delete")),
    db: Session = Depends(get_db),
):
    """Delete a topic."""
    topic = db.query(Topic).join(CourseModule).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    verify_course_access(current_user, topic.module.course_id, db)
    service.delete_topic(db, topic)
    return {"success": True, "message": "Topic deleted."}


# ==============================================================================
# 5. FACULTY COURSE ASSIGNMENT
# ==============================================================================

@router.get("/courses/{course_id}/instructors", response_model=dict)
async def get_course_instructors(
    course_id: str,
    current_user: User = Depends(require_permission("course:view")),
    db: Session = Depends(get_db),
):
    """Get assigned instructors for a course."""
    verify_course_access(current_user, course_id, db)
    instructors = service.get_course_instructors(db, course_id)
    return {
        "success": True,
        "data": [
            {
                "id": ci.id,
                "course_id": ci.course_id,
                "faculty_id": ci.faculty_id,
                "faculty_name": ci.faculty.full_name if ci.faculty else "",
                "faculty_email": ci.faculty.email if ci.faculty else "",
                "faculty_identifier": ci.faculty.faculty_identifier if ci.faculty else None,
                "is_primary": ci.is_primary,
            }
            for ci in instructors
        ],
    }


@router.post("/courses/{course_id}/instructors", response_model=dict, status_code=status.HTTP_201_CREATED)
async def assign_faculty(
    course_id: str,
    payload: CourseInstructorAssign,
    current_user: User = Depends(require_permission("course:update")),
    db: Session = Depends(get_db),
):
    """Assign faculty to course (HOD/Admin authority)."""
    course = service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    user_role = current_user.role.name if current_user.role else ""
    if user_role == "HOD" and str(course.department_id) != str(current_user.department_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only assign faculty in own department.")
    elif user_role not in ["HOD", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HOD or Administrator can assign faculty.")

    assignment = service.assign_faculty_to_course(
        db, course_id=course_id, faculty_id=payload.faculty_id, is_primary=payload.is_primary
    )
    return {"success": True, "data": {"id": assignment.id, "faculty_id": assignment.faculty_id}, "message": "Faculty assigned."}


@router.delete("/courses/{course_id}/instructors/{faculty_id}", response_model=dict)
async def remove_faculty(
    course_id: str,
    faculty_id: str,
    current_user: User = Depends(require_permission("course:update")),
    db: Session = Depends(get_db),
):
    """Remove faculty assignment from course."""
    course = service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    user_role = current_user.role.name if current_user.role else ""
    if user_role == "HOD" and str(course.department_id) != str(current_user.department_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HOD can only remove faculty in own department.")
    elif user_role not in ["HOD", "ADMINISTRATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HOD or Administrator can remove faculty.")

    service.remove_faculty_from_course(db, course_id=course_id, faculty_id=faculty_id)
    return {"success": True, "message": "Faculty assignment removed."}


# ==============================================================================
# 6. ENROLLMENTS
# ==============================================================================

@router.get("/courses/{course_id}/enrollments", response_model=dict)
async def get_course_enrollments(
    course_id: str,
    current_user: User = Depends(require_permission("enrollment:view")),
    db: Session = Depends(get_db),
):
    """Get active student enrollments in a course."""
    verify_course_access(current_user, course_id, db)
    enrollments = service.get_course_enrollments(db, course_id)
    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "student_id": e.student_id,
                "student_name": e.student.full_name if e.student else "",
                "student_email": e.student.email if e.student else "",
                "student_identifier": e.student.student_identifier if e.student else None,
                "course_id": e.course_id,
                "course_code": e.course.course_code if e.course else "",
                "course_name": e.course.name if e.course else "",
                "semester_id": e.semester_id,
                "semester_name": e.semester.name if e.semester else "",
                "status": e.status,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            }
            for e in enrollments
        ],
    }


@router.post("/courses/{course_id}/enroll", response_model=dict, status_code=status.HTTP_201_CREATED)
async def enroll_course(
    course_id: str,
    current_user: User = Depends(require_role("STUDENT")),
    db: Session = Depends(get_db),
):
    """Student self-enrolls into a course (student ID derived from JWT token)."""
    enrollment = service.enroll_student_in_course(db, student_id=current_user.id, course_id=course_id)
    return {
        "success": True,
        "data": {
            "id": enrollment.id,
            "course_id": enrollment.course_id,
            "status": enrollment.status,
        },
        "message": "Successfully enrolled in course.",
    }


@router.delete("/courses/{course_id}/enroll", response_model=dict)
async def drop_course(
    course_id: str,
    current_user: User = Depends(require_role("STUDENT")),
    db: Session = Depends(get_db),
):
    """Student drops active course enrollment."""
    service.drop_student_enrollment(db, student_id=current_user.id, course_id=course_id)
    return {"success": True, "message": "Successfully dropped course enrollment."}


@router.get("/enrollments/my-enrollments", response_model=dict)
async def get_my_enrollments(
    current_user: User = Depends(require_role("STUDENT")),
    db: Session = Depends(get_db),
):
    """Retrieve all course enrollments for the authenticated student."""
    enrollments = service.get_student_enrollments(db, student_id=current_user.id)
    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "course_id": e.course_id,
                "course_code": e.course.course_code if e.course else "",
                "course_name": e.course.name if e.course else "",
                "credits": e.course.credits if e.course else 0,
                "department_code": e.course.department.code if e.course and e.course.department else "",
                "semester_name": e.semester.name if e.semester else "",
                "status": e.status,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            }
            for e in enrollments
        ],
    }


# ==============================================================================
# 7. ACADEMIC CATALOG
# ==============================================================================

@router.get("/catalog", response_model=dict)
async def get_catalog(
    department_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve institutional academic course catalog."""
    catalog = service.get_academic_catalog(
        db=db,
        current_user=current_user,
        department_id=department_id,
        semester_id=semester_id,
        search=search,
    )
    return {"success": True, "data": catalog}


# ==============================================================================
# 8. PUBLIC FACULTY DIRECTORY & CABINS
# ==============================================================================

@router.get("/faculty-directory", response_model=dict)
async def get_faculty_directory(
    department_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve campus faculty directory for students, faculty, and administration."""
    roles = db.query(Role).filter(Role.name.in_(["FACULTY", "HOD"])).all()
    role_ids = [r.id for r in roles]
    query = db.query(User).filter(User.role_id.in_(role_ids), User.is_active == True)
    if department_id:
        query = query.filter(User.department_id == department_id)
    faculty_list = query.order_by(User.first_name.asc()).all()

    default_cabins = [
        "Cabin C-201, Academic Block",
        "Cabin C-204, Academic Block",
        "Faculty Wing A-102, CS Dept",
        "Staff Room 301, Engineering Tower",
        "Cabin C-108, Computing Lab",
    ]

    results = []
    for idx, u in enumerate(faculty_list):
        cabin = getattr(u, "office_number", None) or default_cabins[idx % len(default_cabins)]
        desig = getattr(u, "designation", None) or ("Head of Department" if u.role and u.role.name == "HOD" else "Assistant Professor")
        results.append({
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name or "",
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.name if u.role else "FACULTY",
            "department": u.department.name if u.department else "Computer Science & Engineering",
            "department_id": u.department_id,
            "faculty_identifier": u.faculty_identifier or f"FAC-{1000 + idx}",
            "designation": desig,
            "office_number": cabin,
            "office_hours": getattr(u, "office_hours", None) or "02:00 PM - 04:00 PM (Mon-Fri)",
            "phone": u.phone or "+91 98765 43210",
            "is_active": True,
        })

    return {"success": True, "data": results}


@router.get("/students-directory", response_model=dict)
async def get_students_directory(
    department_id: Optional[str] = None,
    class_name: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve campus student directory for faculty, administration, and staff."""
    student_role = db.query(Role).filter(Role.name == "STUDENT").first()
    if not student_role:
        return {"success": True, "data": []}

    query = db.query(User).filter(User.role_id == student_role.id, User.is_active == True)
    if department_id:
        query = query.filter(User.department_id == department_id)
    if class_name:
        query = query.filter(User.class_name.ilike(f"%{class_name}%"))

    students_list = query.order_by(User.first_name.asc()).all()
    results = []
    for idx, u in enumerate(students_list):
        results.append({
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name or "",
            "full_name": u.full_name,
            "email": u.email,
            "role": "STUDENT",
            "department": u.department.name if u.department else "Computer Science & Engineering",
            "department_id": u.department_id,
            "student_identifier": u.student_identifier or f"STU-{1000 + idx}",
            "class_name": u.class_name or "CSE - Semester 1 (Sec A)",
            "academic_year": u.academic_year or "2024-2028",
            "phone": u.phone or "",
            "is_active": True,
        })

    return {"success": True, "data": results}

