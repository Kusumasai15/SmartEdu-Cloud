import uuid
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Department,
    Course,
    CourseInstructor,
    User,
    Role,
    Semester,
    Enrollment,
    EnrollmentStatus,
)

STUDENTS_DATA = [
    ("2411021060012", "CHENNAIAHN ABHINATH"),
    ("2411021060014", "PHANI NANDAN M S"),
    ("2411021060015", "PUNITH KUMAR"),
    ("2411021060019", "ARYAN TIWARI"),
    ("2411021060025", "AYUSH K S"),
    ("2411021060036", "RIDDHIMA JHA"),
    ("2411021060045", "LOGANATHAN G S"),
    ("2411021060068", "NASH FERNANDES"),
    ("2411021060100", "ANANYA A"),
    ("2411021060122", "NALLAM MANJUNATHA"),
    ("2411021060135", "AKKAMPALLI NIKHIL KUMAR REDDY"),
    ("2411021060221", "RON BOBBY"),
    ("2411021060226", "NARAGANI LAKSHMI VENKATA MANOHAR"),
    ("2411021060244", "TEJASHREE V"),
    ("2411021060253", "SADDIKUTI KUSUMA SAI"),
    ("2411021060257", "ANNAGIRI RUTHIKA SAI PRIYA"),
    ("2411021060285", "BASINEPALLI CHARITHA SREE"),
    ("2411021060295", "DAKSHITHA V"),
    ("2411021060312", "GALI LAKSHMI PRASANNA"),
    ("2411021060313", "MOTURU VENKATA SAI KRISHNA"),
    ("2411021060373", "NAVYA S"),
    ("2411021060388", "KHADGA LOHITH K"),
    ("2411021060401", "BUDIDETI VIJAY KUMAR REDDY"),
    ("2411021060402", "MANAV NAGPAL"),
    ("2411021060454", "TUNGA NAGA RUPESH"),
    ("2411021060486", "MAHI KALA"),
    ("2411021060507", "DIKKALA RAHUL"),
    ("2411021060512", "GURIVELLI SOWMYA"),
    ("2411021060519", "VARSHINI L"),
    ("2411021060589", "P RENU MADHURI"),
    ("2411021060617", "DEVARAPALLI PRADEEP REDDY"),
    ("2411021060630", "HANIEL JERRY G"),
    ("2411021060650", "NEELAPAREDDY SUJITH KUMAR REDDY"),
    ("2411021060692", "MANOJ K"),
    ("2411021060723", "MOHAMED AZWAN A"),
    ("2411021060746", "VEDHESHA PARTHIBAN"),
    ("2411021060750", "JASTI AJAY KUMAR"),
    ("2411021060763", "VADDAMANI GANGA PURNA CHANDU REDDY"),
    ("2411021060775", "KAAYSHA RAO"),
    ("2411021060792", "J R ABHISAKE"),
    ("2411021060829", "HARSHITHA M"),
    ("2411021060846", "GADDAM DHEERA DIGVIJAY REDDY"),
    ("2411021060848", "PRATHESH Y"),
    ("2411021060858", "MAVITI RAJESH"),
    ("2411021060861", "P M LOUKYA"),
    ("2411021060879", "BUDHILI DADAPEER"),
    ("2411021060907", "CHAVVA HARSHAVARDHAN REDDY"),
    ("2411021060910", "SUSHMITHA K"),
    ("2411021060934", "SHIVANI BALLANI"),
    ("2411021060939", "GUDDANTI NIKHIL SRINIVAS"),
    ("2411021060940", "PRASANNA P"),
    ("2411021060966", "SHAIK IRSHAD"),
    ("2411021060981", "MUKUND L"),
    ("2411021061135", "JASMIN RAI"),
    ("2411021061142", "SHAKTHI D"),
    ("2411021061225", "PREETHI K"),
    ("PROV/ASAC/BTECH/LE/7/25/007", "THAILEESWARAN M"),
    ("PROV/ASAC/BTECH/LE/7/25/026", "SRIKANTH N"),
]

