"""Request regression tests; run with python -m unittest discover -s tests -p test_request_validation.py."""
import importlib
import unittest
from pydantic import ValidationError

BASE_PAYLOADS = {'SchoolCreate': {'name': 'Engineering', 'code': 'ENG'},
 'DepartmentCreate': {'name': 'Computing', 'code': 'CSE'},
 'SemesterCreate': {'name': 'Fall',
                    'academic_year': '2026',
                    'start_date': '2026-01-01',
                    'end_date': '2026-06-01'},
 'TopicCreate': {'title': 'Topic'},
 'CourseModuleCreate': {'title': 'Module'},
 'CourseCreate': {'course_code': 'CS101', 'name': 'Computing'},
 'RegisterRequest': {'first_name': 'Kusuma',
                     'email': 'student@example.edu',
                     'password': ' example password '},
 'NotificationCreate': {'recipient_id': 'user', 'title': 'Notice', 'message': 'Class update'},
 'AnnouncementCreate': {'title': 'Notice', 'content': 'Class update'},
 'DirectMessageCreate': {'body': 'Hello'},
 'ConversationCreate': {'participant_user_id': 'user'},
 'AISummarizeRequest': {'content': 'Announcement'},
 'CalendarEventCreate': {'event_type': 'HOLIDAY',
                         'title': 'Holiday',
                         'start_date': '2026-01-01',
                         'end_date': '2026-01-01'},
 'AcademicRoomCreate': {'building': 'Block A', 'room_number': '101'},
 'StudentLeaveCreate': {'start_date': '2026-01-01',
                        'end_date': '2026-01-01',
                        'reason': 'Medical appointment'},
 'SubstituteFacultyRequest': {'substitute_faculty_id': 'faculty',
                              'assigned_date': '2026-01-01',
                              'reason': 'Faculty leave'}}

INVALID_CASES = [
    ('academic', 'SchoolCreate', 'name') + (' \t\n    \t ',),
    ('academic', 'SchoolCreate', 'code') + (' \t\n    \t ',),
    ('academic', 'SchoolUpdate', 'name') + (' \t\n    \t ',),
    ('academic', 'SchoolUpdate', 'code') + (' \t\n    \t ',),
    ('academic', 'DepartmentCreate', 'name') + (' \t\n    \t ',),
    ('academic', 'DepartmentCreate', 'code') + (' \t\n    \t ',),
    ('academic', 'DepartmentCreate', 'school') + (' \t\n    \t ',),
    ('academic', 'DepartmentUpdate', 'name') + (' \t\n    \t ',),
    ('academic', 'DepartmentUpdate', 'code') + (' \t\n    \t ',),
    ('academic', 'DepartmentUpdate', 'school') + (' \t\n    \t ',),
    ('academic', 'SemesterCreate', 'name') + (' \t\n    \t ',),
    ('academic', 'SemesterCreate', 'academic_year') + (' \t\n    \t ',),
    ('academic', 'SemesterUpdate', 'name') + (' \t\n    \t ',),
    ('academic', 'SemesterUpdate', 'academic_year') + (' \t\n    \t ',),
    ('academic', 'TopicCreate', 'title') + (' \t\n    \t ',),
    ('academic', 'TopicUpdate', 'title') + (' \t\n    \t ',),
    ('academic', 'CourseModuleCreate', 'title') + (' \t\n    \t ',),
    ('academic', 'CourseModuleUpdate', 'title') + (' \t\n    \t ',),
    ('academic', 'CourseCreate', 'course_code') + (' \t\n    \t ',),
    ('academic', 'CourseCreate', 'name') + (' \t\n    \t ',),
    ('academic', 'CourseUpdate', 'course_code') + (' \t\n    \t ',),
    ('academic', 'CourseUpdate', 'name') + (' \t\n    \t ',),
    ('auth', 'RegisterRequest', 'first_name') + (' \t\n    \t ',),
    ('auth', 'UpdateProfileRequest', 'first_name') + (' \t\n    \t ',),
    ('auth', 'UpdateProfileRequest', 'last_name') + ("x" * 101,),
    ('auth', 'UpdateProfileRequest', 'phone') + ("x" * 51,),
    ('auth', 'UpdateProfileRequest', 'bio') + ("x" * 1001,),
    ('auth', 'UpdateProfileRequest', 'avatar_url') + ("x" * 501,),
    ('auth', 'UpdateProfileRequest', 'skills') + ("x" * 4001,),
    ('auth', 'UpdateProfileRequest', 'certifications') + ("x" * 8001,),
    ('auth', 'UpdateProfileRequest', 'achievements') + ("x" * 8001,),
    ('auth', 'UpdateProfileRequest', 'notification_preferences') + ("x" * 2001,),
    ('auth', 'UpdateProfileRequest', 'github_url') + ("x" * 256,),
    ('auth', 'UpdateProfileRequest', 'linkedin_url') + ("x" * 256,),
    ('auth', 'UpdateProfileRequest', 'website_url') + ("x" * 256,),
    ('communication', 'NotificationCreate', 'title') + (' \t\n    \t ',),
    ('communication', 'NotificationCreate', 'message') + (' \t\n    \t ',),
    ('communication', 'NotificationCreate', 'source_type') + ("x" * 51,),
    ('communication', 'NotificationCreate', 'action_url') + ("x" * 256,),
    ('communication', 'NotificationCreate', 'dedup_key') + ("x" * 256,),
    ('communication', 'AnnouncementCreate', 'title') + (' \t\n    \t ',),
    ('communication', 'AnnouncementCreate', 'content') + (' \t\n    \t ',),
    ('communication', 'AnnouncementUpdate', 'title') + (' \t\n    \t ',),
    ('communication', 'AnnouncementUpdate', 'content') + (' \t\n    \t ',),
    ('communication', 'ConversationCreate', 'title') + ("x" * 201,),
    ('communication', 'DirectMessageCreate', 'body') + (' \t\n    \t ',),
    ('communication', 'AISummarizeRequest', 'max_words') + (0,),
    ('scheduling', 'CalendarEventCreate', 'title') + (' \t\n    \t ',),
    ('scheduling', 'AcademicRoomCreate', 'building') + (' \t\n    \t ',),
    ('scheduling', 'AcademicRoomCreate', 'room_number') + (' \t\n    \t ',),
    ('scheduling', 'StudentLeaveCreate', 'reason') + (' \t\n    \t ',),
    ('scheduling', 'SubstituteFacultyRequest', 'reason') + (' \t\n    \t ',),
]

