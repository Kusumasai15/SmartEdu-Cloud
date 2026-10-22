# SmartEdu Cloud — Database Architecture & Specifications

## 1. Overview

SmartEdu Cloud uses **PostgreSQL 16** with the **pgvector** extension as the centralized, ACID-compliant relational data store and vector database.

## 2. Model Conventions & Architecture (Phase 02)

### 2.1 Primary Key Strategy
- All tables use a uniform `String(36)` UUIDv4 primary key (`id = Column(String(36), primary_key=True, default=generate_uuid)`).
- Protects against resource enumeration attacks and provides multi-region/distributed ID generation compatibility.

### 2.2 Timestamps Policy
- Every domain table inherits from `TimestampMixin` (`app.models.base`), adding:
  - `created_at`: `DateTime(timezone=True)`, server default `func.now()`.
  - `updated_at`: `DateTime(timezone=True)`, server default `func.now()`, automatically updated on modification.

### 2.3 Foreign Key & Deletion Policies
- **Restricted Deletion (`ondelete="RESTRICT"`)**: Used on high-stakes academic boundaries to protect institutional integrity:
  - `departments.id` -> `courses.department_id`
  - `semesters.id` -> `courses.semester_id`
  - `roles.id` -> `users.role_id`
  - `users.id` (Student) -> `enrollments.student_id`
  - `courses.id` -> `enrollments.course_id`
- **Cascading Deletion (`ondelete="CASCADE"`)**: Used for dependent child hierarchies:
  - `courses.id` -> `course_modules.course_id`
  - `course_modules.id` -> `topics.module_id`
  - `roles.id` -> `role_permissions.role_id`
  - `permissions.id` -> `role_permissions.permission_id`
  - `courses.id` -> `course_instructors.course_id`

---

## 3. Entity Catalog

### 3.1 `roles`
System authorization groups (`ADMINISTRATOR`, `HOD`, `FACULTY`, `STUDENT`).
- `id` (PK String 36)
- `name` (String 50, Unique, Indexed)
- `description` (String 255, Nullable)
- `is_system_role` (Boolean, Default True)
- `created_at`, `updated_at`

### 3.2 `permissions`
Discrete actions on system resources (`user:view`, `course:create`, etc.).
- `id` (PK String 36)
- `name` (String 100, Unique, Indexed)
- `resource` (String 50, Indexed)
- `action` (String 50)
- `description` (String 255, Nullable)
- `created_at`, `updated_at`

### 3.3 `role_permissions`
Many-to-many bridge mapping roles to granular permissions.
- `id` (PK String 36)
- `role_id` (FK `roles.id` ON DELETE CASCADE)
- `permission_id` (FK `permissions.id` ON DELETE CASCADE)
- `created_at`
- **Constraint**: Unique(`role_id`, `permission_id`)

### 3.4 `departments`
Academic departments (e.g. Computer Science, Electronics).
- `id` (PK String 36)
- `name` (String 150, Unique)
- `code` (String 20, Unique, Indexed)
- `description` (Text, Nullable)
- `is_active` (Boolean, Default True)
- `created_at`, `updated_at`

### 3.5 `semesters`
Academic calendar terms (e.g. Fall 2026).
- `id` (PK String 36)
- `name` (String 100)
- `academic_year` (String 20)
- `start_date` (Date)
- `end_date` (Date)
- `is_current` (Boolean, Default False)
- `created_at`, `updated_at`
- **Constraints**: Check(`end_date >= start_date`), Unique(`name`, `academic_year`)

### 3.6 `users`
Institutional user accounts across all 4 roles.
- `id` (PK String 36)
- `email` (String 255, Unique, Indexed, Lowercase Normalized)
- `password_hash` (String 255, PBKDF2-HMAC-SHA256)
- `first_name` (String 100)
- `last_name` (String 100)
- `role_id` (FK `roles.id` ON DELETE RESTRICT, Indexed)
- `department_id` (FK `departments.id` ON DELETE SET NULL, Indexed, Nullable)
- `student_identifier` (String 50, Unique, Indexed, Nullable)
- `faculty_identifier` (String 50, Unique, Indexed, Nullable)
- `is_active` (Boolean, Default True)
- `created_at`, `updated_at`

### 3.7 `courses`
Academic course catalog items.
- `id` (PK String 36)
- `course_code` (String 30, Unique, Indexed)
- `name` (String 200)
- `description` (Text, Nullable)
- `credits` (Integer, Default 3)
- `department_id` (FK `departments.id` ON DELETE RESTRICT, Indexed)
- `semester_id` (FK `semesters.id` ON DELETE RESTRICT, Indexed)
- `is_active` (Boolean, Default True)
- `created_at`, `updated_at`

### 3.8 `course_instructors`
Faculty course assignment mapping supporting co-teaching and primary instructor designations.
- `id` (PK String 36)
- `course_id` (FK `courses.id` ON DELETE CASCADE, Indexed)
- `faculty_id` (FK `users.id` ON DELETE CASCADE, Indexed)
- `is_primary` (Boolean, Default True)
- `created_at`
- **Constraint**: Unique(`course_id`, `faculty_id`)

### 3.9 `course_modules`
Syllabus units within a course.
- `id` (PK String 36)
- `course_id` (FK `courses.id` ON DELETE CASCADE, Indexed)
- `title` (String 200)
- `description` (Text, Nullable)
- `display_order` (Integer, Default 1)
- `created_at`, `updated_at`
- **Constraint**: Unique(`course_id`, `display_order`)

### 3.10 `topics`
Granular lecture concepts within a course module.
- `id` (PK String 36)
- `module_id` (FK `course_modules.id` ON DELETE CASCADE, Indexed)
- `title` (String 200)
- `description` (Text, Nullable)
- `display_order` (Integer, Default 1)
- `created_at`, `updated_at`
- **Constraint**: Unique(`module_id`, `display_order`)

### 3.11 `enrollments`
Student enrollment records binding a student to a course for a semester.
- `id` (PK String 36)
- `student_id` (FK `users.id` ON DELETE RESTRICT, Indexed)
- `course_id` (FK `courses.id` ON DELETE RESTRICT, Indexed)
- `semester_id` (FK `semesters.id` ON DELETE RESTRICT, Indexed)
- `status` (String 20, Default `ACTIVE`, Indexed)
- `enrolled_at` (DateTime(timezone=True))
- `created_at`, `updated_at`
- **Constraints**: Unique(`student_id`, `course_id`, `semester_id`), Check(`status IN ('ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED')`)

---

## 4. Development Seed Dataset

The seed script (`scripts/seed_db.py` / `app/db/seed.py`) populates:
- **4 System Roles**: `ADMINISTRATOR`, `HOD`, `FACULTY`, `STUDENT`.
- **22 Permissions & Mappings**: Fine-grained CRUD controls per role.
- **2 Departments**: Computer Science & Engineering (`CSE`), Electronics & Communication Engineering (`ECE`).
- **1 Active Semester**: `Fall 2026` (`2026-27`).
- **9 Seed Users** (Default dev password: `DevPassword123!`):
  - Admin: `admin@smartedu.local`
  - HOD: `hod.cse@smartedu.local`
  - Faculty (2): `faculty1@smartedu.local` (Ada Lovelace), `faculty2@smartedu.local` (Claude Shannon)
  - Students (5): `student1@smartedu.local` to `student5@smartedu.local`
- **3 Courses**: `CS101` (Intro to CS), `CS201` (Data Structures & Algorithms), `EC101` (Digital Electronics).
- **Course Modules & Topics**: Hierarchical syllabus structures.
- **9 Enrollments**: Active student registrations across courses.