FACULTY_DATA = [
    {
        "name": "DR.VIRENDRA KUMAR SHRIVASTAVA",
        "first_name": "Virendra Kumar",
        "last_name": "Shrivastava",
        "email": "virendra.shrivastava@smartedu.edu",
        "fid": "FAC-IT-382",
    },
    {
        "name": "DR. M. VIVEK ANAND",
        "first_name": "M. Vivek",
        "last_name": "Anand",
        "email": "m.vivek.anand@smartedu.edu",
        "fid": "FAC-IT-313",
    },
    {
        "name": "DR.SUBRATA PAIN",
        "first_name": "Subrata",
        "last_name": "Pain",
        "email": "subrata.pain@smartedu.edu",
        "fid": "FAC-IT-302",
    },
    {
        "name": "MRS.KUSUMA J",
        "first_name": "Kusuma",
        "last_name": "J",
        "email": "kusuma.j@smartedu.edu",
        "fid": "FAC-IT-303",
    },
    {
        "name": "MANJUNATH S KEDILAYA",
        "first_name": "Manjunath S",
        "last_name": "Kedilaya",
        "email": "manjunath.kedilaya@smartedu.edu",
        "fid": "FAC-IT-309",
    },
    {
        "name": "MS.S THASMIYA",
        "first_name": "S",
        "last_name": "Thasmiya",
        "email": "s.thasmiya@smartedu.edu",
        "fid": "FAC-IT-301",
    },
    {
        "name": "DR.BALAJI S K SWAMINATHAN",
        "first_name": "Balaji S K",
        "last_name": "Swaminathan",
        "email": "balaji.swaminathan@smartedu.edu",
        "fid": "FAC-IT-317",
    },
    {
        "name": "DR.MOUNICA VALLABHANENI",
        "first_name": "Mounica",
        "last_name": "Vallabhaneni",
        "email": "mounica.vallabhaneni@smartedu.edu",
        "fid": "FAC-IT-318",
    },
    {
        "name": "BHAVANI",
        "first_name": "Bhavani",
        "last_name": "M",
        "email": "bhavani@smartedu.edu",
        "fid": "FAC-IT-108",
    },
    {
        "name": "MR. SACHIN KUMAR",
        "first_name": "Sachin",
        "last_name": "Kumar",
        "email": "sachin.kumar@smartedu.edu",
        "fid": "FAC-IT-414",
    },
    {
        "name": "MS.DEEPIKA NAYAK",
        "first_name": "Deepika",
        "last_name": "Nayak",
        "email": "deepika.nayak@smartedu.edu",
        "fid": "FAC-IT-415",
    },
    {
        "name": "MR.JUARIS ESEGEMU EPAH",
        "first_name": "Juaris Esegemu",
        "last_name": "Epah",
        "email": "juaris.epah@smartedu.edu",
        "fid": "FAC-IT-400",
    },
]