class RequestValidationTests(unittest.TestCase):
    def test_standalone_mcp_rejects_empty_questions_without_network_writes(self):
        from importlib.util import spec_from_file_location, module_from_spec
        from pathlib import Path
        from unittest.mock import patch
        spec = spec_from_file_location("standalone_mcp", Path(__file__).resolve().parents[2] / "smartedu_mcp_server.py")
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
        session = (True, {"token": "test-token", "user": {"role": "FACULTY"}})
        with patch.object(module, "_require_auth", return_value=session), patch.object(module, "api_request") as api:
            for questions in [[], None, {}, "invalid"]:
                with self.subTest(questions=questions):
                    result = module.handle_call_tool("create_quiz", {"course_code": "CS101", "title": "Quiz", "questions": questions})
                    self.assertFalse(result["success"])
                    self.assertIn("at least one valid question", result["error"])
            result = module.handle_call_tool("create_quiz", {"course_code": "CS101", "title": "Quiz"})
            self.assertFalse(result["success"])
            api.assert_not_called()

    def test_valid_create_payloads(self):
        for module, model_name, _, _ in INVALID_CASES:
            with self.subTest(model=model_name):
                model = getattr(importlib.import_module(f"app.{module}.schemas"), model_name)
                model(**BASE_PAYLOADS.get(model_name, {}))

    def test_omitted_and_null_patch_fields(self):
        for module, name in [("academic", "SchoolUpdate"), ("academic", "DepartmentUpdate"),
                             ("academic", "SemesterUpdate"), ("academic", "TopicUpdate"),
                             ("academic", "CourseModuleUpdate"), ("academic", "CourseUpdate"),
                             ("auth", "UpdateProfileRequest"), ("communication", "AnnouncementUpdate")]:
            model = getattr(importlib.import_module(f"app.{module}.schemas"), name)
            self.assertEqual(model().model_dump(exclude_unset=True), {})
            for field in model.model_fields:
                with self.subTest(model=name, field=field):
                    self.assertIsNone(getattr(model(**{field: None}), field))

    def test_password_whitespace_is_preserved(self):
        from app.auth.schemas import RegisterRequest, LoginRequest, ChangePasswordRequest, ResetPasswordRequest
        password = "  my secret password  "
        self.assertEqual(RegisterRequest(**{**BASE_PAYLOADS["RegisterRequest"], "password": password}).password, password)
        self.assertEqual(LoginRequest(email="user@example.edu", password=password).password, password)
        self.assertEqual(ChangePasswordRequest(current_password=password, new_password=password).new_password, password)
        self.assertEqual(ResetPasswordRequest(token="token", new_password=password).new_password, password)

    def test_minimum_length_is_checked_after_trimming(self):
        from app.academic.schemas import SchoolCreate, SemesterCreate
        from app.scheduling.schemas import StudentLeaveCreate
        for model, payload in [(SchoolCreate, {"name": " a ", "code": "CS"}),
                               (SemesterCreate, {**BASE_PAYLOADS["SemesterCreate"], "academic_year": " 26 "}),
                               (StudentLeaveCreate, {**BASE_PAYLOADS["StudentLeaveCreate"], "reason": " a "})]:
            with self.subTest(model=model.__name__), self.assertRaises(ValidationError):
                model(**payload)

    def test_text_normalization(self):
        from app.academic.schemas import SchoolCreate
        from app.communication.schemas import DirectMessageCreate
        self.assertEqual(SchoolCreate(name="  Engineering  ", code=" ENG ").name, "Engineering")
        self.assertEqual(DirectMessageCreate(body="  Hello\nworld  ").body, "Hello\nworld")

    def test_summary_word_budget_bounds(self):
        from app.communication.schemas import AISummarizeRequest
        for value in [-1, 0, 2001]:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                AISummarizeRequest(content="Hello", max_words=value)
        for value in [None, 1, 100, 2000]:
            self.assertEqual(AISummarizeRequest(content="Hello", max_words=value).max_words, value)


def invalid_case_test(module, model_name, field, value):
    def test(self):
        model = getattr(importlib.import_module(f"app.{module}.schemas"), model_name)
        payload = {**BASE_PAYLOADS.get(model_name, {}), field: value}
        with self.assertRaises(ValidationError) as caught:
            model(**payload)
        self.assertTrue(any(error["loc"][0] == field for error in caught.exception.errors()))
    return test


for number, case in enumerate(INVALID_CASES, 1):
    setattr(RequestValidationTests, f"test_regression_{number:02d}_{case[1]}_{case[2]}", invalid_case_test(*case))

if __name__ == "__main__":
    unittest.main()
