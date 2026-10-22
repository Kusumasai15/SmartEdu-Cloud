"""Academic Management Application Service Layer."""
import logging
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import flag_modified

from app.academic.schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    SchoolCreate,
    SchoolUpdate,
    SemesterCreate,
    SemesterUpdate,
    CourseCreate,
    CourseUpdate,
    CourseModuleCreate,
    CourseModuleUpdate,
    TopicCreate,
    TopicUpdate,
)
from app.models import (
    Department,
    School,
    Semester,
    Course,
    CourseModule,
    Topic,
    CourseInstructor,
    Enrollment,
    EnrollmentStatus,
    User,
    Role,
)

logger = logging.getLogger("smartedu.academic")


def list_schools(db: Session, active_only: bool = False) -> List[School]:
    query = db.query(School)
    if active_only:
        query = query.filter(School.is_active.is_(True))
    return query.order_by(School.name.asc()).all()


def get_school(db: Session, school_id: str) -> Optional[School]:
    return db.query(School).filter(School.id == school_id).first()


def create_school(db: Session, data: SchoolCreate) -> School:
    name = data.name.strip()
    code = data.code.strip().upper()
    if db.query(School).filter(or_(School.name == name, School.code == code)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A school with this name or code already exists.")
    school = School(name=name, code=code, dean=data.dean.strip() if data.dean else None,
                    description=data.description, is_active=data.is_active)
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


def update_school(db: Session, school: School, data: SchoolUpdate) -> School:
    previous_name = school.name
    if data.name is not None:
        school.name = data.name.strip()
    if data.code is not None:
        school.code = data.code.strip().upper()
    if data.dean is not None:
        school.dean = data.dean.strip() or None
    if data.description is not None:
        school.description = data.description
    if data.is_active is not None:
        school.is_active = data.is_active
    duplicate = db.query(School).filter(or_(School.name == school.name, School.code == school.code), School.id != school.id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A school with this name or code already exists.")
    if school.name != previous_name:
        db.query(Department).filter(Department.school == previous_name).update({Department.school: school.name})
    db.commit()
    db.refresh(school)
    return school


def delete_school(db: Session, school: School) -> None:
    department_count = db.query(Department).filter(Department.school == school.name).count()
    if department_count:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Move or delete the {department_count} departments in this school first.")
    db.delete(school)
    db.commit()


# ==============================================================================
# 1. DEPARTMENT SERVICES
# ==============================================================================

def list_departments(db: Session, active_only: bool = False) -> List[Department]:
    """Retrieve all academic departments with course count annotations."""
    query = db.query(Department)
    if active_only:
        query = query.filter(Department.is_active.is_(True))
    return query.order_by(Department.code.asc()).all()


def get_department(db: Session, dept_id: str) -> Optional[Department]:
    """Retrieve department by UUID."""
    return db.query(Department).filter(Department.id == dept_id).first()


def _sync_hod_user(db: Session, dept: Department, hod_name: str) -> None:
    """Link the HOD user account to the department if matching by name or email."""
    if not hod_name:
        return
    norm_name = hod_name.strip()
    user = (
        db.query(User)
        .filter(
            or_(
                func.concat(User.first_name, " ", User.last_name) == norm_name,
                User.first_name == norm_name,
                User.email == norm_name.lower(),
            )
        )
        .first()
    )
    if user:
        user.department_id = dept.id
        db.flush()


def create_department(db: Session, data: DepartmentCreate) -> Department:
    """Create a new academic department with unique code, name, and HOD assignment."""
    code_norm = data.code.strip().upper()
    existing = db.query(Department).filter(
        or_(Department.code == code_norm, Department.name == data.name.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department with code '{code_norm}' or name '{data.name}' already exists.",
        )

    if not data.school:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Select an existing school.")
    school_name = data.school.strip()
    if not db.query(School).filter(School.name == school_name, School.is_active.is_(True)).first():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The selected school does not exist or is inactive.")

    hod_name = (data.head_of_department or data.dean or "").strip() or None
    dept = Department(
        name=data.name.strip(),
        code=code_norm,
        school=school_name,
        head_of_department=hod_name,
        description=data.description,
        cohorts=data.cohorts or [],
        is_active=data.is_active,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    if hod_name:
        _sync_hod_user(db, dept, hod_name)
        db.commit()
    return dept


def update_department(db: Session, dept: Department, data: DepartmentUpdate) -> Department:
    """Update department details and appointed HOD."""
    if data.name is not None:
        dept.name = data.name.strip()
    if data.code is not None:
        code_norm = data.code.strip().upper()
        existing = db.query(Department).filter(
            Department.code == code_norm, Department.id != dept.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department with code '{code_norm}' already exists.",
            )
        dept.code = code_norm
    if data.school is not None:
        school_name = data.school.strip()
        if not db.query(School).filter(School.name == school_name, School.is_active.is_(True)).first():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The selected school does not exist or is inactive.")
        dept.school = school_name
    if data.description is not None:
        dept.description = data.description
    if data.cohorts is not None:
        dept.cohorts = data.cohorts
        flag_modified(dept, "cohorts")
    if data.is_active is not None:
        dept.is_active = data.is_active

    hod_val = data.head_of_department if data.head_of_department is not None else data.dean
    if hod_val is not None:
        dept.head_of_department = hod_val.strip() or None
        if dept.head_of_department:
            _sync_hod_user(db, dept, dept.head_of_department)

    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, dept: Department) -> bool:
    """Safely delete department or reject if dependent courses or users exist."""
    course_count = db.query(Course).filter(Course.department_id == dept.id).count()
    if course_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete department '{dept.code}': {course_count} courses are associated with it.",
        )
    db.delete(dept)
    db.commit()
    return True


# ==============================================================================
# 2. SEMESTER SERVICES
# ==============================================================================

def list_semesters(db: Session) -> List[Semester]:
    """Retrieve all academic terms ordered by academic year and start date."""
    return db.query(Semester).order_by(Semester.start_date.desc()).all()


def get_semester(db: Session, semester_id: str) -> Optional[Semester]:
    """Retrieve semester by UUID."""
    return db.query(Semester).filter(Semester.id == semester_id).first()


def create_semester(db: Session, data: SemesterCreate) -> Semester:
    """Create a semester with date order and uniqueness validation."""
    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Semester end_date must be on or after start_date.",
        )

    existing = db.query(Semester).filter(
        Semester.name == data.name.strip(),
        Semester.academic_year == data.academic_year.strip(),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Semester '{data.name}' for academic year '{data.academic_year}' already exists.",
        )

    # If marked as is_current, unset previous current semesters
    if data.is_current:
        db.query(Semester).filter(Semester.is_current.is_(True)).update({"is_current": False})

    semester = Semester(
        name=data.name.strip(),
        academic_year=data.academic_year.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        is_current=data.is_current,
    )
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


def update_semester(db: Session, semester: Semester, data: SemesterUpdate) -> Semester:
    """Update semester metadata and dates."""
    start = data.start_date if data.start_date is not None else semester.start_date
    end = data.end_date if data.end_date is not None else semester.end_date
    if end < start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Semester end_date must be on or after start_date.",
        )

    if data.name is not None:
        semester.name = data.name.strip()
    if data.academic_year is not None:
        semester.academic_year = data.academic_year.strip()
    if data.start_date is not None:
        semester.start_date = data.start_date
    if data.end_date is not None:
        semester.end_date = data.end_date
    if data.is_current is not None:
        if data.is_current:
            db.query(Semester).filter(Semester.id != semester.id, Semester.is_current.is_(True)).update({"is_current": False})
        semester.is_current = data.is_current

    db.commit()
    db.refresh(semester)
    return semester