COURSES_DATA = [
    {
        "code": "E1CSA 382",
        "name": "Data Mining and Data Warehousing",
        "type": "Theory",
        "credits": 3,
        "instructors": [("virendra.shrivastava@smartedu.edu", True)],
    },
    {
        "code": "E1CSA 313",
        "name": "Design Project-I",
        "type": "Theory",
        "credits": 2,
        "instructors": [("m.vivek.anand@smartedu.edu", True)],
    },
    {
        "code": "E1ITC 302",
        "name": "Graph Analytics",
        "type": "Theory",
        "credits": 3,
        "instructors": [
            ("subrata.pain@smartedu.edu", True),
            ("kusuma.j@smartedu.edu", False),
        ],
    },
    {
        "code": "E1CSK 309",
        "name": "IBM CE-Text Analytics",
        "type": "Theory",
        "credits": 3,
        "instructors": [("manjunath.kedilaya@smartedu.edu", True)],
    },
    {
        "code": "E1ITC 308",
        "name": "Industrial Certification-I",
        "type": "Practical",
        "credits": 2,
        "instructors": [("subrata.pain@smartedu.edu", True)],
    },
    {
        "code": "E1ITC 301",
        "name": "Java Programming",
        "type": "Theory",
        "credits": 4,
        "instructors": [
            ("m.vivek.anand@smartedu.edu", True),
            ("s.thasmiya@smartedu.edu", False),
        ],
    },
    {
        "code": "E1CSA 317",
        "name": "Leadership and Management Skills",
        "type": "Theory",
        "credits": 2,
        "instructors": [
            ("balaji.swaminathan@smartedu.edu", True),
            ("mounica.vallabhaneni@smartedu.edu", False),
        ],
    },
    {
        "code": "E1CSA 108",
        "name": "Soft Skills - II",
        "type": "Practical",
        "credits": 1,
        "instructors": [("bhavani@smartedu.edu", True)],
    },
    {
        "code": "E1CSA 414",
        "name": "Theory and Practice of Modern Cryptography",
        "type": "Theory",
        "credits": 3,
        "instructors": [
            ("sachin.kumar@smartedu.edu", True),
            ("deepika.nayak@smartedu.edu", False),
        ],
    },
    {
        "code": "E1CSA 400",
        "name": "Theory of Computation",
        "type": "Theory",
        "credits": 3,
        "instructors": [("juaris.epah@smartedu.edu", True)],
    },
]

