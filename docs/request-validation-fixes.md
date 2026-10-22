# Request validation fixes

54 fixes: 52 field-specific input-validation defects plus two quiz publication defects. These are not 54 unrelated features or commits.

| # | Request model | Field | Corrected behavior |
|---|---|---|---|
| 1 | `academic.SchoolCreate` | `name` | Trim before length validation and reject blank/too-short text. |
| 2 | `academic.SchoolCreate` | `code` | Trim before length validation and reject blank/too-short text. |
| 3 | `academic.SchoolUpdate` | `name` | Trim before length validation and reject blank/too-short text. |
| 4 | `academic.SchoolUpdate` | `code` | Trim before length validation and reject blank/too-short text. |
| 5 | `academic.DepartmentCreate` | `name` | Trim before length validation and reject blank/too-short text. |
| 6 | `academic.DepartmentCreate` | `code` | Trim before length validation and reject blank/too-short text. |
| 7 | `academic.DepartmentCreate` | `school` | Trim before length validation and reject blank/too-short text. |
| 8 | `academic.DepartmentUpdate` | `name` | Trim before length validation and reject blank/too-short text. |
| 9 | `academic.DepartmentUpdate` | `code` | Trim before length validation and reject blank/too-short text. |
| 10 | `academic.DepartmentUpdate` | `school` | Trim before length validation and reject blank/too-short text. |
| 11 | `academic.SemesterCreate` | `name` | Trim before length validation and reject blank/too-short text. |
| 12 | `academic.SemesterCreate` | `academic_year` | Trim before length validation and reject blank/too-short text. |
| 13 | `academic.SemesterUpdate` | `name` | Trim before length validation and reject blank/too-short text. |
| 14 | `academic.SemesterUpdate` | `academic_year` | Trim before length validation and reject blank/too-short text. |
| 15 | `academic.TopicCreate` | `title` | Trim before length validation and reject blank/too-short text. |
| 16 | `academic.TopicUpdate` | `title` | Trim before length validation and reject blank/too-short text. |
| 17 | `academic.CourseModuleCreate` | `title` | Trim before length validation and reject blank/too-short text. |
| 18 | `academic.CourseModuleUpdate` | `title` | Trim before length validation and reject blank/too-short text. |
| 19 | `academic.CourseCreate` | `course_code` | Trim before length validation and reject blank/too-short text. |
| 20 | `academic.CourseCreate` | `name` | Trim before length validation and reject blank/too-short text. |
| 21 | `academic.CourseUpdate` | `course_code` | Trim before length validation and reject blank/too-short text. |
| 22 | `academic.CourseUpdate` | `name` | Trim before length validation and reject blank/too-short text. |
| 23 | `auth.RegisterRequest` | `first_name` | Trim before length validation and reject blank/too-short text. |
| 24 | `auth.UpdateProfileRequest` | `first_name` | Trim before length validation and reject blank/too-short text. |
| 25 | `auth.UpdateProfileRequest` | `last_name` | Reject values longer than the database column limit (100). |
| 26 | `auth.UpdateProfileRequest` | `phone` | Reject values longer than the database column limit (50). |
| 27 | `auth.UpdateProfileRequest` | `bio` | Reject values longer than the database column limit (1000). |
| 28 | `auth.UpdateProfileRequest` | `avatar_url` | Reject values longer than the database column limit (500). |
| 29 | `auth.UpdateProfileRequest` | `skills` | Reject values longer than the database column limit (4000). |
| 30 | `auth.UpdateProfileRequest` | `certifications` | Reject values longer than the database column limit (8000). |
| 31 | `auth.UpdateProfileRequest` | `achievements` | Reject values longer than the database column limit (8000). |
| 32 | `auth.UpdateProfileRequest` | `notification_preferences` | Reject values longer than the database column limit (2000). |
| 33 | `auth.UpdateProfileRequest` | `github_url` | Reject values longer than the database column limit (255). |
| 34 | `auth.UpdateProfileRequest` | `linkedin_url` | Reject values longer than the database column limit (255). |
| 35 | `auth.UpdateProfileRequest` | `website_url` | Reject values longer than the database column limit (255). |
| 36 | `communication.NotificationCreate` | `title` | Trim before length validation and reject blank/too-short text. |
| 37 | `communication.NotificationCreate` | `message` | Trim before length validation and reject blank/too-short text. |
| 38 | `communication.NotificationCreate` | `source_type` | Reject values longer than the database column limit (50). |
| 39 | `communication.NotificationCreate` | `action_url` | Reject values longer than the database column limit (255). |
| 40 | `communication.NotificationCreate` | `dedup_key` | Reject values longer than the database column limit (255). |
| 41 | `communication.AnnouncementCreate` | `title` | Trim before length validation and reject blank/too-short text. |
| 42 | `communication.AnnouncementCreate` | `content` | Trim before length validation and reject blank/too-short text. |
| 43 | `communication.AnnouncementUpdate` | `title` | Trim before length validation and reject blank/too-short text. |
| 44 | `communication.AnnouncementUpdate` | `content` | Trim before length validation and reject blank/too-short text. |
| 45 | `communication.ConversationCreate` | `title` | Reject values longer than the database column limit (200). |
| 46 | `communication.DirectMessageCreate` | `body` | Trim before length validation and reject blank/too-short text. |
| 47 | `communication.AISummarizeRequest` | `max_words` | Reject word budgets outside 1–2000; preserve None and the default. |
| 48 | `scheduling.CalendarEventCreate` | `title` | Trim before length validation and reject blank/too-short text. |
| 49 | `scheduling.AcademicRoomCreate` | `building` | Trim before length validation and reject blank/too-short text. |
| 50 | `scheduling.AcademicRoomCreate` | `room_number` | Trim before length validation and reject blank/too-short text. |
| 51 | `scheduling.StudentLeaveCreate` | `reason` | Trim before length validation and reject blank/too-short text. |
| 52 | `scheduling.SubstituteFacultyRequest` | `reason` | Trim before length validation and reject blank/too-short text. |

| 53 | Backend MCP `create_quiz` | `questions` | Reject missing, non-list, or empty questions instead of publishing a fabricated assessment. |
| 54 | Standalone MCP `create_quiz` | `questions` | Reject missing, non-list, or empty questions instead of inserting a sample question. |

## Compatibility

Only input schemas changed. Passwords and tokens are not normalized. Optional patch fields still accept omission and null. Empty last names remain supported. Existing response models and database schemas are unchanged. Clients submitting whitespace-only required text or overlong profile fields now receive validation errors.

## Validation

Run from `backend`: `PYTHONPATH=. python -m unittest discover -s tests -p test_request_validation.py`.
The suite includes 52 independent invalid-input regressions and compatibility checks for valid payloads, partial updates, text normalization, password preservation, and numeric bounds.

Verification completed: `PYTHONPATH=. DEBUG=false python -m pytest tests -q --disable-warnings --maxfail=3` from `backend`: **200 passed, 4 warnings**. Python compilation and `git diff --check` also passed. The 52 invalid-input regression tests fail against the original commit and pass after these changes. The existing backend empty-quiz integration test is now passing. Standalone MCP rejection is tested with network calls mocked. No live deployment or browser end-to-end test was performed.