def delete_semester(db: Session, semester: Semester) -> bool:
    """Delete semester if no courses are bound to it."""
    course_count = db.query(Course).filter(Course.semester_id == semester.id).count()
    if course_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete semester '{semester.name}': {course_count} courses reference this term.",
        )
    db.delete(semester)
    db.commit()
    return True


# ==============================================================================
# 3. COURSE SERVICES
# ==============================================================================

def list_courses(
    db: Session,
    user: User,
    department_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Course], int]:
    """Retrieve courses filtered by user's role authorization scope and optional query filters."""
    query = (
        db.query(Course)
        .options(
            joinedload(Course.department),
            joinedload(Course.semester),
            selectinload(Course.instructors).joinedload(CourseInstructor.faculty),
            selectinload(Course.modules),
            selectinload(Course.enrollments),
        )
    )

    user_role = user.role.name if user.role else ""

    # Scope filtering:
    if user_role == "HOD":
        # HOD sees only their department's courses
        query = query.filter(Course.department_id == user.department_id)
    elif user_role == "FACULTY":
        # Faculty sees courses where they are assigned as instructor; falls back to department courses or active courses
        has_instructor_record = db.query(CourseInstructor).filter(CourseInstructor.faculty_id == user.id).first() is not None
        if has_instructor_record:
            query = query.join(CourseInstructor, CourseInstructor.course_id == Course.id).filter(
                CourseInstructor.faculty_id == user.id
            )
        elif user.department_id:
            query = query.filter(Course.department_id == user.department_id)
        else:
            query = query.filter(Course.is_active.is_(True))
    elif user_role == "STUDENT":
        # Student sees active courses or enrolled courses
        if active_only:
            query = query.filter(Course.is_active.is_(True))

    # User-supplied filters:
    if department_id:
        # If user is HOD, verify department_id matches own department
        if user_role == "HOD" and str(department_id) != str(user.department_id):
            return [], 0
        query = query.filter(Course.department_id == department_id)

    if semester_id:
        query = query.filter(Course.semester_id == semester_id)

    if active_only and user_role != "STUDENT":
        query = query.filter(Course.is_active.is_(True))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Course.course_code.ilike(term),
                Course.name.ilike(term),
                Course.description.ilike(term),
            )
        )

    total_count = query.distinct().count()
    courses = (
        query.order_by(Course.course_code.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return courses, total_count


def get_course(db: Session, course_id: str) -> Optional[Course]:
    """Load course by UUID with eager relationships."""
    return (
        db.query(Course)
        .options(
            joinedload(Course.department),
            joinedload(Course.semester),
            selectinload(Course.instructors).joinedload(CourseInstructor.faculty),
            selectinload(Course.modules).selectinload(CourseModule.topics),
            selectinload(Course.enrollments),
        )
        .filter(Course.id == course_id)
        .first()
    )


def create_course(db: Session, user: User, data: CourseCreate) -> Course:
    """Create a course with uniqueness and department-scoping checks."""
    user_role = user.role.name if user.role else ""

    code_norm = data.course_code.strip().upper()
    existing = db.query(Course).filter(Course.course_code == code_norm).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Course with code '{code_norm}' already exists in catalog.",
        )

    # 1. Resolve Department
    dept = None
    if data.department_id:
        dept = db.query(Department).filter(
            or_(
                Department.id == data.department_id,
                Department.code == data.department_id.upper(),
                Department.name.ilike(data.department_id),
            )
        ).first()
    if not dept and user.department_id:
        dept = db.query(Department).filter(Department.id == user.department_id).first()
    if not dept:
        dept = db.query(Department).first()
    if not dept:
        dept = Department(
            name="Computer Science & Engineering",
            code="CSE",
            description="Computer Science & Engineering Department",
            is_active=True,
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)

    # HOD department scope check
    if user_role == "HOD":
        if user.department_id and str(dept.id) != str(user.department_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HOD can only create courses within their own department.",
            )

    # 2. Resolve Semester / Master Course Bucket
    semester = None
    if data.semester_id:
        semester = db.query(Semester).filter(
            or_(
                Semester.id == data.semester_id,
                Semester.name.ilike(data.semester_id),
            )
        ).first()
    if not semester:
        semester = db.query(Semester).filter(Semester.is_current.is_(True)).first()
    if not semester:
        semester = db.query(Semester).first()
    if not semester:
        semester = Semester(
            name="Master Course Catalog",
            academic_year="2024-2028",
            start_date=date(2024, 1, 1),
            end_date=date(2028, 12, 31),
            is_current=True,
        )
        db.add(semester)
        db.commit()
        db.refresh(semester)

    course = Course(
        course_code=code_norm,
        name=data.name.strip(),
        description=data.description,
        credits=data.credits,
        department_id=dept.id,
        semester_id=semester.id,
        is_active=data.is_active,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(db: Session, user: User, course: Course, data: CourseUpdate) -> Course:
    """Update course attributes."""
    user_role = user.role.name if user.role else ""

    if user_role == "HOD" and str(course.department_id) != str(user.department_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HOD can only update courses in their own department.",
        )

    if data.course_code is not None:
        code_norm = data.course_code.strip().upper()
        existing = db.query(Course).filter(
            Course.course_code == code_norm, Course.id != course.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Course with code '{code_norm}' already exists.",
            )
        course.course_code = code_norm

    if data.name is not None:
        course.name = data.name.strip()
    if data.description is not None:
        course.description = data.description
    if data.credits is not None:
        course.credits = data.credits
    if data.semester_id is not None:
        course.semester_id = data.semester_id
    if data.is_active is not None:
        course.is_active = data.is_active

    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course: Course) -> bool:
    """Delete a course if no student enrollments exist."""
    enrollment_count = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
    if enrollment_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete course '{course.course_code}': {enrollment_count} student enrollments exist.",
        )
    db.delete(course)
    db.commit()
    return True