def seed_all():
    db = SessionLocal()
    default_password_hash = hash_password("12345678")
    
    # 1. Fetch IT Department
    it_dept = db.query(Department).filter(Department.code == "IT").first()
    if not it_dept:
        print("ERROR: IT Department not found!")
        return

    # 2. Add / Update Section AI & DS in IT Department Cohorts
    cohort_name = "IT - Semester 5 (Section AI & DS)"
    existing_cohorts = it_dept.cohorts or []
    cohort_found = False
    
    for c in existing_cohorts:
        if c.get("name") == cohort_name:
            c["studentCount"] = len(STUDENTS_DATA)
            c["academicYear"] = "2024-2028"
            c["semester"] = "Semester 5"
            c["section"] = "Section AI & DS"
            c["classAdvisor"] = "DR. VIRENDRA KUMAR SHRIVASTAVA"
            c["classAdvisorEmail"] = "virendra.shrivastava@smartedu.edu"
            c["assignedCourses"] = [cdata["code"] for cdata in COURSES_DATA]
            cohort_found = True
            break
            
    if not cohort_found:
        new_cohort = {
            "id": str(uuid.uuid4()),
            "name": cohort_name,
            "program": "B.Tech Information Technology",
            "semester": "Semester 5",
            "section": "Section AI & DS",
            "academicYear": "2024-2028",
            "classAdvisor": "DR. VIRENDRA KUMAR SHRIVASTAVA",
            "classAdvisorEmail": "virendra.shrivastava@smartedu.edu",
            "studentCapacity": 60,
            "studentCount": len(STUDENTS_DATA),
            "assignedCourses": [cdata["code"] for cdata in COURSES_DATA],
            "status": "ACTIVE"
        }
        existing_cohorts.append(new_cohort)
        
    it_dept.cohorts = existing_cohorts
    flag_modified(it_dept, "cohorts")
    db.commit()
    print(f"Updated IT Department cohorts. Total cohorts now: {len(existing_cohorts)}")

    # 3. Roles and Current Semester
    faculty_role = db.query(Role).filter(Role.name == "FACULTY").first()
    student_role = db.query(Role).filter(Role.name == "STUDENT").first()
    active_semester = db.query(Semester).filter(Semester.is_current == True).first()
    if not active_semester:
        active_semester = db.query(Semester).first()
    print(f"Using Active Semester: {active_semester.name} (id={active_semester.id})")

    # 4. Create / Update Faculty Accounts
    faculty_map = {}
    for f in FACULTY_DATA:
        user = db.query(User).filter(User.email == f["email"]).first()
        if not user:
            user = User(
                email=f["email"],
                password_hash=default_password_hash,
                first_name=f["first_name"],
                last_name=f["last_name"],
                role_id=faculty_role.id,
                department_id=it_dept.id,
                faculty_identifier=f["fid"],
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created faculty: {user.full_name} ({user.email})")
        else:
            user.password_hash = default_password_hash
            user.department_id = it_dept.id
            user.faculty_identifier = f["fid"]
            user.is_active = True
            db.commit()
            print(f"Updated faculty: {user.full_name} ({user.email})")
        faculty_map[f["email"]] = user

    # 5. Create / Update Courses and assign Instructors
    created_courses = []
    for cdata in COURSES_DATA:
        course = db.query(Course).filter(Course.course_code == cdata["code"]).first()
        if not course:
            course = Course(
                course_code=cdata["code"],
                name=cdata["name"],
                credits=cdata["credits"],
                description=f"{cdata['name']} ({cdata['type']}) for Section AI & DS (5th Sem 2024-2028)",
                department_id=it_dept.id,
                semester_id=active_semester.id,
                is_active=True,
            )
            db.add(course)
            db.commit()
            db.refresh(course)
            print(f"Created course: {course.course_code} - {course.name}")
        else:
            course.name = cdata["name"]
            course.credits = cdata["credits"]
            course.department_id = it_dept.id
            course.semester_id = active_semester.id
            course.is_active = True
            db.commit()
            print(f"Updated course: {course.course_code} - {course.name}")

        # Clean existing instructors for this course to avoid duplicates
        db.query(CourseInstructor).filter(CourseInstructor.course_id == course.id).delete()
        db.commit()

        # Assign instructors
        for email, is_primary in cdata["instructors"]:
            fac_user = faculty_map.get(email)
            if fac_user:
                ci = CourseInstructor(
                    course_id=course.id,
                    faculty_id=fac_user.id,
                    is_primary=is_primary,
                )
                db.add(ci)
        db.commit()
        created_courses.append(course)

    # 6. Create / Update 58 Students and enroll them in all 10 courses
    created_students = []
    for reg_no, full_name in STUDENTS_DATA:
        clean_reg = reg_no.lower().replace("/", "_")
        email = f"{clean_reg}@smartedu.edu"
        
        name_parts = full_name.split()
        if len(name_parts) == 1:
            first_name = name_parts[0].capitalize()
            last_name = "Student"
        elif len(name_parts) == 2:
            first_name = name_parts[0].capitalize()
            last_name = name_parts[1].capitalize()
        else:
            first_name = name_parts[0].capitalize()
            last_name = " ".join(p.capitalize() for p in name_parts[1:])

        student = (
            db.query(User)
            .filter((User.student_identifier == reg_no) | (User.email == email))
            .first()
        )
        if not student:
            student = User(
                email=email,
                password_hash=default_password_hash,
                first_name=first_name,
                last_name=last_name,
                role_id=student_role.id,
                department_id=it_dept.id,
                student_identifier=reg_no,
                class_name=cohort_name,
                academic_year="2024-2028",
                is_active=True,
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        else:
            student.password_hash = default_password_hash
            student.first_name = first_name
            student.last_name = last_name
            student.student_identifier = reg_no
            student.class_name = cohort_name
            student.academic_year = "2024-2028"
            student.department_id = it_dept.id
            student.is_active = True
            db.commit()

        created_students.append(student)

        # Enroll student in all 10 courses
        for course in created_courses:
            existing_enrollment = (
                db.query(Enrollment)
                .filter(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == course.id,
                    Enrollment.semester_id == active_semester.id,
                )
                .first()
            )
            if not existing_enrollment:
                enrollment = Enrollment(
                    student_id=student.id,
                    course_id=course.id,
                    semester_id=active_semester.id,
                    status=EnrollmentStatus.ACTIVE.value,
                )
                db.add(enrollment)
        db.commit()

    print(f"Successfully processed {len(created_students)} students into {cohort_name} and enrolled in all 10 courses!")
    db.close()

if __name__ == "__main__":
    seed_all()