# ==============================================================================
# 4. MODULE & TOPIC SERVICES (Course Structure Tree)
# ==============================================================================

def create_module(db: Session, course_id: str, data: CourseModuleCreate) -> CourseModule:
    """Add a module to a course with auto-order resolution."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    # Resolve display order collision
    order = data.display_order
    existing_mod = db.query(CourseModule).filter(
        CourseModule.course_id == course_id, CourseModule.display_order == order
    ).first()
    if existing_mod:
        max_order = db.query(func.max(CourseModule.display_order)).filter(
            CourseModule.course_id == course_id
        ).scalar() or 0
        order = max_order + 1

    module = CourseModule(
        course_id=course_id,
        title=data.title.strip(),
        description=data.description,
        display_order=order,
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


def update_module(db: Session, module: CourseModule, data: CourseModuleUpdate) -> CourseModule:
    """Update module title, description, or display order."""
    if data.title is not None:
        module.title = data.title.strip()
    if data.description is not None:
        module.description = data.description
    if data.display_order is not None:
        module.display_order = data.display_order

    db.commit()
    db.refresh(module)
    return module


def delete_module(db: Session, module: CourseModule) -> bool:
    """Delete a course module (cascades to topics)."""
    db.delete(module)
    db.commit()
    return True


def create_topic(db: Session, module_id: str, data: TopicCreate) -> Topic:
    """Add a topic to a module."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    order = data.display_order
    existing_topic = db.query(Topic).filter(
        Topic.module_id == module_id, Topic.display_order == order
    ).first()
    if existing_topic:
        max_order = db.query(func.max(Topic.display_order)).filter(
            Topic.module_id == module_id
        ).scalar() or 0
        order = max_order + 1

    topic = Topic(
        module_id=module_id,
        title=data.title.strip(),
        description=data.description,
        display_order=order,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def update_topic(db: Session, topic: Topic, data: TopicUpdate) -> Topic:
    """Update topic title or description."""
    if data.title is not None:
        topic.title = data.title.strip()
    if data.description is not None:
        topic.description = data.description
    if data.display_order is not None:
        topic.display_order = data.display_order

    db.commit()
    db.refresh(topic)
    return topic


def delete_topic(db: Session, topic: Topic) -> bool:
    """Delete a topic."""
    db.delete(topic)
    db.commit()
    return True


# ==============================================================================
# 5. FACULTY ASSIGNMENT SERVICES
# ==============================================================================

def assign_faculty_to_course(
    db: Session,
    course_id: str,
    faculty_id: str,
    is_primary: bool = True,
) -> CourseInstructor:
    """Assign a faculty user to a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    faculty = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == faculty_id)
        .first()
    )
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty user not found.")

    if not faculty.role or faculty.role.name not in ["FACULTY", "HOD"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"User '{faculty.email}' does not hold FACULTY or HOD role.",
        )

    if not faculty.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign inactive faculty member.",
        )

    existing = db.query(CourseInstructor).filter(
        CourseInstructor.course_id == course_id,
        CourseInstructor.faculty_id == faculty_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Faculty '{faculty.full_name}' is already assigned to this course.",
        )

    assignment = CourseInstructor(
        course_id=course_id,
        faculty_id=faculty_id,
        is_primary=is_primary,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def remove_faculty_from_course(db: Session, course_id: str, faculty_id: str) -> bool:
    """Remove faculty assignment from course."""
    assignment = db.query(CourseInstructor).filter(
        CourseInstructor.course_id == course_id,
        CourseInstructor.faculty_id == faculty_id,
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty assignment record not found.",
        )

    db.delete(assignment)
    db.commit()
    return True


# ==============================================================================
# 6. ENROLLMENT SERVICES
# ==============================================================================

def enroll_student_in_course(db: Session, student_id: str, course_id: str) -> Enrollment:
    """Enroll an authenticated student into an active course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if not course.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot enroll in an inactive or closed course.",
        )

    student = db.query(User).filter(User.id == student_id).first()
    if not student or not student.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student account is inactive or not found.")

    # Duplicate check
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.course_id == course_id,
        Enrollment.semester_id == course.semester_id,
    ).first()
    if existing:
        if existing.status == EnrollmentStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You are already actively enrolled in course '{course.course_code}'.",
            )
        else:
            # Re-activate previously dropped enrollment
            existing.status = EnrollmentStatus.ACTIVE.value
            db.commit()
            db.refresh(existing)
            return existing

    enrollment = Enrollment(
        student_id=student_id,
        course_id=course_id,
        semester_id=course.semester_id,
        status=EnrollmentStatus.ACTIVE.value,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def drop_student_enrollment(db: Session, student_id: str, course_id: str) -> bool:
    """Drop student course enrollment."""
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.course_id == course_id,
        Enrollment.status == EnrollmentStatus.ACTIVE.value,
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active enrollment not found for this course.",
        )

    enrollment.status = EnrollmentStatus.DROPPED.value
    db.commit()
    return True


def get_course_enrollments(db: Session, course_id: str) -> List[Enrollment]:
    """Retrieve all student enrollments for a course."""
    return (
        db.query(Enrollment)
        .options(
            joinedload(Enrollment.student),
            joinedload(Enrollment.course),
            joinedload(Enrollment.semester),
        )
        .filter(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ACTIVE.value,
        )
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )


def get_student_enrollments(db: Session, student_id: str) -> List[Enrollment]:
    """Retrieve all enrollments for a specific student."""
    return (
        db.query(Enrollment)
        .options(
            joinedload(Enrollment.student),
            joinedload(Enrollment.course).joinedload(Course.department),
            joinedload(Enrollment.semester),
        )
        .filter(Enrollment.student_id == student_id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )


# ==============================================================================
# 7. ACADEMIC CATALOG SERVICE
# ==============================================================================

def get_academic_catalog(
    db: Session,
    current_user: Optional[User] = None,
    department_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    search: Optional[str] = None,
) -> List[dict]:
    """Retrieve course catalog annotated with instructor names and student enrollment status."""
    query = (
        db.query(Course)
        .options(
            joinedload(Course.department),
            joinedload(Course.semester),
            selectinload(Course.instructors).joinedload(CourseInstructor.faculty),
        )
        .filter(Course.is_active.is_(True))
    )

    if department_id:
        query = query.filter(Course.department_id == department_id)
    if semester_id:
        query = query.filter(Course.semester_id == semester_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Course.course_code.ilike(term),
                Course.name.ilike(term),
                Course.description.ilike(term),
            )
        )

    courses = query.order_by(Course.course_code.asc()).all()

    enrolled_course_ids = set()
    if current_user and current_user.role and current_user.role.name == "STUDENT":
        active_enrollments = db.query(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE.value,
        ).all()
        enrolled_course_ids = {e[0] for e in active_enrollments}

    catalog_entries = []
    for c in courses:
        instructor_names = [ci.faculty.full_name for ci in c.instructors if ci.faculty]
        catalog_entries.append({
            "id": c.id,
            "course_code": c.course_code,
            "name": c.name,
            "description": c.description,
            "credits": c.credits,
            "department_id": c.department_id,
            "department_code": c.department.code if c.department else "",
            "department_name": c.department.name if c.department else "",
            "semester_id": c.semester_id,
            "semester_name": c.semester.name if c.semester else "",
            "instructors": instructor_names,
            "is_enrolled": c.id in enrolled_course_ids,
            "is_active": c.is_active,
        })
    return catalog_entries
